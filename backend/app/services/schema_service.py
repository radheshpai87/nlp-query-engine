from fastapi import Depends, HTTPException, status

from app.adapters.factory import create_adapter
from app.core.logging import setup_logging
from app.models.base import utc_now
from app.models.schema import (
    GraphEdge,
    GraphNode,
    RelationshipProvenance,
    SchemaGraphResponse,
    SchemaGraphStatistics,
    SchemaSearchResult,
    SchemaSnapshot,
    UserDefinedRelationship,
    UserDefinedRelationshipCreate,
    compute_schema_fingerprint,
)
from app.repositories.connection_repository import (
    ConnectionRepository,
    get_connection_repository,
)
from app.repositories.relationship_repository import (
    RelationshipRepository,
    get_relationship_repository,
)
from app.repositories.schema_repository import (
    SchemaRepository,
    get_schema_repository,
)
from app.services.audit_service import AuditService, get_audit_service

logger = setup_logging()


class SchemaService:
    def __init__(
        self,
        schema_repo: SchemaRepository,
        connection_repo: ConnectionRepository,
        relationship_repo: RelationshipRepository,
        audit_service: AuditService,
    ) -> None:
        self.schema_repo = schema_repo
        self.connection_repo = connection_repo
        self.relationship_repo = relationship_repo
        self.audit_service = audit_service

    def refresh_schema(
        self,
        workspace_id: str,
        connection_id: str,
        user_id: str | None = None,
    ) -> SchemaSnapshot:
        """Introspect target database and persist new snapshot if schema has changed."""
        connection = self.connection_repo.get_by_id(connection_id)
        if not connection or connection.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Database connection not found in this workspace",
            )

        adapter = create_adapter(connection)
        try:
            discovered = adapter.discover_schema(workspace_id=workspace_id)
        except Exception as e:
            logger.error(
                "Schema introspection failed for connection %s: %s",
                connection_id,
                e,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Target database introspection failed: {str(e)}",
            ) from e
        finally:
            adapter.close()

        # Compute deterministic fingerprint
        fingerprint = compute_schema_fingerprint(discovered.objects)
        discovered.fingerprint = fingerprint

        latest = self.schema_repo.get_latest_for_connection(workspace_id, connection_id)
        if latest is None or latest.fingerprint != fingerprint:
            saved = self.schema_repo.create(discovered)
            logger.info(
                "Created new schema snapshot for connection %s (fingerprint: %s, objects: %d)",
                connection_id,
                fingerprint[:8],
                len(discovered.objects),
            )
        else:
            saved = latest
            logger.info(
                "Schema unchanged for connection %s (fingerprint: %s)",
                connection_id,
                fingerprint[:8],
            )

        # Update last_schema_refresh_at timestamp on connection
        self.connection_repo.update(
            connection_id,
            {"last_schema_refresh_at": utc_now()},
        )

        self.audit_service.log_event(
            workspace_id=workspace_id,
            action="schema.refresh",
            resource_type="connection",
            resource_id=connection_id,
            user_id=user_id,
            details={
                "connection_name": connection.name,
                "db_type": str(connection.db_type),
                "fingerprint": fingerprint,
                "total_objects": len(discovered.objects),
                "is_new_snapshot": latest is None or latest.fingerprint != fingerprint,
            },
        )
        return saved

    def get_latest_snapshot(self, workspace_id: str, connection_id: str) -> SchemaSnapshot | None:
        """Get the latest discovered schema snapshot for a connection."""
        connection = self.connection_repo.get_by_id(connection_id)
        if not connection or connection.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Database connection not found in this workspace",
            )
        return self.schema_repo.get_latest_for_connection(workspace_id, connection_id)

    def list_workspace_schemas(self, workspace_id: str) -> list[SchemaSnapshot]:
        """List the latest schema snapshot for all connected databases in the workspace."""
        return self.schema_repo.get_all_latest_for_workspace(workspace_id)

    def search_schema_objects(self, workspace_id: str, query: str) -> list[SchemaSearchResult]:
        """Search across tables, collections, indices, and fields in all workspace snapshots."""
        clean_q = query.strip().lower()
        if not clean_q:
            return []

        snapshots = self.schema_repo.get_all_latest_for_workspace(workspace_id)
        connections = {
            conn.id: conn.name for conn in self.connection_repo.get_by_workspace(workspace_id)
        }

        results: list[SchemaSearchResult] = []
        for snap in snapshots:
            conn_name = connections.get(snap.connection_id, "Unknown Connection")
            for obj in snap.objects:
                # Match object name
                if clean_q in obj.name.lower():
                    results.append(
                        SchemaSearchResult(
                            connection_id=snap.connection_id,
                            connection_name=conn_name,
                            object_name=obj.name,
                            object_type=obj.object_type,
                            match_type="object",
                            snippet=f"{obj.object_type.capitalize()} '{obj.name}' with {len(obj.fields)} fields",
                        )
                    )

                # Match field names
                for f in obj.fields:
                    if clean_q in f.name.lower():
                        results.append(
                            SchemaSearchResult(
                                connection_id=snap.connection_id,
                                connection_name=conn_name,
                                object_name=obj.name,
                                object_type=obj.object_type,
                                field_name=f.name,
                                data_type=f.data_type,
                                match_type="field",
                                snippet=f"Field '{f.name}' ({f.data_type}) in {obj.object_type} '{obj.name}'",
                            )
                        )

        return results

    # -------------------------------------------------------------
    # User-Defined Relationships
    # -------------------------------------------------------------

    def create_user_defined_relationship(
        self,
        workspace_id: str,
        data: UserDefinedRelationshipCreate,
        user_id: str | None = None,
    ) -> UserDefinedRelationship:
        """Create a user-defined cross-table or cross-database relationship."""
        # Validate source connection
        src_conn = self.connection_repo.get_by_id(data.source_connection_id)
        if not src_conn or src_conn.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Source connection {data.source_connection_id} not found in this workspace",
            )

        # Validate target connection
        tgt_conn = self.connection_repo.get_by_id(data.target_connection_id)
        if not tgt_conn or tgt_conn.workspace_id != workspace_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target connection {data.target_connection_id} not found in this workspace",
            )

        rel = UserDefinedRelationship(
            workspace_id=workspace_id,
            name=data.name or f"{data.source_table} -> {data.target_table}",
            source_connection_id=data.source_connection_id,
            source_table=data.source_table,
            source_fields=data.source_fields,
            target_connection_id=data.target_connection_id,
            target_table=data.target_table,
            target_fields=data.target_fields,
            provenance=RelationshipProvenance.USER_DEFINED,
            cardinality=data.cardinality,
            confidence=1.0,
            description=data.description,
            created_by=user_id,
        )
        saved = self.relationship_repo.create(rel)

        self.audit_service.log_event(
            workspace_id=workspace_id,
            action="relationship.create",
            resource_type="relationship",
            resource_id=saved.id,
            user_id=user_id,
            details={
                "name": saved.name,
                "source": f"{data.source_connection_id}::{data.source_table}",
                "target": f"{data.target_connection_id}::{data.target_table}",
                "is_cross_database": data.source_connection_id != data.target_connection_id,
            },
        )
        return saved

    def list_user_defined_relationships(self, workspace_id: str) -> list[UserDefinedRelationship]:
        """List all user-defined relationships for a workspace."""
        return self.relationship_repo.get_by_workspace(workspace_id)

    def delete_user_defined_relationship(
        self, workspace_id: str, relationship_id: str, user_id: str | None = None
    ) -> bool:
        """Delete a user-defined relationship."""
        rel = self.relationship_repo.get_by_id_and_workspace(workspace_id, relationship_id)
        if not rel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User-defined relationship not found",
            )

        deleted = self.relationship_repo.delete_by_id_and_workspace(workspace_id, relationship_id)
        if deleted:
            self.audit_service.log_event(
                workspace_id=workspace_id,
                action="relationship.delete",
                resource_type="relationship",
                resource_id=relationship_id,
                user_id=user_id,
                details={"name": rel.name},
            )
        return deleted

    # -------------------------------------------------------------
    # Schema Graph Assembly
    # -------------------------------------------------------------

    def get_schema_graph(self, workspace_id: str) -> SchemaGraphResponse:
        """Assemble a unified graph of nodes and edges across heterogeneous databases."""
        snapshots = self.schema_repo.get_all_latest_for_workspace(workspace_id)
        connections = {
            conn.id: conn for conn in self.connection_repo.get_by_workspace(workspace_id)
        }
        user_rels = self.relationship_repo.get_by_workspace(workspace_id)

        nodes: list[GraphNode] = []
        edges: list[GraphEdge] = []
        node_ids: set[str] = set()

        stats = SchemaGraphStatistics()

        for snap in snapshots:
            conn = connections.get(snap.connection_id)
            conn_name = conn.name if conn else snap.connection_id
            db_type = str(conn.db_type) if conn else "unknown"

            for obj in snap.objects:
                node_id = f"{snap.connection_id}::{obj.name}"
                node_ids.add(node_id)
                nodes.append(
                    GraphNode(
                        id=node_id,
                        name=obj.name,
                        connection_id=snap.connection_id,
                        connection_name=conn_name,
                        database_type=db_type,
                        schema_name=obj.schema_name,
                        object_type=obj.object_type,
                        fields=obj.fields,
                        row_count_estimate=obj.row_count_estimate,
                    )
                )

                # Add discovered relationships
                for rel in obj.relationships:
                    src_node_id = f"{snap.connection_id}::{rel.source_table}"
                    tgt_node_id = f"{snap.connection_id}::{rel.target_table}"
                    src_f = rel.source_fields[0] if rel.source_fields else ""
                    tgt_f = rel.target_fields[0] if rel.target_fields else ""

                    edge_id = f"disc::{src_node_id}::{src_f}::{tgt_node_id}::{tgt_f}"
                    edges.append(
                        GraphEdge(
                            id=edge_id,
                            source_node_id=src_node_id,
                            source_field=src_f,
                            target_node_id=tgt_node_id,
                            target_field=tgt_f,
                            provenance=rel.provenance,
                            cardinality=rel.cardinality,
                            confidence=rel.confidence,
                            is_cross_database=False,
                        )
                    )
                    if rel.provenance == RelationshipProvenance.FOREIGN_KEY:
                        stats.foreign_keys_count += 1
                    elif rel.provenance == RelationshipProvenance.INFERRED:
                        stats.inferred_count += 1

        # Add user-defined relationships
        for u_rel in user_rels:
            src_node = f"{u_rel.source_connection_id}::{u_rel.source_table}"
            tgt_node = f"{u_rel.target_connection_id}::{u_rel.target_table}"
            src_f = u_rel.source_fields[0] if u_rel.source_fields else ""
            tgt_f = u_rel.target_fields[0] if u_rel.target_fields else ""
            is_cross = u_rel.source_connection_id != u_rel.target_connection_id

            edges.append(
                GraphEdge(
                    id=f"user::{u_rel.id}",
                    source_node_id=src_node,
                    source_field=src_f,
                    target_node_id=tgt_node,
                    target_field=tgt_f,
                    provenance=RelationshipProvenance.USER_DEFINED,
                    cardinality=u_rel.cardinality,
                    confidence=u_rel.confidence,
                    is_cross_database=is_cross,
                    description=u_rel.description,
                )
            )
            stats.user_defined_count += 1
            if is_cross:
                stats.cross_database_count += 1

        stats.total_nodes = len(nodes)
        stats.total_edges = len(edges)

        return SchemaGraphResponse(
            workspace_id=workspace_id,
            nodes=nodes,
            edges=edges,
            statistics=stats,
        )


def get_schema_service(
    schema_repo: SchemaRepository = Depends(get_schema_repository),
    connection_repo: ConnectionRepository = Depends(get_connection_repository),
    relationship_repo: RelationshipRepository = Depends(get_relationship_repository),
    audit_service: AuditService = Depends(get_audit_service),
) -> SchemaService:
    return SchemaService(
        schema_repo=schema_repo,
        connection_repo=connection_repo,
        relationship_repo=relationship_repo,
        audit_service=audit_service,
    )
