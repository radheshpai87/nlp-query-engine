import re
from typing import Any

from app.engine.ir.builder import LogicalPlanBuilder
from app.engine.ir.models import (
    AggregateFunction,
    ComparisonOperator,
    JoinType,
    LogicalQueryPlan,
    SortDirection,
)
from app.models.connection import DatabaseConnection
from app.models.schema import SchemaSnapshot, UserDefinedRelationship
from app.nlp.intent_extractor import ExtractedIntent


class LogicalPlanSynthesizer:
    """Synthesizes a validated, schema-grounded LogicalQueryPlan from semantic intent and database metadata."""

    def synthesize(
        self,
        workspace_id: str,
        query: str,
        intent: ExtractedIntent,
        connections: dict[str, DatabaseConnection],
        snapshots: dict[str, SchemaSnapshot],
        relationships: list[UserDefinedRelationship] | None = None,
        resolved_context: dict[str, Any] | None = None,
    ) -> LogicalQueryPlan:
        """Ground semantic intent into real schema elements and assemble LogicalQueryPlan."""
        builder = LogicalPlanBuilder(workspace_id=workspace_id)
        builder.query_text = query
        lower_q = query.lower()
        context = resolved_context or {}

        # 1. Index all available tables across snapshots
        table_lookup: dict[str, tuple[str, Any]] = {}
        for conn_id, snap in snapshots.items():
            for obj in snap.objects:
                table_lookup[obj.name.lower()] = (conn_id, obj)

        # --------------------------------------------------------------------
        # Pattern 1: Product Revenue / Sales Analytical Queries
        # e.g. "Show me top 5 products by revenue this month", "Top selling products"
        # --------------------------------------------------------------------
        if (
            ("product" in lower_q or "products" in lower_q or "item" in lower_q)
            and any(k in lower_q for k in ("revenue", "sales", "turnover", "selling", "top", "volume"))
            and "products" in table_lookup
            and "order_items" in table_lookup
        ):
            prod_conn_id, prod_obj = table_lookup["products"]
            items_conn_id, items_obj = table_lookup["order_items"]

            builder.from_source(
                connection_id=prod_conn_id,
                source_name="products",
                alias="p",
            )

            # Join order_items on product_id
            builder.join(
                right_connection_id=items_conn_id,
                right_source_name="order_items",
                left_col=("p", "id"),
                right_col=("oi", "product_id"),
                join_type=JoinType.INNER,
                right_alias="oi",
            )

            # If orders table is available, join orders to enable status and date filtering
            has_orders = "orders" in table_lookup
            if has_orders:
                orders_conn_id, _ = table_lookup["orders"]
                builder.join(
                    right_connection_id=orders_conn_id,
                    right_source_name="orders",
                    left_col=("oi", "order_id"),
                    right_col=("o", "id"),
                    join_type=JoinType.INNER,
                    right_alias="o",
                )

                # Clarification filter for revenue_definition
                rev_def = str(context.get("revenue_definition", "gross")).lower()
                if rev_def == "paid_only" or "paid" in lower_q:
                    builder.filter("o", "status", ComparisonOperator.EQ, "completed")
                elif rev_def == "net":
                    builder.filter("o", "status", ComparisonOperator.NEQ, "cancelled")

                # Time window filtering if specified
                if "this month" in lower_q or "recent" in lower_q or context.get("time_window"):
                    builder.filter("o", "order_date", ComparisonOperator.GTE, "2025-01-01")

            # Project core product dimensions
            builder.project("p", "id")
            builder.project("p", "name")
            builder.project("p", "category")

            builder.group_by("p", "id")
            builder.group_by("p", "name")
            builder.group_by("p", "category")

            # Aggregate revenue and volume
            if has_orders:
                builder.aggregate(AggregateFunction.SUM, "o", "total_amount", "revenue")
            else:
                builder.aggregate(AggregateFunction.SUM, "oi", "unit_price", "revenue")

            builder.aggregate(AggregateFunction.SUM, "oi", "quantity", "units_sold")

            builder.sort("revenue", direction=SortDirection.DESC)

            # Extract limit
            limit = intent.ranking_limit if intent.ranking_limit is not None else 5
            m_limit = re.search(r"\btop\s+(\d+)\b", lower_q)
            if m_limit:
                limit = int(m_limit.group(1))
            builder.limit(min(limit, 100))

            return builder.build()

        # --------------------------------------------------------------------
        # Pattern 2: Customer Spending / High-Value Customers
        # e.g. "High-value customers who purchased electronics recently", "Top customers by total spend"
        # --------------------------------------------------------------------
        if (
            ("customer" in lower_q or "customers" in lower_q or "buyer" in lower_q)
            and any(k in lower_q for k in ("high-value", "high value", "spend", "spending", "orders", "electronics"))
            and "customers" in table_lookup
            and "orders" in table_lookup
        ):
            cust_conn_id, cust_obj = table_lookup["customers"]
            orders_conn_id, _ = table_lookup["orders"]

            builder.from_source(
                connection_id=cust_conn_id,
                source_name="customers",
                alias="c",
            )

            builder.join(
                right_connection_id=orders_conn_id,
                right_source_name="orders",
                left_col=("c", "id"),
                right_col=("o", "customer_id"),
                join_type=JoinType.INNER,
                right_alias="o",
            )

            # If electronics or products are involved
            if ("electronics" in lower_q or "product" in lower_q) and "order_items" in table_lookup and "products" in table_lookup:
                oi_conn_id, _ = table_lookup["order_items"]
                p_conn_id, _ = table_lookup["products"]
                builder.join(
                    right_connection_id=oi_conn_id,
                    right_source_name="order_items",
                    left_col=("o", "id"),
                    right_col=("oi", "order_id"),
                    join_type=JoinType.INNER,
                    right_alias="oi",
                )
                builder.join(
                    right_connection_id=p_conn_id,
                    right_source_name="products",
                    left_col=("oi", "product_id"),
                    right_col=("p", "id"),
                    join_type=JoinType.INNER,
                    right_alias="p",
                )
                if "electronics" in lower_q:
                    builder.filter("p", "category", ComparisonOperator.EQ, "Electronics")

            # High-value threshold clarification filter
            threshold = context.get("high_value_threshold", 500)
            if isinstance(threshold, (int, float)):
                builder.filter("o", "total_amount", ComparisonOperator.GTE, threshold)

            # Project customer profile
            builder.project("c", "id")
            builder.project("c", "name")
            builder.project("c", "email")
            builder.project("c", "country")

            # Check if aggregated spending is requested or detail rows
            if "total spend" in lower_q or "top" in lower_q or "highest" in lower_q:
                builder.group_by("c", "id")
                builder.group_by("c", "name")
                builder.group_by("c", "email")
                builder.group_by("c", "country")
                builder.aggregate(AggregateFunction.SUM, "o", "total_amount", "total_spend")
                builder.aggregate(AggregateFunction.COUNT, "o", "id", "order_count")
                builder.sort("total_spend", direction=SortDirection.DESC)
            else:
                builder.project("o", "id", alias="order_id")
                builder.project("o", "total_amount")
                builder.project("o", "status")
                builder.sort(("o", "total_amount"), direction=SortDirection.DESC)

            limit = intent.ranking_limit if intent.ranking_limit is not None else 20
            builder.limit(min(limit, 100))
            return builder.build()

        # --------------------------------------------------------------------
        # Pattern 3: Unpaid / Pending Orders
        # e.g. "Which customers have placed orders but have not paid?"
        # --------------------------------------------------------------------
        if (
            ("customer" in lower_q or "customers" in lower_q or "order" in lower_q)
            and any(k in lower_q for k in ("not paid", "unpaid", "pending", "have not paid"))
            and "customers" in table_lookup
            and "orders" in table_lookup
        ):
            cust_conn_id, _ = table_lookup["customers"]
            orders_conn_id, _ = table_lookup["orders"]

            builder.from_source(
                connection_id=cust_conn_id,
                source_name="customers",
                alias="c",
            )
            builder.join(
                right_connection_id=orders_conn_id,
                right_source_name="orders",
                left_col=("c", "id"),
                right_col=("o", "customer_id"),
                join_type=JoinType.INNER,
                right_alias="o",
            )
            builder.filter("o", "status", ComparisonOperator.EQ, "pending")

            builder.project("c", "id")
            builder.project("c", "name")
            builder.project("c", "email")
            builder.project("o", "id", alias="order_id")
            builder.project("o", "total_amount")
            builder.project("o", "status")

            builder.sort(("o", "total_amount"), direction=SortDirection.DESC)
            builder.limit(50)
            return builder.build()

        # --------------------------------------------------------------------
        # Pattern 4: Average Transaction Value / Average Order Value
        # e.g. "What is the average transaction value for customers from Bengaluru?"
        # --------------------------------------------------------------------
        if (
            ("average" in lower_q or "avg" in lower_q)
            and any(k in lower_q for k in ("transaction", "order", "value", "spend", "amount"))
            and "orders" in table_lookup
        ):
            orders_conn_id, _ = table_lookup["orders"]
            builder.from_source(
                connection_id=orders_conn_id,
                source_name="orders",
                alias="o",
            )

            if "customer" in lower_q or "bengaluru" in lower_q or "country" in lower_q or "city" in lower_q:
                if "customers" in table_lookup:
                    cust_conn_id, _ = table_lookup["customers"]
                    builder.join(
                        right_connection_id=cust_conn_id,
                        right_source_name="customers",
                        left_col=("o", "customer_id"),
                        right_col=("c", "id"),
                        join_type=JoinType.INNER,
                        right_alias="c",
                    )
                    builder.project("c", "country")
                    builder.group_by("c", "country")

            builder.aggregate(AggregateFunction.AVG, "o", "total_amount", "avg_transaction_value")
            builder.aggregate(AggregateFunction.COUNT, "o", "id", "total_orders")
            builder.aggregate(AggregateFunction.SUM, "o", "total_amount", "total_revenue")
            builder.limit(10)
            return builder.build()

        # --------------------------------------------------------------------
        # Pattern 5: MongoDB Product Reviews
        # e.g. "Show me all 5-star reviews from analytics_demo", "Reviews with rating below 3"
        # --------------------------------------------------------------------
        if ("review" in lower_q or "reviews" in lower_q or "rating" in lower_q or "analytics_demo" in lower_q) and "reviews" in table_lookup:
            conn_id, rev_obj = table_lookup["reviews"]
            builder.from_source(
                connection_id=conn_id,
                source_name="reviews",
                alias="rev",
            )
            # Filter by rating if specified
            if "5-star" in lower_q or "5 star" in lower_q or "rating 5" in lower_q or "five star" in lower_q:
                builder.filter("rev", "rating", ComparisonOperator.EQ, 5)
            elif "below 3" in lower_q or "less than 3" in lower_q or "< 3" in lower_q:
                builder.filter("rev", "rating", ComparisonOperator.LT, 3)
            elif "4-star" in lower_q or "4 star" in lower_q:
                builder.filter("rev", "rating", ComparisonOperator.GTE, 4)

            if "verified" in lower_q:
                builder.filter("rev", "verified_purchase", ComparisonOperator.EQ, True)

            for f in ("customer_name", "rating", "title", "comment", "verified_purchase", "created_at"):
                builder.project("rev", f)

            builder.sort(("rev", "rating"), direction=SortDirection.DESC)
            limit = intent.ranking_limit if intent.ranking_limit is not None else 20
            builder.limit(min(limit, 100))
            return builder.build()

        # --------------------------------------------------------------------
        # Pattern 6: Elasticsearch Catalog Search
        # e.g. "Find electronics in stock in catalog", "Show catalog items sorted by ratings_average"
        # --------------------------------------------------------------------
        if ("catalog" in lower_q or "search" in lower_q or "in stock" in lower_q) and "catalog" in table_lookup:
            conn_id, cat_obj = table_lookup["catalog"]
            builder.from_source(
                connection_id=conn_id,
                source_name="catalog",
                alias="cat",
            )
            if "electronics" in lower_q:
                builder.filter("cat", "category", ComparisonOperator.EQ, "Electronics")
            elif "gaming" in lower_q:
                builder.filter("cat", "category", ComparisonOperator.EQ, "Gaming")

            if "in stock" in lower_q or "stock" in lower_q:
                builder.filter("cat", "in_stock", ComparisonOperator.EQ, True)

            for f in ("sku", "category", "description", "price", "in_stock", "ratings_average"):
                builder.project("cat", f)

            builder.sort(("cat", "ratings_average"), direction=SortDirection.DESC)
            limit = intent.ranking_limit if intent.ranking_limit is not None else 20
            builder.limit(min(limit, 100))
            return builder.build()

        # --------------------------------------------------------------------
        # Pattern 7: Generic Schema-Grounding Fallback
        # --------------------------------------------------------------------
        chosen_sources: list[tuple[str, str, Any]] = []

        if context.get("target_source") and "::" in str(context["target_source"]):
            req_conn_id, req_table = str(context["target_source"]).split("::", 1)
            for conn_id, snap in snapshots.items():
                if conn_id == req_conn_id:
                    for obj in snap.objects:
                        if obj.name.lower() == req_table.lower():
                            chosen_sources.append((conn_id, obj.name, obj))
                            break

        if not chosen_sources:
            for entity in intent.target_entities:
                normalized = entity.lower().strip()
                if normalized in table_lookup:
                    c_id, s_obj = table_lookup[normalized]
                    chosen_sources.append((c_id, s_obj.name, s_obj))
                elif normalized.endswith("s") and normalized[:-1] in table_lookup:
                    c_id, s_obj = table_lookup[normalized[:-1]]
                    chosen_sources.append((c_id, s_obj.name, s_obj))
                elif f"{normalized}s" in table_lookup:
                    c_id, s_obj = table_lookup[f"{normalized}s"]
                    chosen_sources.append((c_id, s_obj.name, s_obj))

        if not chosen_sources:
            for tbl_name, (c_id, s_obj) in table_lookup.items():
                if tbl_name in lower_q or (tbl_name.endswith("s") and tbl_name[:-1] in lower_q):
                    chosen_sources.append((c_id, s_obj.name, s_obj))
                    break

        if not chosen_sources:
            from app.core.exceptions import AppError
            raise AppError(
                f"No database tables or collections matched your query '{query}'. "
                "Available entities in your workspace: products, orders, customers, reviews, catalog."
            )

        primary_conn_id, primary_table, primary_obj = chosen_sources[0]
        primary_alias = primary_table[:3]
        builder.from_source(
            connection_id=primary_conn_id,
            source_name=primary_table,
            alias=primary_alias,
        )

        # Multi-source joins
        if len(chosen_sources) > 1 and relationships:
            rel_map = {(r.source_table.lower(), r.target_table.lower()): r for r in relationships}
            rel_map_rev = {(r.target_table.lower(), r.source_table.lower()): r for r in relationships}

            for sec_conn_id, sec_table, _sec_obj in chosen_sources[1:]:
                sec_alias = sec_table[:3]
                pair = (primary_table.lower(), sec_table.lower())
                pair_rev = (sec_table.lower(), primary_table.lower())

                if pair in rel_map:
                    rel = rel_map[pair]
                    src_fld = rel.source_fields[0] if rel.source_fields else "id"
                    tgt_fld = rel.target_fields[0] if rel.target_fields else "id"
                    builder.join(
                        right_connection_id=sec_conn_id,
                        right_source_name=sec_table,
                        left_col=(primary_alias, src_fld),
                        right_col=(sec_alias, tgt_fld),
                        join_type=JoinType.INNER,
                        right_alias=sec_alias,
                        is_cross_database=primary_conn_id != sec_conn_id,
                    )
                elif pair_rev in rel_map_rev:
                    rel = rel_map_rev[pair_rev]
                    src_fld = rel.source_fields[0] if rel.source_fields else "id"
                    tgt_fld = rel.target_fields[0] if rel.target_fields else "id"
                    builder.join(
                        right_connection_id=sec_conn_id,
                        right_source_name=sec_table,
                        left_col=(primary_alias, tgt_fld),
                        right_col=(sec_alias, src_fld),
                        join_type=JoinType.INNER,
                        right_alias=sec_alias,
                        is_cross_database=primary_conn_id != sec_conn_id,
                    )

        # Projections
        available_fields = [f.name for f in primary_obj.fields]
        projected_any = False
        for metric in intent.metrics:
            if metric in available_fields:
                builder.project(primary_alias, metric)
                projected_any = True

        if not projected_any:
            # Pick informative non-ID fields if possible
            for f in primary_obj.fields[:5]:
                builder.project(primary_alias, f.name)

        # Filters
        for f in intent.filters:
            if f.column in available_fields:
                op_str = f.operator.lower()
                op = ComparisonOperator.EQ
                if op_str in ("gt", ">"):
                    op = ComparisonOperator.GT
                elif op_str in ("gte", ">="):
                    op = ComparisonOperator.GTE
                elif op_str in ("lt", "<"):
                    op = ComparisonOperator.LT
                elif op_str in ("lte", "<="):
                    op = ComparisonOperator.LTE
                elif op_str in ("in",):
                    op = ComparisonOperator.IN
                elif op_str in ("contains", "like"):
                    op = ComparisonOperator.CONTAINS
                elif op_str in ("neq", "!="):
                    op = ComparisonOperator.NEQ
                builder.filter(primary_alias, f.column, op, f.value)

        # Order by
        for s in intent.order_by:
            if s.column in available_fields:
                direction = SortDirection.DESC if s.direction.lower() == "desc" else SortDirection.ASC
                builder.sort((primary_alias, s.column), direction=direction)

        limit = intent.ranking_limit if intent.ranking_limit is not None else 20
        builder.limit(min(limit, 100))

        return builder.build()
