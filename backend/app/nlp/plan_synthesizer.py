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
from app.engine.schema_graph import SchemaGraph
from app.models.connection import DatabaseConnection
from app.models.schema import SchemaSnapshot, UserDefinedRelationship
from app.nlp.intent_extractor import ExtractedFilter, ExtractedIntent
from app.nlp.semantic_lexicon import SemanticLexicon

def select_display_columns(schema_obj: Any, max_columns: int = 6) -> list[str]:
    """Dynamically select the most informative columns for display across any database schema."""
    field_names = [f.name for f in schema_obj.fields]
    selected: list[str] = []

    # 1. Primary key / Identifier
    pk = next((f.name for f in schema_obj.fields if getattr(f, "is_primary_key", False)), None)
    if pk and pk in field_names:
        selected.append(pk)
    elif "id" in field_names and "id" not in selected:
        selected.append("id")

    # 2. Key descriptive fields
    for desc_cand in ("name", "title", "label", "username", "customer_name", "user_name", "full_name", "category", "email", "status"):
        match = next((fn for fn in field_names if fn.lower() == desc_cand), None)
        if match and match not in selected and len(selected) < max_columns:
            selected.append(match)

    # 3. Key metric / value fields
    for metric_cand in ("rating", "ratings_average", "price", "unit_price", "amount", "total_amount", "revenue", "score", "quantity", "stock_quantity"):
        match = next((fn for fn in field_names if fn.lower() == metric_cand), None)
        if match and match not in selected and len(selected) < max_columns:
            selected.append(match)

    # 4. Fill remaining non-internal fields
    for f in schema_obj.fields:
        if len(selected) >= max_columns:
            break
        if f.name not in selected and not f.name.startswith("_") and f.name.lower() not in ("password", "salt", "token", "hash"):
            selected.append(f.name)

    return selected or [f.name for f in schema_obj.fields[:max_columns]]


def get_table_alias(table_name: str, used_aliases: set[str] | None = None) -> str:
    """Generate clean, unique table alias dynamically."""
    parts = table_name.lower().split("_")
    candidate = "".join(p[0] for p in parts if p) if len(parts) > 1 else table_name[:3].lower()
    if not candidate:
        candidate = "tbl"
    if used_aliases and candidate in used_aliases:
        i = 1
        while f"{candidate}{i}" in used_aliases:
            i += 1
        candidate = f"{candidate}{i}"
    if used_aliases is not None:
        used_aliases.add(candidate)
    return candidate


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

        # 2. Build Schema Graph and Semantic Lexicon for Path A
        schema_graph = SchemaGraph.build(snapshots, relationships)
        lexicon = SemanticLexicon(snapshots)

        # Ground additional semantic entities
        for sem_ent in lexicon.resolve_entities(query):
            if sem_ent in table_lookup and sem_ent not in intent.target_entities:
                intent.target_entities.append(sem_ent)

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
            m_group = re.search(r"\b(?:by|per|each)\s+([a-zA-Z_]\w*)\b", lower_q)
            if m_group:
                cand = m_group.group(1).lower()
                for _t_name, (_c_id, obj) in table_lookup.items():
                    if any(f.name.lower() == cand for f in obj.fields):
                        group_col = cand
                        break

        # Product-level grouping belongs to the dedicated product revenue
        # branch below; running the generic group-by first would aggregate by
        # product_id without ever computing revenue.
        product_level_grouping = (
            group_col in {"id", "product", "products", "product_id"}
            and any(k in lower_q for k in ("product", "products", "item", "items"))
            and any(
                k in lower_q
                for k in ("revenue", "sales", "turnover", "selling", "top", "volume")
            )
        )

        is_agg_group_query = bool(
            re.search(
                r"\b(how\s+many|count|number\s+of|breakdown|distribution|per\s+\w+|each\s+\w+|group\s+by|total\s+\w+\s+by|average\s+\w+\s+by|avg\s+\w+\s+by)\b",
                lower_q,
            )
            or (intent.group_by and not intent.order_by)
        )

        if group_col and is_agg_group_query and not product_level_grouping:
            # 2a. Group by Category
            if group_col == "category" and "products" in table_lookup:
                prod_conn_id, _ = table_lookup["products"]
                builder.from_source(connection_id=prod_conn_id, source_name="products", alias="p")
                builder.group_by("p", "category")
                builder.project("p", "category")

                if any(k in lower_q for k in ("revenue", "sales", "turnover")) and "order_items" in table_lookup:
                    items_conn_id, items_obj = table_lookup["order_items"]
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
                    items_fields = {field.name.lower() for field in items_obj.fields}
                    if {"unit_price", "quantity"}.issubset(items_fields):
                        builder.aggregate(
                            AggregateFunction.SUM,
                            "oi",
                            "unit_price",
                            "revenue",
                            multiplier=("oi", "quantity"),
                        )
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

            # 2e. Universal Dynamic Group By for any arbitrary table and column
            matching_table = None
            for entity in intent.target_entities:
                norm_ent = entity.lower().strip()
                if norm_ent in table_lookup:
                    c_id, obj = table_lookup[norm_ent]
                    if any(f.name.lower() == group_col.lower() for f in obj.fields):
                        matching_table = (c_id, obj.name, obj)
                        break
                elif norm_ent.endswith("s") and norm_ent[:-1] in table_lookup:
                    c_id, obj = table_lookup[norm_ent[:-1]]
                    if any(f.name.lower() == group_col.lower() for f in obj.fields):
                        matching_table = (c_id, obj.name, obj)
                        break
            if not matching_table:
                for _t_name, (c_id, obj) in table_lookup.items():
                    if any(f.name.lower() == group_col.lower() for f in obj.fields):
                        matching_table = (c_id, obj.name, obj)
                        break
            if matching_table:
                c_id, t_name, obj = matching_table
                alias = ALIAS_MAP.get(t_name, t_name[:3])
                builder.from_source(connection_id=c_id, source_name=t_name, alias=alias)
                builder.group_by(alias, group_col)
                builder.project(alias, group_col)
                pk_col = next((f.name for f in obj.fields if f.is_primary_key), obj.fields[0].name)
                builder.aggregate(AggregateFunction.COUNT, alias, pk_col, f"{t_name}_count")
                for fld in obj.fields:
                    f_name = fld.name.lower()
                    if f_name != group_col.lower() and f_name in ("salary", "amount", "total", "price", "revenue", "cost", "quantity"):
                        builder.aggregate(AggregateFunction.AVG, alias, fld.name, f"avg_{fld.name}")
                        break
                builder.sort(f"{t_name}_count", direction=SortDirection.DESC)
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

            items_fields = {field.name.lower() for field in items_obj.fields}
            if {"unit_price", "quantity"}.issubset(items_fields):
                builder.aggregate(
                    AggregateFunction.SUM,
                    "oi",
                    "unit_price",
                    "revenue",
                    multiplier=("oi", "quantity"),
                )
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
        # Pattern 4b: Customer Purchases of Specific Items / Price Thresholds
        # e.g. "I want to know if a certain customer has bought an item less than 100?",
        # "Customers who bought items under 50"
        # --------------------------------------------------------------------
        if (
            ("customer" in lower_q or "customers" in lower_q or "buyer" in lower_q)
            and any(k in lower_q for k in ("bought", "purchased", "ordered", "buy"))
            and any(k in lower_q for k in ("item", "items", "product", "products", "goods", "less than", "under", "below", "cheaper", "<", ">", "more than"))
            and "customers" in table_lookup
            and "orders" in table_lookup
            and "order_items" in table_lookup
            and "products" in table_lookup
        ):
            cust_conn_id, _ = table_lookup["customers"]
            orders_conn_id, _ = table_lookup["orders"]
            oi_conn_id, _ = table_lookup["order_items"]
            prod_conn_id, _ = table_lookup["products"]

            builder.from_source(connection_id=cust_conn_id, source_name="customers", alias="c")
            builder.join(
                right_connection_id=orders_conn_id,
                right_source_name="orders",
                left_col=("c", "id"),
                right_col=("o", "customer_id"),
                join_type=JoinType.INNER,
                right_alias="o",
            )
            builder.join(
                right_connection_id=oi_conn_id,
                right_source_name="order_items",
                left_col=("o", "id"),
                right_col=("oi", "order_id"),
                join_type=JoinType.INNER,
                right_alias="oi",
            )
            builder.join(
                right_connection_id=prod_conn_id,
                right_source_name="products",
                left_col=("oi", "product_id"),
                right_col=("p", "id"),
                join_type=JoinType.INNER,
                right_alias="p",
            )

            # Price comparison on item purchase price
            price_limit_match = re.search(r"\b(?:less than|under|below|cheaper than|fewer than|<)\s*[\$]?\s*(\d+(?:\.\d+)?)", lower_q)
            price_limit_gt = re.search(r"\b(?:more than|over|above|greater than|exceeds?|>)\s*[\$]?\s*(\d+(?:\.\d+)?)", lower_q)
            if price_limit_match:
                val = float(price_limit_match.group(1)) if "." in price_limit_match.group(1) else int(price_limit_match.group(1))
                builder.filter("oi", "unit_price", ComparisonOperator.LT, val)
            elif price_limit_gt:
                val = float(price_limit_gt.group(1)) if "." in price_limit_gt.group(1) else int(price_limit_gt.group(1))
                builder.filter("oi", "unit_price", ComparisonOperator.GT, val)

            # Specific customer filter if resolved in context or directly in query
            cust_id_ctx = context.get("customer_identifier")
            if cust_id_ctx and cust_id_ctx != "all_customers":
                builder.filter("c", "name", ComparisonOperator.EQ, cust_id_ctx)

            builder.project("c", "id")
            builder.project("c", "name")
            builder.project("p", "name", alias="item_name")
            builder.project("oi", "unit_price")
            builder.project("oi", "quantity")
            builder.project("o", "order_date")

            builder.sort(("oi", "unit_price"), direction=SortDirection.ASC)
            builder.limit(intent.ranking_limit or 20)
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
            # Determine target entity from intent, query mentions, or table lookup
            cand: str | None = None
            for ent in intent.target_entities:
                norm_ent = ent.lower().strip()
                if norm_ent in table_lookup:
                    cand = norm_ent
                    break
                elif norm_ent.endswith("s") and norm_ent[:-1] in table_lookup:
                    cand = norm_ent[:-1]
                    break
                elif f"{norm_ent}s" in table_lookup:
                    cand = f"{norm_ent}s"
                    break

            if not cand:
                for tbl in table_lookup:
                    if tbl in lower_q or (tbl.endswith("s") and tbl[:-1] in lower_q):
                        cand = tbl
                        break

            if not cand:
                # Inspect filters/metrics to infer entity
                for f in intent.filters:
                    for tbl, (_cid, obj) in table_lookup.items():
                        if any(fld.name.lower() == f.column.lower() for fld in obj.fields):
                            cand = tbl
                            break
                    if cand:
                        break

            if not cand:
                cand = "products" if "products" in table_lookup else next(iter(table_lookup.keys()), "products")

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
        target_conn_id = context.get("target_database") or context.get("target_connection")
        if not target_conn_id:
            for c_id, conn in connections.items():
                if (conn.database and conn.database.lower() in lower_q) or conn.name.lower() in lower_q:
                    target_conn_id = c_id
                    break
        if not target_conn_id:
            if "analytics_demo" in lower_q or "analytics" in lower_q:
                for c_id, conn in connections.items():
                    if "analytics" in conn.name.lower() or (conn.database and "analytics" in conn.database.lower()):
                        target_conn_id = c_id
                        break
            elif "ecommerce_demo" in lower_q or "ecommerce" in lower_q:
                for c_id, conn in connections.items():
                    if "ecommerce" in conn.name.lower() or (conn.database and "ecommerce" in conn.database.lower()):
                        target_conn_id = c_id
                        break
            elif "catalog" in lower_q:
                for c_id, conn in connections.items():
                    if "catalog" in conn.name.lower() or (conn.database and "catalog" in conn.database.lower()):
                        target_conn_id = c_id
                        break

        candidates: list[tuple[str, str, Any]] = []

        if context.get("target_source") and "::" in str(context["target_source"]):
            req_conn_id, req_table = str(context["target_source"]).split("::", 1)
            for conn_id, snap in snapshots.items():
                if conn_id == req_conn_id:
                    for obj in snap.objects:
                        if obj.name.lower() == req_table.lower():
                            candidates.append((conn_id, obj.name, obj))
                            break

        if not candidates:
            for entity in intent.target_entities:
                normalized = entity.lower().strip()
                if normalized in table_lookup:
                    c_id, s_obj = table_lookup[normalized]
                    if not any(c[1] == s_obj.name for c in candidates):
                        candidates.append((c_id, s_obj.name, s_obj))
                elif normalized.endswith("s") and normalized[:-1] in table_lookup:
                    c_id, s_obj = table_lookup[normalized[:-1]]
                    if not any(c[1] == s_obj.name for c in candidates):
                        candidates.append((c_id, s_obj.name, s_obj))
                elif f"{normalized}s" in table_lookup:
                    c_id, s_obj = table_lookup[f"{normalized}s"]
                    if not any(c[1] == s_obj.name for c in candidates):
                        candidates.append((c_id, s_obj.name, s_obj))

        for tbl_name, (c_id, s_obj) in table_lookup.items():
            if (tbl_name in lower_q or (tbl_name.endswith("s") and tbl_name[:-1] in lower_q)) and not any(c[1] == s_obj.name for c in candidates):
                candidates.append((c_id, s_obj.name, s_obj))

        for f in intent.filters:
            for tbl_name, (c_id, s_obj) in table_lookup.items():
                if any(fld.name.lower() == f.column.lower() for fld in s_obj.fields) and not any(c[1] == s_obj.name for c in candidates):
                    candidates.append((c_id, s_obj.name, s_obj))

        for m_col in intent.metrics:
            for tbl_name, (c_id, s_obj) in table_lookup.items():
                if any(fld.name.lower() == m_col.lower() for fld in s_obj.fields) and not any(c[1] == s_obj.name for c in candidates):
                    candidates.append((c_id, s_obj.name, s_obj))

        for s_order in intent.order_by:
            for tbl_name, (c_id, s_obj) in table_lookup.items():
                if any(fld.name.lower() == s_order.column.lower() for fld in s_obj.fields) and not any(c[1] == s_obj.name for c in candidates):
                    candidates.append((c_id, s_obj.name, s_obj))

        if not candidates:
            first_tbl = next(iter(table_lookup.keys()), None)
            if first_tbl:
                c_id, s_obj = table_lookup[first_tbl]
                candidates.append((c_id, s_obj.name, s_obj))
            else:
                available = ", ".join(table_lookup.keys()) if table_lookup else "None"
                raise AppError(
                    f"No database tables or collections matched your query '{query}'. "
                    f"Available entities in your workspace: {available}."
                )

        def score_candidate(cand: tuple[str, str, Any]) -> float:
            c_id, s_name, s_obj = cand
            score = 0.0
            field_names = {f.name.lower() for f in s_obj.fields}

            # 1. Target connection priority
            if target_conn_id and c_id == target_conn_id:
                score += 250.0

            # 2. Sort column presence (crucial for 'least rating', 'cheapest price', etc.)
            for s in intent.order_by:
                if s.column.lower() in field_names:
                    score += 160.0

            # 3. Metric presence
            for m in intent.metrics:
                if m.lower() in field_names:
                    score += 90.0

            # 4. Filter columns
            for f in intent.filters:
                if f.column.lower() in field_names:
                    score += 50.0

            # 5. Entity name match in query
            if s_name.lower() in lower_q:
                score += 40.0
            elif s_name.lower().rstrip("s") in lower_q:
                score += 30.0

            # 6. Person / user presence match
            if any(p in lower_q for p in ("person", "who", "user", "customer")):
                if any(f in field_names for f in ("customer_name", "user_name", "name", "author")):
                    score += 70.0

            return score

        # If the caller explicitly specified multiple real tables in intent.target_entities (e.g. in multi-table join tests),
        # respect that explicit entity order as the join sequence
        if (
            len(intent.target_entities) > 1
            and all(e.lower() in table_lookup for e in intent.target_entities)
            and not target_conn_id
        ):
            chosen_sources = [
                (table_lookup[e.lower()][0], table_lookup[e.lower()][1].name, table_lookup[e.lower()][1])
                for e in intent.target_entities
            ]
        else:
            candidates.sort(key=score_candidate, reverse=True)
            chosen_sources = candidates

        primary_conn_id, primary_table, primary_obj = chosen_sources[0]
        primary_alias = ALIAS_MAP.get(primary_table, primary_table[:3])
        builder.from_source(connection_id=primary_conn_id, source_name=primary_table, alias=primary_alias)

        joined_tables: dict[str, str] = {primary_table: primary_alias}

        # Table Sufficiency Check:
        # Check if primary table already satisfies the query. If so, do not add multi-table joins.
        explicit_join_requested = bool(
            re.search(r"\b(join|joined|with\s+(?:their|all)|and\s+(?:their|all)|across\s+both|combined)\b", lower_q)
        )
        primary_fields = {f.name.lower() for f in primary_obj.fields}
        has_sort = not intent.order_by or any(s.column.lower() in primary_fields for s in intent.order_by)
        has_filters = all(f.column.lower() in primary_fields for f in intent.filters)
        is_person_satisfied = True
        if any(p in lower_q for p in ("person", "who", "user", "customer")):
            is_person_satisfied = any(f in primary_fields for f in ("customer_name", "user_name", "name", "author"))

        is_primary_sufficient = has_sort and has_filters and is_person_satisfied and not explicit_join_requested

        sec_targets: list[str] = []
        if not is_primary_sufficient:
            sec_targets = [s_name for _, s_name, _ in chosen_sources[1:]]
            for sem_ent in lexicon.resolve_entities(query):
                if sem_ent in table_lookup and sem_ent not in sec_targets and sem_ent != primary_table:
                    if sem_ent == "customers" and is_person_satisfied:
                        continue
                    sec_targets.append(sem_ent)

        graph_edges = schema_graph.find_multi_entity_join_tree(primary_table, sec_targets) if sec_targets else []

        for edge in graph_edges:
            sec_table = edge.target_table
            sec_norm = sec_table.lower()
            if sec_table in joined_tables or sec_norm in joined_tables:
                continue

            if sec_norm not in table_lookup:
                continue
            sec_conn_id, sec_obj = table_lookup[sec_norm]
            sec_alias = ALIAS_MAP.get(sec_norm, sec_norm[:3])

            src_norm = edge.source_table.lower()
            src_alias = joined_tables.get(
                edge.source_table,
                joined_tables.get(src_norm, ALIAS_MAP.get(src_norm, src_norm[:3])),
            )

            builder.join(
                right_connection_id=sec_conn_id,
                right_source_name=sec_table,
                left_col=(src_alias, edge.source_column),
                right_col=(sec_alias, edge.target_column),
                join_type=edge.join_type,
                right_alias=sec_alias,
                is_cross_database=edge.is_cross_database,
            )
            joined_tables[sec_table] = sec_alias
            joined_tables[sec_norm] = sec_alias

        # Ground Filters across primary and joined tables
        lexicon_preds = lexicon.resolve_predicates(query, list(joined_tables.keys()))
        for lp in lexicon_preds:
            if not any(f.column.lower() == lp["column"].lower() for f in intent.filters):
                intent.filters.append(
                    ExtractedFilter(
                        column=lp["column"],
                        operator=lp["operator"].value.upper(),
                        value=lp["value"],
                    )
                )

        for f in intent.filters:
            f_col = f.column.lower()
            target_alias = None

            # Check primary table first
            if any(fld.name.lower() == f_col for fld in primary_obj.fields):
                target_alias = primary_alias
            else:
                # Check joined tables
                for t_name, t_alias in joined_tables.items():
                    if t_name.lower() in table_lookup:
                        _, t_obj = table_lookup[t_name.lower()]
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
        display_fields = select_display_columns(primary_obj)
        for fld_name in display_fields:
            if any(col.name == fld_name for col in primary_obj.fields):
                builder.project(primary_alias, fld_name)
                projected_any = True

        if not projected_any:
            for col in primary_obj.fields[:5]:
                builder.project(primary_alias, col.name)

        # Project key contextual fields from joined tables
        for t_name, t_alias in joined_tables.items():
            if t_alias == primary_alias or t_name.lower() not in table_lookup:
                continue
            _, t_obj = table_lookup[t_name.lower()]
            t_fld_names = {f.name.lower(): f.name for f in t_obj.fields}
            if t_name.lower() in ("products", "items"):
                if "name" in t_fld_names:
                    builder.project(t_alias, t_fld_names["name"], alias="item_name")
            elif t_name.lower() == "order_items":
                if "unit_price" in t_fld_names:
                    builder.project(t_alias, t_fld_names["unit_price"])
                if "quantity" in t_fld_names:
                    builder.project(t_alias, t_fld_names["quantity"])
            elif t_name.lower() == "orders":
                if "order_date" in t_fld_names:
                    builder.project(t_alias, t_fld_names["order_date"])

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
