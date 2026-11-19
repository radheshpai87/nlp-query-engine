import re
from typing import Any

from app.engine.ir.models import ComparisonOperator
from app.models.schema import SchemaField, SchemaObject, SchemaSnapshot

# Canonical semantic synonym mappings
ENTITY_SYNONYMS: dict[str, list[str]] = {
    "customers": [
        "customer", "customers", "user", "users", "client", "clients",
        "buyer", "buyers", "shopper", "shoppers", "account", "accounts",
        "consumer", "consumers", "person", "people", "member", "members",
    ],
    "orders": [
        "order", "orders", "purchase", "purchases", "transaction", "transactions",
        "checkout", "checkouts", "sale", "sales", "bought", "buy", "buying",
    ],
    "order_items": [
        "order_item", "order_items", "order_line", "order_lines",
        "line_item", "line_items", "bought item", "bought items",
        "purchased item", "purchased items",
    ],
    "products": [
        "product", "products", "item", "items", "merchandise", "good", "goods",
        "inventory", "article", "articles", "sku", "skus",
    ],
    "reviews": [
        "review", "reviews", "rating", "ratings", "feedback", "comment", "comments",
        "testimonial", "testimonials", "stars", "star",
    ],
    "catalog": [
        "catalog", "catalogs", "search index", "product catalog", "listings",
    ],
    "access_logs": [
        "access_log", "access_logs", "log", "logs", "traffic", "request", "requests",
        "server hit", "server hits", "web traffic",
    ],
    "events": [
        "event", "events", "telemetry", "clickstream", "user activity",
    ],
}

COLUMN_SYNONYMS: dict[str, list[str]] = {
    "price": ["price", "cost", "unit price", "rate", "expensive", "cheap", "bucks", "dollar", "dollars"],
    "unit_price": ["unit price", "item price", "price per item", "price", "cost"],
    "total_amount": ["total amount", "order total", "total", "amount", "revenue", "spend", "spending"],
    "stock_quantity": ["stock", "quantity", "inventory", "stock quantity", "in stock", "available units"],
    "quantity": ["quantity", "units", "items count", "how many items", "count"],
    "rating": ["rating", "stars", "score", "grade"],
    "country": ["country", "nation", "location", "territory", "geography"],
    "shipping_country": ["shipping country", "ship to", "destination country", "country"],
    "status": ["status", "state", "condition"],
    "created_at": ["created", "registered", "joined", "sign up", "date"],
    "order_date": ["order date", "purchased on", "bought on", "date", "time"],
}


class SemanticLexicon:
    """Discovers semantic matches between natural language phrasing and schema objects/columns."""

    def __init__(self, snapshots: dict[str, SchemaSnapshot]) -> None:
        self.snapshots = snapshots
        self.table_map: dict[str, SchemaObject] = {}
        for snap in snapshots.values():
            for obj in snap.objects:
                self.table_map[obj.name.lower()] = obj

    def resolve_entities(self, query: str) -> list[str]:
        """Detect which tables or collections are semantically referenced in the query."""
        lower_q = query.lower()
        matched_entities: list[str] = []

        # 1. Match against known semantic synonyms
        for canonical, syns in ENTITY_SYNONYMS.items():
            if canonical in self.table_map:
                for syn in syns:
                    if re.search(rf"\b{re.escape(syn)}\b", lower_q):
                        if canonical not in matched_entities:
                            matched_entities.append(canonical)
                        break

        # 2. Match against dynamic introspected table names
        for t_name in self.table_map.keys():
            if t_name not in matched_entities:
                sing = t_name[:-1] if t_name.endswith("s") else t_name
                if re.search(rf"\b{re.escape(t_name)}\b", lower_q) or re.search(rf"\b{re.escape(sing)}\b", lower_q):
                    matched_entities.append(t_name)

        # 3. Contextual inferencing:
        # e.g., "bought" or "purchased" implies orders and order_items
        if any(w in lower_q for w in ("bought", "purchased", "ordered")):
            if "orders" in self.table_map and "orders" not in matched_entities:
                matched_entities.append("orders")
            if "order_items" in self.table_map and "order_items" not in matched_entities:
                matched_entities.append("order_items")

        # e.g., "item" or "product" implies products
        if any(w in lower_q for w in ("item", "items", "product", "products", "merchandise")):
            if "products" in self.table_map and "products" not in matched_entities:
                matched_entities.append("products")

        return matched_entities

    def resolve_predicates(self, query: str, active_tables: list[str]) -> list[dict[str, Any]]:
        """Extract comparison predicates from query and bind them to the correct table/column."""
        lower_q = query.lower()
        predicates: list[dict[str, Any]] = []

        # 1. Numeric comparisons: "less than 100", "under $50", "over 1000", "> 500"
        m_lt = re.search(r"\b(?:less than|under|below|cheaper than|fewer than|<)\s*[\$]?\s*(\d+(?:\.\d+)?)", lower_q)
        if m_lt:
            val = float(m_lt.group(1)) if "." in m_lt.group(1) else int(m_lt.group(1))
            # Determine target column: if query mentions "item" or "bought", prefer unit_price / price
            target_col = "unit_price" if "order_items" in active_tables else ("price" if "products" in active_tables else "total_amount")
            target_tbl = "order_items" if "order_items" in active_tables else ("products" if "products" in active_tables else "orders")
            predicates.append({
                "table": target_tbl,
                "column": target_col,
                "operator": ComparisonOperator.LT,
                "value": val,
            })

        m_gt = re.search(r"\b(?:more than|over|above|greater than|exceeds?|>)\s*[\$]?\s*(\d+(?:\.\d+)?)", lower_q)
        if m_gt:
            val = float(m_gt.group(1)) if "." in m_gt.group(1) else int(m_gt.group(1))
            target_col = "total_amount" if "orders" in active_tables else ("price" if "products" in active_tables else "stock_quantity")
            target_tbl = "orders" if "orders" in active_tables else ("products" if "products" in active_tables else active_tables[0] if active_tables else "orders")
            predicates.append({
                "table": target_tbl,
                "column": target_col,
                "operator": ComparisonOperator.GT,
                "value": val,
            })

        # 2. Rating comparisons: "5-star", "rating 5", "ratings above 4"
        m_rating_eq = re.search(r"\b(5-star|5\s+star|rating\s+5|five\s+star)\b", lower_q)
        if m_rating_eq and "reviews" in active_tables:
            predicates.append({
                "table": "reviews",
                "column": "rating",
                "operator": ComparisonOperator.EQ,
                "value": 5,
            })

        # 3. Status filters: "unpaid", "pending", "completed", "cancelled", "active"
        if re.search(r"\b(unpaid|not\s+paid)\b", lower_q) and "orders" in active_tables:
            predicates.append({
                "table": "orders",
                "column": "status",
                "operator": ComparisonOperator.EQ,
                "value": "pending",
            })
        elif re.search(r"\b(completed|paid)\b", lower_q) and "orders" in active_tables:
            predicates.append({
                "table": "orders",
                "column": "status",
                "operator": ComparisonOperator.EQ,
                "value": "completed",
            })

        # 4. Country filters: "in Germany", "from US", "in UK"
        country_matches = [
            (r"\b(germany|deutschland|\bde\b)\b", "DE"),
            (r"\b(united\s+states|usa|\busa?\b|america)\b", "US"),
            (r"\b(united\s+kingdom|britain|england|\buk\b)\b", "UK"),
            (r"\b(france|\bfr\b)\b", "FR"),
            (r"\b(india|bharat)\b", "IN"),
            (r"\b(canada|\bca\b)\b", "CA"),
        ]
        for pat, code in country_matches:
            if re.search(pat, lower_q):
                tbl = "customers" if "customers" in active_tables else ("orders" if "orders" in active_tables else "customers")
                col = "shipping_country" if tbl == "orders" else "country"
                predicates.append({
                    "table": tbl,
                    "column": col,
                    "operator": ComparisonOperator.EQ,
                    "value": code,
                })
                break

        return predicates
