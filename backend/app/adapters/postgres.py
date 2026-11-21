import re
import time
from datetime import date, datetime
from datetime import time as dt_time
from decimal import Decimal
from typing import Any
from uuid import UUID

import psycopg
from psycopg.rows import dict_row

from app.adapters.base import BaseDatabaseAdapter, ConnectionTestResult
from app.core.exceptions import AppError
from app.core.logging import setup_logging
from app.core.security import redact_connection_string
from app.models.schema import (
    Cardinality,
    RelationshipProvenance,
    SchemaField,
    SchemaObject,
    SchemaRelationship,
    SchemaSnapshot,
    compute_schema_fingerprint,
)

logger = setup_logging()


class PostgresAdapter(BaseDatabaseAdapter):
    """PostgreSQL adapter using psycopg v3."""

    def __init__(
        self,
        connection_id: str,
        name: str,
        host: str | None = None,
        port: int | None = None,
        database: str | None = None,
        user: str | None = None,
        password: str | None = None,
        uri: str | None = None,
        options: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(connection_id, name)
        self.host = host or "localhost"
        self.port = port or 5432
        self.database = database or "postgres"
        self.user = user or "postgres"
        self.password = password or ""
        self.uri = uri
        self.options = options or {}
        self._connection: psycopg.Connection | None = None

    def _get_connection_string(self, host_override: str | None = None) -> str:
        if self.uri:
            return self.uri
        target_host = host_override or self.host
        return (
            f"host={target_host} port={self.port} dbname={self.database} "
            f"user={self.user} password={self.password} connect_timeout=5"
        )

    def _connect(self, timeout: int = 5, autocommit: bool = False) -> psycopg.Connection:
        if self.uri:
            return psycopg.connect(self.uri, connect_timeout=timeout, autocommit=autocommit)

        candidate_hosts = [self.host]
        if self.host in ("localhost", "127.0.0.1"):
            candidate_hosts.append("postgres-target")

        last_err: Exception | None = None
        for h in candidate_hosts:
            conn_str = (
                f"host={h} port={self.port} dbname={self.database} "
                f"user={self.user} password={self.password} connect_timeout={timeout}"
            )
            try:
                conn = psycopg.connect(conn_str, connect_timeout=timeout, autocommit=autocommit)
                self.host = h
                return conn
            except Exception as e:
                last_err = e
        if last_err:
            raise last_err
        raise RuntimeError("Failed to connect to PostgreSQL")

    def test_connection(self) -> ConnectionTestResult:
        start_time = time.perf_counter()
        try:
            with self._connect(timeout=5) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT version();")
                    row = cur.fetchone()
                    version = str(row[0]) if row else "PostgreSQL"
            duration = (time.perf_counter() - start_time) * 1000
            return ConnectionTestResult(
                success=True,
                latency_ms=round(duration, 2),
                server_version=version,
                database_name=self.database,
            )
        except Exception as e:
            duration = (time.perf_counter() - start_time) * 1000
            sanitized_err = redact_connection_string(str(e))
            logger.warning("PostgreSQL connection test failed: %s", sanitized_err)
            return ConnectionTestResult(
                success=False,
                latency_ms=round(duration, 2),
                database_name=self.database,
                error_message=sanitized_err,
            )

    def get_metadata(self) -> dict[str, Any]:
        return {
            "adapter": "postgresql",
            "host": self.host,
            "port": self.port,
            "database": self.database,
            "read_only_enforced": True,
        }

    def discover_schema(self, workspace_id: str) -> SchemaSnapshot:
        """Introspect tables, columns, constraints, foreign keys, and row estimates."""
        try:
            with self._connect(timeout=10) as conn:
                with conn.cursor() as cur:
                    cur.execute("SET TRANSACTION READ ONLY;")

                    # 1. Fetch tables and views
                    cur.execute(
                        """
                        SELECT table_schema, table_name, table_type
                        FROM information_schema.tables
                        WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
                        ORDER BY table_schema, table_name;
                        """
                    )
                    raw_tables = cur.fetchall()

                    # 2. Fetch columns
                    cur.execute(
                        """
                        SELECT
                            table_schema,
                            table_name,
                            column_name,
                            data_type,
                            is_nullable
                        FROM information_schema.columns
                        WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
                        ORDER BY table_schema, table_name, ordinal_position;
                        """
                    )
                    raw_columns = cur.fetchall()

                    # 3. Fetch primary keys
                    cur.execute(
                        """
                        SELECT
                            tc.table_schema,
                            tc.table_name,
                            kcu.column_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                          ON tc.constraint_name = kcu.constraint_name
                          AND tc.table_schema = kcu.table_schema
                        WHERE tc.constraint_type = 'PRIMARY KEY'
                          AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast');
                        """
                    )
                    raw_pks = cur.fetchall()

                    # 4. Fetch foreign keys
                    cur.execute(
                        """
                        SELECT
                            tc.table_schema AS source_schema,
                            tc.table_name AS source_table,
                            kcu.column_name AS source_column,
                            ccu.table_schema AS target_schema,
                            ccu.table_name AS target_table,
                            ccu.column_name AS target_column
                        FROM information_schema.table_constraints AS tc
                        JOIN information_schema.key_column_usage AS kcu
                          ON tc.constraint_name = kcu.constraint_name
                          AND tc.table_schema = kcu.table_schema
                        JOIN information_schema.constraint_column_usage AS ccu
                          ON ccu.constraint_name = tc.constraint_name
                          AND ccu.table_schema = tc.table_schema
                        WHERE tc.constraint_type = 'FOREIGN KEY'
                          AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast');
                        """
                    )
                    raw_fks = cur.fetchall()

                    # 5. Fetch row count estimates
                    cur.execute(
                        """
                        SELECT
                            n.nspname AS schema_name,
                            c.relname AS table_name,
                            GREATEST(0, c.reltuples::bigint) AS row_estimate
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relkind IN ('r', 'p', 'v', 'm')
                          AND n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast');
                        """
                    )
                    raw_estimates = cur.fetchall()

            # Process Primary Keys: set of (schema, table, column)
            pk_set: set[tuple[str, str, str]] = {(str(r[0]), str(r[1]), str(r[2])) for r in raw_pks}

            # Process Foreign Keys
            fk_col_set: set[tuple[str, str, str]] = set()
            relationships_by_table: dict[tuple[str, str], list[SchemaRelationship]] = {}

            for r in raw_fks:
                src_sch, src_tbl, src_col, _tgt_sch, tgt_tbl, tgt_col = (
                    str(r[0]),
                    str(r[1]),
                    str(r[2]),
                    str(r[3]),
                    str(r[4]),
                    str(r[5]),
                )
                fk_col_set.add((src_sch, src_tbl, src_col))
                rel = SchemaRelationship(
                    source_table=src_tbl,
                    source_fields=[src_col],
                    target_table=tgt_tbl,
                    target_fields=[tgt_col],
                    provenance=RelationshipProvenance.FOREIGN_KEY,
                    cardinality=Cardinality.MANY_TO_ONE,
                    confidence=1.0,
                )
                relationships_by_table.setdefault((src_sch, src_tbl), []).append(rel)

            # Process Row Estimates
            estimates_map: dict[tuple[str, str], int] = {
                (str(r[0]), str(r[1])): int(r[2]) for r in raw_estimates
            }

            # Group Columns by Table
            columns_by_table: dict[tuple[str, str], list[SchemaField]] = {}
            for col in raw_columns:
                sch, tbl, col_name, dtype, is_null = (
                    str(col[0]),
                    str(col[1]),
                    str(col[2]),
                    str(col[3]),
                    str(col[4]),
                )
                is_pk = (sch, tbl, col_name) in pk_set
                is_fk = (sch, tbl, col_name) in fk_col_set
                is_nullable = is_null.upper() == "YES"

                field = SchemaField(
                    name=col_name,
                    data_type=dtype,
                    is_primary_key=is_pk,
                    is_foreign_key=is_fk,
                    is_nullable=is_nullable,
                )
                columns_by_table.setdefault((sch, tbl), []).append(field)

            # Construct SchemaObjects
            objects: list[SchemaObject] = []
            for t in raw_tables:
                sch, tbl, t_type = str(t[0]), str(t[1]), str(t[2])
                obj_type = "view" if "VIEW" in t_type.upper() else "table"
                tbl_fields = columns_by_table.get((sch, tbl), [])
                tbl_rels = relationships_by_table.get((sch, tbl), [])
                row_est = estimates_map.get((sch, tbl))

                schema_obj = SchemaObject(
                    connection_id=self.connection_id,
                    name=tbl,
                    schema_name=sch,
                    object_type=obj_type,
                    fields=tbl_fields,
                    relationships=tbl_rels,
                    row_count_estimate=row_est,
                )
                objects.append(schema_obj)

            fingerprint = compute_schema_fingerprint(objects)
            return SchemaSnapshot(
                workspace_id=workspace_id,
                connection_id=self.connection_id,
                fingerprint=fingerprint,
                objects=objects,
                total_objects=len(objects),
            )
        except Exception as e:
            sanitized_err = redact_connection_string(str(e))
            logger.error("PostgreSQL schema discovery failed: %s", sanitized_err)
            raise RuntimeError(f"PostgreSQL schema discovery error: {sanitized_err}") from e

    def execute_query(
        self,
        query: Any,
        parameters: dict[str, Any] | None = None,
        limit: int = 1000,
        timeout_seconds: float = 30.0,
    ) -> list[dict[str, Any]]:
        """Safely execute a compiled read-only PostgreSQL query and return normalized dict rows."""
        # 1. Extract SQL string and parameter mappings
        if hasattr(query, "parameterized_sql") and query.parameterized_sql:
            sql_text = query.parameterized_sql
            query_params = getattr(query, "parameters", {})
            combined_params = {**query_params, **(parameters or {})}
        elif hasattr(query, "sql") and query.sql:
            sql_text = query.sql
            combined_params = parameters or {}
        else:
            sql_text = str(query)
            combined_params = parameters or {}

        # 2. Strict read-only safety validation
        clean_sql = re.sub(r"--.*?\n|/\*.*?\*/", "", sql_text)  # Strip comments
        match = re.search(
            r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|EXECUTE|VACUUM)\b",
            clean_sql,
            re.IGNORECASE,
        )
        if match:
            raise AppError(
                f"Disallowed mutating SQL keyword '{match.group(1).upper()}' detected. "
                "Only read-only SELECT queries are permitted."
            )

        if not clean_sql.strip().upper().startswith(("SELECT", "WITH", "EXPLAIN")):
            raise AppError("Only read-only SELECT or WITH statements can be executed.")

        # 3. Execute query with row factory and timeout
        conn_str = self._get_connection_string()
        timeout_ms = max(int(timeout_seconds * 1000), 1000)

        def normalize_val(val: Any) -> Any:
            if val is None:
                return None
            if isinstance(val, (datetime, date, dt_time)):
                return val.isoformat()
            if isinstance(val, UUID):
                return str(val)
            if isinstance(val, Decimal):
                return float(val) if (val % 1 != 0) else int(val)
            if isinstance(val, (bytes, memoryview)):
                return bytes(val).hex()
            if isinstance(val, list):
                return [normalize_val(item) for item in val]
            if isinstance(val, dict):
                return {k: normalize_val(v) for k, v in val.items()}
            return val

        try:
            with self._connect(
                timeout=min(int(timeout_seconds), 10),
                autocommit=True,
            ) as conn:
                with conn.cursor(row_factory=dict_row) as cur:
                    # Enforce session/transaction level read-only and statement timeout
                    cur.execute(f"SET statement_timeout = '{timeout_ms}ms';")

                    # Convert :param to psycopg %(param)s placeholder format
                    exec_sql = sql_text
                    if combined_params:
                        for p_name in combined_params.keys():
                            exec_sql = re.sub(rf":{re.escape(p_name)}\b", f"%({p_name})s", exec_sql)

                    cur.execute(exec_sql, combined_params if combined_params else None)
                    raw_rows = cur.fetchmany(limit)

            normalized_rows: list[dict[str, Any]] = []
            for r in raw_rows:
                normalized_rows.append({k: normalize_val(v) for k, v in r.items()})

            return normalized_rows
        except Exception as e:
            sanitized_err = redact_connection_string(str(e))
            logger.error("PostgreSQL query execution failed: %s", sanitized_err)
            raise RuntimeError(f"PostgreSQL execution error: {sanitized_err}") from e

    def close(self) -> None:
        if self._connection and not self._connection.closed:
            try:
                self._connection.close()
            except Exception:
                pass
            self._connection = None
