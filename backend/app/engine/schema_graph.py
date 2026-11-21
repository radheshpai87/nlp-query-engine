from collections import deque
from dataclasses import dataclass, field
from typing import Any

from app.engine.ir.models import JoinType
from app.models.schema import SchemaObject, SchemaSnapshot, UserDefinedRelationship


@dataclass
class SchemaEdge:
    """Directed or bi-directional join relationship between two database entities."""

    source_table: str
    source_connection_id: str
    source_column: str
    target_table: str
    target_connection_id: str
    target_column: str
    join_type: JoinType = JoinType.INNER
    is_cross_database: bool = False
    weight: float = 1.0


@dataclass
class SchemaNode:
    """Database table or collection node in the schema graph."""

    table_name: str
    connection_id: str
    schema_object: SchemaObject


class SchemaGraph:
    """In-memory multi-database schema graph with automated BFS pathfinding for multi-hop joins."""

    def __init__(self) -> None:
        self.nodes: dict[str, SchemaNode] = {}
        # Adjacency list: table_name -> list of SchemaEdge
        self.adjacency: dict[str, list[SchemaEdge]] = {}

    def add_node(self, connection_id: str, schema_obj: SchemaObject) -> None:
        norm_name = schema_obj.name.lower()
        self.nodes[norm_name] = SchemaNode(
            table_name=schema_obj.name,
            connection_id=connection_id,
            schema_object=schema_obj,
        )
        if norm_name not in self.adjacency:
            self.adjacency[norm_name] = []

    def add_edge(
        self,
        source_table: str,
        source_connection_id: str,
        source_col: str,
        target_table: str,
        target_connection_id: str,
        target_col: str,
        join_type: JoinType = JoinType.INNER,
        is_cross_database: bool | None = None,
        weight: float = 1.0,
    ) -> None:
        src = source_table.lower()
        tgt = target_table.lower()

        if src not in self.nodes or tgt not in self.nodes:
            return

        is_cross = (
            is_cross_database
            if is_cross_database is not None
            else (source_connection_id != target_connection_id)
        )

        # Forward edge
        edge_fwd = SchemaEdge(
            source_table=self.nodes[src].table_name,
            source_connection_id=source_connection_id,
            source_column=source_col,
            target_table=self.nodes[tgt].table_name,
            target_connection_id=target_connection_id,
            target_column=target_col,
            join_type=join_type,
            is_cross_database=is_cross,
            weight=weight,
        )
        # Avoid duplicate edges
        if not any(
            e.target_table.lower() == tgt
            and e.source_column == source_col
            and e.target_column == target_col
            for e in self.adjacency[src]
        ):
            self.adjacency[src].append(edge_fwd)

        # Reverse edge (bi-directional graph for pathfinding)
        edge_rev = SchemaEdge(
            source_table=self.nodes[tgt].table_name,
            source_connection_id=target_connection_id,
            source_column=target_col,
            target_table=self.nodes[src].table_name,
            target_connection_id=source_connection_id,
            target_column=source_col,
            join_type=join_type,
            is_cross_database=is_cross,
            weight=weight,
        )
        if not any(
            e.target_table.lower() == src
            and e.source_column == target_col
            and e.target_column == source_col
            for e in self.adjacency[tgt]
        ):
            self.adjacency[tgt].append(edge_rev)

    @classmethod
    def build(
        cls,
        snapshots: dict[str, SchemaSnapshot],
        relationships: list[UserDefinedRelationship] | None = None,
    ) -> "SchemaGraph":
        """Construct schema graph from all attached snapshots and relationships."""
        graph = cls()

        # 1. Register all nodes
        for conn_id, snap in snapshots.items():
            for obj in snap.objects:
                graph.add_node(conn_id, obj)

        # 2. Introspected foreign keys from SchemaObject.relationships
        for conn_id, snap in snapshots.items():
            for obj in snap.objects:
                for rel in getattr(obj, "relationships", []):
                    src_tbl = rel.source_table.lower()
                    tgt_tbl = rel.target_table.lower()
                    if (
                        src_tbl in graph.nodes
                        and tgt_tbl in graph.nodes
                        and rel.source_fields
                        and rel.target_fields
                    ):
                        tgt_conn_id = graph.nodes[tgt_tbl].connection_id
                        graph.add_edge(
                            source_table=src_tbl,
                            source_connection_id=conn_id,
                            source_col=rel.source_fields[0],
                            target_table=tgt_tbl,
                            target_connection_id=tgt_conn_id,
                            target_col=rel.target_fields[0],
                            weight=1.0,
                        )

        # 3. User-defined cross-database relationships
        if relationships:
            for urel in relationships:
                src_tbl = urel.source_table.lower()
                tgt_tbl = urel.target_table.lower()
                if (
                    src_tbl in graph.nodes
                    and tgt_tbl in graph.nodes
                    and urel.source_fields
                    and urel.target_fields
                ):
                    src_conn_id = graph.nodes[src_tbl].connection_id
                    tgt_conn_id = graph.nodes[tgt_tbl].connection_id
                    graph.add_edge(
                        source_table=src_tbl,
                        source_connection_id=src_conn_id,
                        source_col=urel.source_fields[0],
                        target_table=tgt_tbl,
                        target_connection_id=tgt_conn_id,
                        target_col=urel.target_fields[0],
                        is_cross_database=src_conn_id != tgt_conn_id,
                        weight=1.2,
                    )

        # 4. Inferred foreign keys by column naming convention across any tables:
        # e.g., if table B has 'department_id' and table A ('departments') has 'id'
        for node_a_name, node_a in graph.nodes.items():
            sing_a = node_a_name[:-1] if node_a_name.endswith("s") else node_a_name
            pk_col = next(
                (f.name for f in node_a.schema_object.fields if f.is_primary_key),
                "id",
            )
            cand_fk_names = {f"{sing_a}_id", f"{node_a_name}_id"}

            for node_b_name, node_b in graph.nodes.items():
                if node_a_name == node_b_name:
                    continue
                for fld in node_b.schema_object.fields:
                    if fld.name.lower() in cand_fk_names:
                        graph.add_edge(
                            source_table=node_b_name,
                            source_connection_id=node_b.connection_id,
                            source_col=fld.name,
                            target_table=node_a_name,
                            target_connection_id=node_a.connection_id,
                            target_col=pk_col,
                            weight=1.5,
                        )

        return graph

    def find_shortest_path(self, start_table: str, target_table: str) -> list[SchemaEdge] | None:
        """Find minimum-hop path between two tables using Breadth-First Search (BFS)."""
        start = start_table.lower()
        target = target_table.lower()

        if start == target:
            return []

        if start not in self.nodes or target not in self.nodes:
            return None

        # Queue stores (current_table, list_of_edges_traversed)
        queue: deque[tuple[str, list[SchemaEdge]]] = deque([(start, [])])
        visited: set[str] = {start}

        while queue:
            curr_table, path = queue.popleft()

            if curr_table == target:
                return path

            for edge in self.adjacency.get(curr_table, []):
                next_table = edge.target_table.lower()
                if next_table not in visited:
                    visited.add(next_table)
                    queue.append((next_table, path + [edge]))

        return None

    def find_multi_entity_join_tree(
        self,
        primary_table: str,
        secondary_tables: list[str],
    ) -> list[SchemaEdge]:
        """Generate an ordered, deduplicated sequence of join edges connecting primary to all secondaries."""
        prim = primary_table.lower()
        if prim not in self.nodes:
            return []

        joined_tables: set[str] = {prim}
        all_edges: list[SchemaEdge] = []

        for sec in secondary_tables:
            sec_norm = sec.lower()
            if sec_norm in joined_tables or sec_norm not in self.nodes:
                continue

            # Find shortest path from any currently joined table to sec_norm
            best_path: list[SchemaEdge] | None = None
            for joined_t in list(joined_tables):
                path = self.find_shortest_path(joined_t, sec_norm)
                if path:
                    if best_path is None or len(path) < len(best_path):
                        best_path = path

            if best_path:
                for edge in best_path:
                    tgt = edge.target_table.lower()
                    if tgt not in joined_tables:
                        all_edges.append(edge)
                        joined_tables.add(tgt)

        return all_edges
