from app.engine.generators.es_generator import ElasticsearchDSLGenerator
from app.engine.generators.models import (
    CompilationResult,
    CompiledElasticsearchQuery,
    CompiledMongoQuery,
    CompiledSQLQuery,
    CrossDatabaseJoinStep,
    CrossDatabasePlan,
    DialectType,
    JoinStrategyType,
)
from app.engine.generators.mongo_generator import MongoPipelineGenerator
from app.engine.generators.sql_generator import PostgresSQLGenerator
from app.engine.ir.models import (
    ColumnRef,
    FilterPredicate,
    LogicalQueryPlan,
    SourceNode,
)
from app.models.connection import DatabaseType


class MultiDialectCompiler:
    """Compiles a LogicalQueryPlan into target database queries or a cross-database execution plan."""

    def __init__(self) -> None:
        self.sql_generator = PostgresSQLGenerator()
        self.mongo_generator = MongoPipelineGenerator()
        self.es_generator = ElasticsearchDSLGenerator()

    def compile(
        self,
        plan: LogicalQueryPlan,
        connection_types: dict[str, DatabaseType],
    ) -> CompilationResult:
        """Compile a logical plan given connection ID to database type mapping."""
        # 1. Inspect involved connections
        involved_connection_ids = {s.connection_id for s in plan.sources}
        for j in plan.joins:
            involved_connection_ids.add(j.right_source.connection_id)

        is_cross_db = len(involved_connection_ids) > 1 or any(
            j.is_cross_database for j in plan.joins
        )

        primary_source = plan.sources[0]
        primary_db_type = connection_types.get(
            primary_source.connection_id, DatabaseType.POSTGRESQL
        )

        # 2. Single-source / Homogeneous execution
        if not is_cross_db:
            if primary_db_type == DatabaseType.POSTGRESQL:
                sql_q = self.sql_generator.generate(plan)
                return CompilationResult(
                    workspace_id=plan.workspace_id,
                    is_cross_database=False,
                    single_query=sql_q,
                    dialect=DialectType.POSTGRES,
                    summary=f"PostgreSQL SELECT query targeting {sql_q.target_table}.",
                )
            elif primary_db_type == DatabaseType.MONGODB:
                mongo_q = self.mongo_generator.generate(plan)
                return CompilationResult(
                    workspace_id=plan.workspace_id,
                    is_cross_database=False,
                    single_query=mongo_q,
                    dialect=DialectType.MONGODB,
                    summary=f"MongoDB aggregation pipeline ({len(mongo_q.pipeline)} stages) on collection {mongo_q.collection}.",
                )
            elif primary_db_type == DatabaseType.ELASTICSEARCH:
                es_q = self.es_generator.generate(plan)
                return CompilationResult(
                    workspace_id=plan.workspace_id,
                    is_cross_database=False,
                    single_query=es_q,
                    dialect=DialectType.ELASTICSEARCH,
                    summary=f"Elasticsearch Query DSL payload targeting index {es_q.index}.",
                )

        # 3. Cross-database execution plan
        sub_queries: list[CompiledSQLQuery | CompiledMongoQuery | CompiledElasticsearchQuery] = []
        all_sources: list[SourceNode] = [plan.sources[0]] + [j.right_source for j in plan.joins]

        # Extract join keys to ensure they are projected in sub-queries
        join_keys_by_table: dict[str, set[str]] = {}
        join_steps: list[CrossDatabaseJoinStep] = []

        for join in plan.joins:
            for cond in join.conditions:
                join_keys_by_table.setdefault(cond.left_field.table, set()).add(
                    cond.left_field.column
                )
                join_keys_by_table.setdefault(cond.right_field.table, set()).add(
                    cond.right_field.column
                )

                join_steps.append(
                    CrossDatabaseJoinStep(
                        left_source_id=f"{cond.left_field.table}",
                        right_source_id=f"{cond.right_field.table}",
                        left_key=cond.left_field.column,
                        right_key=cond.right_field.column,
                        strategy=JoinStrategyType.HASH_JOIN,
                    )
                )

        # Decompose sub-plan for each source
        for src in all_sources:
            src_db_type = connection_types.get(src.connection_id, DatabaseType.POSTGRESQL)
            src_name = src.source_name
            src_alias = src.effective_alias

            # Find projections belonging to this source
            src_projections = [
                p for p in plan.projections if p.table in (src_name, src_alias) or not p.table
            ]

            # Ensure join keys for this source are projected
            existing_cols = {p.column for p in src_projections}
            for required_key in join_keys_by_table.get(src_name, set()) | join_keys_by_table.get(
                src_alias, set()
            ):
                if required_key not in existing_cols:
                    src_projections.append(ColumnRef(table=src_alias, column=required_key))

            # Filter pushdown for this source
            src_filters: list[FilterPredicate] = [
                f
                for f in plan.filters
                if f.field.table in (src_name, src_alias) or not f.field.table
            ]

            sub_plan = LogicalQueryPlan(
                workspace_id=plan.workspace_id,
                sources=[src],
                projections=src_projections,
                filters=src_filters,
                limit=plan.limit,
                offset=0,
            )

            if src_db_type == DatabaseType.POSTGRESQL:
                sub_queries.append(self.sql_generator.generate(sub_plan))
            elif src_db_type == DatabaseType.MONGODB:
                sub_queries.append(self.mongo_generator.generate(sub_plan))
            elif src_db_type == DatabaseType.ELASTICSEARCH:
                sub_queries.append(self.es_generator.generate(sub_plan))

        cross_plan = CrossDatabasePlan(
            is_cross_database=True,
            sub_queries=sub_queries,
            join_steps=join_steps,
            limit=plan.limit,
            offset=plan.offset,
        )

        return CompilationResult(
            workspace_id=plan.workspace_id,
            is_cross_database=True,
            cross_database_plan=cross_plan,
            summary=f"Federated cross-database execution plan joining {len(sub_queries)} heterogeneous data sources via in-memory hash join.",
        )
