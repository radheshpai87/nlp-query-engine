from app.models.connection import DatabaseConnection
from app.models.schema import SchemaSnapshot, UserDefinedRelationship


def format_schema_context_for_llm(
    snapshots: list[SchemaSnapshot] | dict[str, SchemaSnapshot] | None = None,
    connections: list[DatabaseConnection] | dict[str, DatabaseConnection] | None = None,
    relationships: list[UserDefinedRelationship] | None = None,
) -> str:
    """Format workspace connection schemas and cross-database relationships into a compact LLM prompt context."""
    # Normalize snapshots to list
    snap_list: list[SchemaSnapshot] = []
    if isinstance(snapshots, dict):
        snap_list = list(snapshots.values())
    elif isinstance(snapshots, list):
        snap_list = snapshots

    if not snap_list:
        return "No database connections or discovered schemas currently attached to workspace."

    # Normalize connections to map
    conn_map: dict[str, DatabaseConnection] = {}
    if isinstance(connections, dict):
        conn_map = connections
    elif isinstance(connections, list):
        conn_map = {c.id: c for c in connections}

    lines: list[str] = ["### Discovered Database Schemas:"]

    for snapshot in snap_list:
        conn = conn_map.get(snapshot.connection_id)
        conn_name = conn.name if conn else snapshot.connection_id
        db_type = conn.db_type.value if conn else "database"

        lines.append(
            f"\n#### Connection: {conn_name} ({db_type.upper()}) [ID: {snapshot.connection_id}]"
        )
        for obj in snapshot.objects:
            field_signatures: list[str] = []
            for f in obj.fields[:25]:  # Cap fields to keep context clean
                tags: list[str] = []
                if f.is_primary_key:
                    tags.append("PRIMARY KEY")
                if f.is_foreign_key:
                    tags.append("FOREIGN KEY")
                tag_str = f" [{', '.join(tags)}]" if tags else ""
                field_signatures.append(f"{f.name} ({f.data_type}{tag_str})")

            fields_str = ", ".join(field_signatures)
            lines.append(f"- {obj.object_type.capitalize()} `{obj.name}`: {fields_str}")

    if relationships:
        lines.append("\n### Verified Cross-Database Relationships:")
        for rel in relationships:
            src_fld = rel.source_fields[0] if rel.source_fields else "id"
            tgt_fld = rel.target_fields[0] if rel.target_fields else "id"
            lines.append(
                f"- Link `{rel.source_table}.{src_fld}` -> `{rel.target_table}.{tgt_fld}` "
                f"({rel.cardinality.value})"
            )

    return "\n".join(lines)
