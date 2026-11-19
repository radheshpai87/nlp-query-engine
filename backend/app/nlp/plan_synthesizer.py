import re
from typing import Any

from app.core.exceptions import AppError
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

DISPLAY_COLUMNS: dict[str, list[str]] = {
    "customers": ["id", "name", "email", "country", "status"],
    "products": ["id", "sku", "name", "category", "price", "stock_quantity"],
    "orders": ["id", "customer_id", "order_date", "status", "total_amount", "shipping_country"],
    "order_items": ["id", "order_id", "product_id", "quantity", "unit_price"],
    "reviews": ["customer_name", "rating", "title", "comment", "verified_purchase"],
    "catalog": ["sku", "category", "description", "price", "in_stock", "ratings_average"],
    "access_logs": ["client_ip", "endpoint", "method", "status_code", "response_time_ms", "timestamp"],
    "events": ["event_type", "user_id", "amount", "device", "country", "timestamp"],
}

ALIAS_MAP: dict[str, str] = {
    "products": "p",
    "customers": "c",
    "orders": "o",
    "order_items": "oi",
    "reviews": "rev",
    "catalog": "cat",
    "access_logs": "al",
    "events": "ev",
}


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
        # Pattern 1: Unpaid / Pending Orders
        # e.g. "Which customers have placed orders but have not paid?", "Customers with unpaid orders"
        # --------------------------------------------------------------------
        if (
            ("customer" in lower_q or "customers" in lower_q or "order" in lower_q)
            and any(k in lower_q for k in ("not paid", "unpaid", "pending", "have not paid"))
            and "customers" in table_lookup
            and "orders" in table_lookup
        ):
            cust_conn_id, _ = table_lookup["customers"]
            orders_conn_id, _ = table_lookup["orders"]

            builder.from_source(connection_id=cust_conn_id, source_name="customers", alias="c")
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
            builder.limit(intent.ranking_limit or 20)
            return builder.build()

        # --------------------------------------------------------------------
        # Pattern 2: Dynamic Group By & Aggregation
        # e.g. "How many customers are in each country?", "What is the total revenue by product category?",
        # "Count orders by status", "How many reviews per rating"
        # --------------------------------------------------------------------
        group_col: str | None = None
        if intent.group_by:
            group_col = intent.group_by[0]
        else:
            m_group = re.search(r"\b(?:by|per|each)\s+(country|category|status|rating|product|customer)\b", lower_q)
            if m_group:
                group_col = m_group.group(1)

        if group_col:
            # 2a. Group by Category
            if group_col == "category" and "products" in table_lookup:
                prod_conn_id, _ = table_lookup["products"]
                builder.from_source(connection_id=prod_conn_id, source_name="products", alias="p")
                builder.group_by("p", "category")
                builder.project("p", "category")

                if any(k in lower_q for k in ("revenue", "sales", "turnover")) and "order_items" in table_lookup:
                    items_conn_id, _ = table_lookup["order_items"]
                    builder.join(
                        right_connection_id=items_conn_id,
                        right_source_name="order_items",
                        left_col=("p", "id"),
                        right_col=("oi", "product_id"),
                        join_type=JoinType.INNER,
                        right_alias="oi",
                    )
                    if "orders" in table_lookup:
                        orders_conn_id, _ = table_lookup["orders"]
                        builder.join(
                            right_connection_id=orders_conn_id,
                            right_source_name="orders",
                            left_col=("oi", "order_id"),
                            right_col=("o", "id"),
                            join_type=JoinType.INNER,
                            right_alias="o",
                        )
                        builder.aggregate(AggregateFunction.SUM, "o", "total_amount", "revenue")
                    else:
                        builder.aggregate(AggregateFunction.SUM, "oi", "unit_price", "revenue")
                    builder.aggregate(AggregateFunction.SUM, "oi", "quantity", "units_sold")
                    builder.sort("revenue", direction=SortDirection.DESC)
                else:
                    builder.aggregate(AggregateFunction.COUNT, "p", "id", "product_count")
                    builder.aggregate(AggregateFunction.AVG, "p", "price", "avg_price")
                    builder.sort("product_count", direction=SortDirection.DESC)

                builder.limit(intent.ranking_limit or 20)
                return builder.build()

            # 2b. Group by Country
            if group_col == "country":
                if any(k in lower_q for k in ("revenue", "transaction", "avg", "spend")) and "orders" in table_lookup:
                    orders_conn_id, _ = table_lookup["orders"]
                    builder.from_source(connection_id=orders_conn_id, source_name="orders", alias="o")
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
                        builder.group_by("c", "country")
                        builder.project("c", "country")
                    else:
                        builder.group_by("o", "shipping_country")
                        builder.project("o", "shipping_country")

                    builder.aggregate(AggregateFunction.AVG, "o", "total_amount", "avg_transaction_value")
                    builder.aggregate(AggregateFunction.COUNT, "o", "id", "total_orders")
                    builder.aggregate(AggregateFunction.SUM, "o", "total_amount", "total_revenue")
                    builder.sort("total_revenue", direction=SortDirection.DESC)
                    builder.limit(intent.ranking_limit or 20)
                    return builder.build()
                elif "customers" in table_lookup:
                    cust_conn_id, _ = table_lookup["customers"]
                    builder.from_source(connection_id=cust_conn_id, source_name="customers", alias="c")
                    builder.group_by("c", "country")
                    builder.project("c", "country")
                    builder.aggregate(AggregateFunction.COUNT, "c", "id", "customer_count")
                    builder.sort("customer_count", direction=SortDirection.DESC)
                    builder.limit(intent.ranking_limit or 20)
                    return builder.build()

            # 2c. Group by Status
            if group_col == "status" and "orders" in table_lookup:
                orders_conn_id, _ = table_lookup["orders"]
                builder.from_source(connection_id=orders_conn_id, source_name="orders", alias="o")
                builder.group_by("o", "status")
                builder.project("o", "status")
                builder.aggregate(AggregateFunction.COUNT, "o", "id", "order_count")
                builder.aggregate(AggregateFunction.SUM, "o", "total_amount", "total_amount")
                builder.sort("order_count", direction=SortDirection.DESC)
                builder.limit(intent.ranking_limit or 20)
                return builder.build()

            # 2d. Group by Rating
            if group_col == "rating" and "reviews" in table_lookup:
                rev_conn_id, _ = table_lookup["reviews"]
                builder.from_source(connection_id=rev_conn_id, source_name="reviews", alias="rev")
                builder.group_by("rev", "rating")
                builder.project("rev", "rating")
                builder.aggregate(AggregateFunction.COUNT, "rev", "_id", "review_count")
                builder.sort(("rev", "rating"), direction=SortDirection.DESC)
                builder.limit(intent.ranking_limit or 20)
                return builder.build()

        # --------------------------------------------------------------------
        # Pattern 3: Product Revenue / Top Products
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

            builder.from_source(connection_id=prod_conn_id, source_name="products", alias="p")
            builder.join(
                right_connection_id=items_conn_id,
                right_source_name="order_items",
                left_col=("p", "id"),
                right_col=("oi", "product_id"),
                join_type=JoinType.INNER,
                right_alias="oi",
            )

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

                rev_def = str(context.get("revenue_definition", "gross")).lower()
                if rev_def == "paid_only" or "paid" in lower_q:
                    builder.filter("o", "status", ComparisonOperator.EQ, "completed")
                elif rev_def == "net":
                    builder.filter("o", "status", ComparisonOperator.NEQ, "cancelled")

                if "this month" in lower_q or "recent" in lower_q or context.get("time_window"):
                    builder.filter("o", "order_date", ComparisonOperator.GTE, "2025-01-01")

            builder.project("p", "id")
            builder.project("p", "name")
            builder.project("p", "category")

            builder.group_by("p", "id")
            builder.group_by("p", "name")
            builder.group_by("p", "category")

            if has_orders:
                builder.aggregate(AggregateFunction.SUM, "o", "total_amount", "revenue")
            else:
                builder.aggregate(AggregateFunction.SUM, "oi", "unit_price", "revenue")

            builder.aggregate(AggregateFunction.SUM, "oi", "quantity", "units_sold")
            builder.sort("revenue", direction=SortDirection.DESC)

            limit = intent.ranking_limit if intent.ranking_limit is not None else 5
            m_limit = re.search(r"\btop\s+(\d+)\b", lower_q)
            if m_limit:
                limit = int(m_limit.group(1))
            builder.limit(min(limit, 100))
            return builder.build()

        # --------------------------------------------------------------------
        # Pattern 4: Customer Spending / High-Value Customers
        # e.g. "High-value customers who purchased electronics recently", "Top customers by total spend"
        # --------------------------------------------------------------------
        if (
            ("customer" in lower_q or "customers" in lower_q or "buyer" in lower_q)
            and any(k in lower_q for k in ("high-value", "high value", "spend", "spending", "electronics"))
            and "customers" in table_lookup
            and "orders" in table_lookup
        ):
            cust_conn_id, cust_obj = table_lookup["customers"]
            orders_conn_id, _ = table_lookup["orders"]

            builder.from_source(connection_id=cust_conn_id, source_name="customers", alias="c")
            builder.join(
                right_connection_id=orders_conn_id,
                right_source_name="orders",
                left_col=("c", "id"),
                right_col=("o", "customer_id"),
                join_type=JoinType.INNER,
                right_alias="o",
            )

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

            threshold = context.get("high_value_threshold", 500)
            if isinstance(threshold, (int, float)):
                builder.filter("o", "total_amount", ComparisonOperator.GTE, threshold)

            builder.project("c", "id")
            builder.project("c", "name")
            builder.project("c", "email")
            builder.project("c", "country")

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
        # Pattern 5: Pure Aggregate without Group By
        # e.g. "Count completed orders", "What is the average price of products in Kitchen?",
        # "What is the total amount of all orders?"
        # --------------------------------------------------------------------
        is_count_query = any(k in lower_q for k in ("how many", "count", "number of")) and not intent.group_by
        is_avg_query = any(k in lower_q for k in ("average", "avg", "mean")) and not intent.group_by
        is_sum_query = (
            any(k in lower_q for k in ("overall revenue", "sum of total", "total revenue of all", "sum of order"))
            or ("total amount" in lower_q and not re.search(r"\b(greater|less|over|under|above|below|>|<|=|with|where)\b", lower_q))
        ) and not intent.group_by

        if is_count_query or is_avg_query or is_sum_query:
            # Determine target entity
            cand = "products"
            if any(k in lower_q for k in ("order", "orders", "purchase")):
                cand = "orders"
            elif any(k in lower_q for k in ("customer", "customers", "user")):
                cand = "customers"
            elif any(k in lower_q for k in ("review", "reviews", "rating")):
                cand = "reviews"
            elif any(k in lower_q for k in ("catalog",)):
                cand = "catalog"
            elif any(k in lower_q for k in ("log", "logs", "access_logs")):
                cand = "access_logs"

            if cand in table_lookup:
                conn_id, s_obj = table_lookup[cand]
                alias = ALIAS_MAP.get(cand, cand[:3])
                builder.from_source(connection_id=conn_id, source_name=cand, alias=alias)

                # Ground filters
                for f in intent.filters:
                    f_col = f.column.lower()
                    if any(fld.name.lower() == f_col for fld in s_obj.fields):
                        op_enum = getattr(ComparisonOperator, f.operator.upper(), ComparisonOperator.EQ)
                        builder.filter(alias, f.column, op_enum, f.value)

                if is_count_query:
                    id_field = next((fld.name for fld in s_obj.fields if fld.is_primary_key), "id")
                    builder.aggregate(AggregateFunction.COUNT, alias, id_field, f"{cand}_count")
                elif is_avg_query:
                    num_field = next(
                        (fld.name for fld in s_obj.fields if fld.name.lower() in ("price", "total_amount", "amount", "rating", "response_time_ms")),
                        "price"
                    )
                    builder.aggregate(AggregateFunction.AVG, alias, num_field, f"avg_{num_field}")
                elif is_sum_query:
                    num_field = next(
                        (fld.name for fld in s_obj.fields if fld.name.lower() in ("total_amount", "amount", "price")),
                        "total_amount"
                    )
                    builder.aggregate(AggregateFunction.SUM, alias, num_field, f"total_{num_field}")

                builder.limit(1)
                return builder.build()

        # --------------------------------------------------------------------
        # Pattern 6: Universal Schema-Grounded Single & Multi-Table Engine
        # Handles ANY arbitrary filter, search, sort, projection across tables
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
            # Fallback to products or first available table
            first_tbl = next(iter(table_lookup.keys()), None)
            if first_tbl:
                c_id, s_obj = table_lookup[first_tbl]
                chosen_sources.append((c_id, s_obj.name, s_obj))
            else:
                raise AppError(
                    f"No database tables or collections matched your query '{query}'. "
                    "Available entities in your workspace: products, orders, customers, reviews, catalog, access_logs."
                )

        primary_conn_id, primary_table, primary_obj = chosen_sources[0]
        primary_alias = ALIAS_MAP.get(primary_table, primary_table[:3])
        builder.from_source(connection_id=primary_conn_id, source_name=primary_table, alias=primary_alias)

        joined_tables: dict[str, str] = {primary_table: primary_alias}

        # Multi-table joins if multiple entities requested or if filters need them
        for sec_conn_id, sec_table, _sec_obj in chosen_sources[1:]:
            sec_alias = ALIAS_MAP.get(sec_table, sec_table[:3])
            if sec_table in joined_tables:
                continue

            # Check known joins
            joined = False
            for src_t, src_c, tgt_t, tgt_c, jtype in [
                ("customers", "id", "orders", "customer_id", JoinType.INNER),
                ("orders", "customer_id", "customers", "id", JoinType.INNER),
                ("orders", "id", "order_items", "order_id", JoinType.INNER),
                ("order_items", "order_id", "orders", "id", JoinType.INNER),
                ("order_items", "product_id", "products", "id", JoinType.INNER),
                ("products", "id", "order_items", "product_id", JoinType.INNER),
                ("products", "id", "reviews", "product_id", JoinType.INNER),
                ("reviews", "product_id", "products", "id", JoinType.INNER),
                ("products", "id", "catalog", "product_id", JoinType.INNER),
                ("catalog", "product_id", "products", "id", JoinType.INNER),
            ]:
                if src_t in joined_tables and tgt_t == sec_table:
                    builder.join(
                        right_connection_id=sec_conn_id,
                        right_source_name=sec_table,
                        left_col=(joined_tables[src_t], src_c),
                        right_col=(sec_alias, tgt_c),
                        join_type=jtype,
                        right_alias=sec_alias,
                        is_cross_database=primary_conn_id != sec_conn_id,
                    )
                    joined_tables[sec_table] = sec_alias
                    joined = True
                    break
            if not joined and relationships:
                for rel in relationships:
                    if rel.source_table == primary_table and rel.target_table == sec_table:
                        builder.join(
                            right_connection_id=sec_conn_id,
                            right_source_name=sec_table,
                            left_col=(primary_alias, rel.source_fields[0]),
                            right_col=(sec_alias, rel.target_fields[0]),
                            join_type=JoinType.INNER,
                            right_alias=sec_alias,
                            is_cross_database=primary_conn_id != sec_conn_id,
                        )
                        joined_tables[sec_table] = sec_alias
                        break

        # Ground Filters across primary and joined tables
        for f in intent.filters:
            f_col = f.column.lower()
            target_alias = None

            # Check primary table first
            if any(fld.name.lower() == f_col for fld in primary_obj.fields):
                target_alias = primary_alias
            else:
                # Check joined tables
                for t_name, t_alias in joined_tables.items():
                    if t_name in table_lookup:
                        _, t_obj = table_lookup[t_name]
                        if any(fld.name.lower() == f_col for fld in t_obj.fields):
                            target_alias = t_alias
                            break

            if target_alias:
                op_str = f.operator.lower()
                op_enum = ComparisonOperator.EQ
                if op_str in ("gt", ">"):
                    op_enum = ComparisonOperator.GT
                elif op_str in ("gte", ">="):
                    op_enum = ComparisonOperator.GTE
                elif op_str in ("lt", "<"):
                    op_enum = ComparisonOperator.LT
                elif op_str in ("lte", "<="):
                    op_enum = ComparisonOperator.LTE
                elif op_str in ("in",):
                    op_enum = ComparisonOperator.IN
                elif op_str in ("contains", "like"):
                    op_enum = ComparisonOperator.CONTAINS
                elif op_str in ("neq", "!="):
                    op_enum = ComparisonOperator.NEQ
                builder.filter(target_alias, f.column, op_enum, f.value)

        # Projections
        projected_any = False
        display_fields = DISPLAY_COLUMNS.get(primary_table, [col.name for col in primary_obj.fields[:5]])
        for fld_name in display_fields:
            if any(col.name == fld_name for col in primary_obj.fields):
                builder.project(primary_alias, fld_name)
                projected_any = True

        if not projected_any:
            for col in primary_obj.fields[:5]:
                builder.project(primary_alias, col.name)

        # Order by
        ordered = False
        for s in intent.order_by:
            if any(col.name == s.column for col in primary_obj.fields):
                direction = SortDirection.DESC if s.direction.lower() == "desc" else SortDirection.ASC
                builder.sort((primary_alias, s.column), direction=direction)
                ordered = True
                break

        if not ordered:
            # Default informative sort
            if any(col.name == "price" for col in primary_obj.fields):
                builder.sort((primary_alias, "price"), direction=SortDirection.DESC)
            elif any(col.name == "total_amount" for col in primary_obj.fields):
                builder.sort((primary_alias, "total_amount"), direction=SortDirection.DESC)
            elif any(col.name == "rating" for col in primary_obj.fields):
                builder.sort((primary_alias, "rating"), direction=SortDirection.DESC)
            elif any(col.name == "ratings_average" for col in primary_obj.fields):
                builder.sort((primary_alias, "ratings_average"), direction=SortDirection.DESC)
            elif any(col.name == "id" for col in primary_obj.fields):
                builder.sort((primary_alias, "id"), direction=SortDirection.ASC)

        limit = intent.ranking_limit if intent.ranking_limit is not None else 20
        builder.limit(min(limit, 100))

        return builder.build()
