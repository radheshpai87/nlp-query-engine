"""Domain guardrail to prevent non-database and off-topic queries from calling LLM providers.

Ensures Nexus Query remains strictly scoped to connected databases (PostgreSQL, MongoDB, Elasticsearch).
Completely avoids token consumption and external LLM API calls for off-topic, general knowledge,
creative writing, programming advice, or conversational chit-chat queries.
"""

from enum import Enum
import re
from typing import Any

from pydantic import BaseModel

from app.models.connection import DatabaseConnection
from app.models.schema import SchemaSnapshot
from app.nlp.semantic_lexicon import COLUMN_SYNONYMS, ENTITY_SYNONYMS


class DomainQueryCategory(str, Enum):
    VALID_DATABASE_QUERY = "valid_database_query"
    METADATA = "metadata"
    GREETING = "greeting"
    UNSAFE_MUTATION = "unsafe_mutation"
    OUT_OF_DOMAIN = "out_of_domain"


class DomainCheckResult(BaseModel):
    category: DomainQueryCategory
    is_allowed: bool
    direct_response: str | None = None
    reason: str | None = None


# Analytical & query action terms indicative of data queries
QUERY_ACTION_TERMS = {
    "select", "find", "show", "get", "list", "fetch", "display", "retrieve",
    "calculate", "compute", "search", "lookup", "return", "filter", "query",
    "aggregate", "compare", "breakdown", "summarize",
}

# Metric & aggregation terms
METRIC_TERMS = {
    "count", "sum", "total", "average", "avg", "mean", "min", "minimum",
    "max", "maximum", "top", "bottom", "highest", "lowest", "most", "least",
    "revenue", "cost", "spend", "spending", "price", "profit", "rate", "margin",
    "percentage", "percent", "volume", "amount", "sales", "earnings",
}

# Structural database terms
DATABASE_STRUCTURAL_TERMS = {
    "table", "tables", "column", "columns", "field", "fields", "collection",
    "collections", "index", "indices", "record", "records", "row", "rows",
    "document", "documents", "database", "databases", "schema", "schemas",
    "join", "joins", "group by", "order by", "where", "having", "limit",
    "primary key", "foreign key", "relation", "relations", "relationship",
    "data", "dataset", "datasets", "analytics_demo", "ecommerce_demo", "healthcare_demo",
    "postgres", "postgresql", "mongo", "mongodb", "elastic", "elasticsearch",
}

# Common data filtering conditions
DATA_CONDITION_TERMS = {
    "status", "active", "pending", "completed", "cancelled", "approved",
    "rejected", "created", "created_at", "updated", "updated_at", "date",
    "timestamp", "month", "year", "quarter", "today", "yesterday", "recently",
    "between", "greater", "less", "above", "below", "exceeding", "null", "empty",
}

# Explicit regexes for general knowledge, trivia, creative writing, advice
OFF_TOPIC_REGEXES = [
    # General trivia & world facts
    r"\b(capital\s+of|weather\s+in|temperature\s+in|forecast\s+for)\b",
    r"\bwho\s+(is|was)\b(?!.*\b(customer|user|buyer|seller|patient|doctor|employee|client|person|account)\b)",
    r"\b(president\s+of|prime\s+minister\s+of|king\s+of|queen\s+of|governor\s+of)\b",
    r"\bwhere\s+is\b(?!.*\b(table|column|field|database|schema|record|data|row)\b)",
    r"\b(how\s+old\s+is|when\s+was\s+\w+\s+born|when\s+did\s+\w+\s+die)\b",
    r"\b(distance\s+(to|between)|how\s+far\s+is)\b",
    r"\b(population\s+of|currency\s+of|national\s+animal|national\s+bird)\b",
    r"\b(meaning\s+of\s+life|quantum\s+physics|theory\s+of\s+relativity|photosynthesis|black\s+hole)\b",
    r"\bwho\s+won\s+(the\s+)?(super\s*bowl|world\s*cup|olympics|champions\s+league|nba|ipl|election)\b",
    
    # Creative writing & media generation
    r"\bwrite\s+(a\s+)?(poem|story|song|essay|haiku|joke|article|blog|tweet|speech|script|rap|letter)\b",
    r"\btell\s+me\s+a\s+(joke|riddle|story|secret|fun\s+fact|quote|parable)\b",
    r"\b(sing\s+a\s+song|lyrics\s+of|compose\s+a)\b",
    r"\btranslate\s+(this|the\s+following|to\s+\w+|into\s+\w+)\b",
    
    # Non-database general programming & computer science homework
    r"\bwrite\s+a\s+(python|javascript|typescript|c\+\+|java|rust|go|c#|html|css)\s+(function|script|program|code|class|component)\b(?!.*\b(sql|mongo|elastic|query|database)\b)",
    r"\b(solve\s+(two\s+sum|leetcode|fizzbuzz)|invert\s+a\s+binary\s+tree|reverse\s+a\s+linked\s+list)\b",
    r"\b(how\s+do\s+i\s+install|dockerfile\s+for|setup\s+webpack)\b",

    # Personal, lifestyle, culinary, medical
    r"\b(recipe\s+(for|to)|how\s+to\s+cook|how\s+to\s+bake|how\s+to\s+make\s+(pasta|pizza|cake|bread|cookies|soup|coffee))\b",
    r"\b(symptoms\s+of|cure\s+for|medicine\s+for|treatment\s+for|diagnose\s+me|medical\s+advice)\b",
    r"\b(what\s+should\s+i\s+wear|travel\s+tips|best\s+places\s+to\s+visit\s+in)\b",
    r"\b(how\s+to\s+fix\s+a\s+(car|tire|engine|sink|faucet|computer|phone))\b",
    r"\b(workout\s+routine|diet\s+plan|lose\s+weight|gain\s+muscle)\b",
    
    # Conversational small talk & bot philosophy
    r"\b(are\s+you\s+(sentient|conscious|alive|real|human)|do\s+you\s+have\s+feelings|do\s+you\s+love\s+me)\b",
    r"\b(what\s+do\s+you\s+think\s+about\s+(ai|humans|politics|life)|tell\s+me\s+something\s+interesting)\b",
    r"^(how\s+are\s+you(\s+doing)?|how's\s+it\s+going|how\s+is\s+your\s+day)\??$",
]

# Greetings and capability questions that should get an instant deterministic introduction
GREETING_PATTERNS = [
    r"^(hi(\s+there)?|hello(\s+there)?|hey(\s+there)?|greetings|good\s+morning|good\s+afternoon|good\s+evening|yo|sup|howdy)[\s!.]*$",
    r"^(who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|what\s+is\s+nexus\s+query|how\s+does\s+this\s+work|help)[\s?!.]*$",
    r"^(what\s+questions\s+can\s+i\s+ask|how\s+to\s+use\s+this|what\s+can\s+i\s+query)[\s?!.]*$",
]

# Mutating & destructive statement patterns
MUTATION_PATTERNS = [
    r"\b(drop\s+(table|database|index|collection)|delete\s+from|truncate\s+(table)?|insert\s+into|update\s+\w+\s+set|alter\s+table|grant\s+|revoke\s+)\b",
    r"^\s*(drop|delete|truncate|insert|update|alter)\b",
]

# Metadata query patterns
METADATA_PATTERNS = [
    r"\b(how\s+many|count\s+of|number\s+of|total)\s+(?:tables?|collections?|indices|databases?)\b",
    r"\b(what|which|show|list|tell\s+me|display|get)\s+(?:all\s+)?(?:tables?|collections?|indices|databases?|connections?|schema)\b",
    r"\b(?:tables?|collections?|indices|databases?)\s+(?:are\s+)?(?:present|available|exist|connected)\b",
    r"\bschema\s+(?:of|for|in)\b",
    r"\bhow\s+much\s+data\b",
    r"\b(data|database)\s+(breakdown|stats|summary|size|volume)\b",
    r"\bhow\s+many\s+records\b",
]


class DomainGuard:
    """Deterministic guardrail service to enforce domain boundary before any LLM invocation."""

    @classmethod
    def check_query(
        cls,
        query: str,
        connections: dict[str, DatabaseConnection] | None = None,
        snapshots: dict[str, SchemaSnapshot] | None = None,
    ) -> DomainCheckResult:
        """Evaluate whether a query pertains to the database and can proceed to LLM planning.

        Returns DomainCheckResult with category and direct response.
        If is_allowed is False, the query MUST NOT invoke any LLM provider.
        """
        clean_query = query.strip()
        lower_query = clean_query.lower()

        if not clean_query:
            return DomainCheckResult(
                category=DomainQueryCategory.OUT_OF_DOMAIN,
                is_allowed=False,
                direct_response="Please enter a natural language query or question about your connected databases.",
                reason="empty_query",
            )

        # 1. Check Unsafe / Destructive Operations
        for pat in MUTATION_PATTERNS:
            if re.search(pat, lower_query):
                return DomainCheckResult(
                    category=DomainQueryCategory.UNSAFE_MUTATION,
                    is_allowed=False,
                    direct_response=(
                        "⚠️ **Operation Blocked by Read-Only Guard Rails**\n\n"
                        "Nexus Query strictly enforces read-only analytical queries (`SELECT` and `AGGREGATE`). "
                        "Mutating, updating, or destructive database operations are disallowed to protect your data."
                    ),
                    reason="unsafe_mutation",
                )

        # 2. Check Greetings & Help Questions (Instant Zero-Token Response)
        for pat in GREETING_PATTERNS:
            if re.search(pat, lower_query):
                return DomainCheckResult(
                    category=DomainQueryCategory.GREETING,
                    is_allowed=False,
                    direct_response=(
                        "👋 **Hello! I am Nexus Query**, your natural language data analytics engine.\n\n"
                        "I am connected directly to your databases (PostgreSQL, MongoDB, and Elasticsearch) "
                        "to help you explore and analyze data using ordinary language.\n\n"
                        "💡 **What you can ask me:**\n"
                        "- *'Show top 5 products by revenue'*\n"
                        "- *'How many customers registered in the last 30 days?'*\n"
                        "- *'List all tables and collections across my databases'*\n"
                        "- *'Find orders with status pending and order total > 100'*\n\n"
                        "Ask any question about your connected data to get started!"
                    ),
                    reason="greeting",
                )

        # 3. Check Explicit Off-Topic Patterns (Trivia, General Knowledge, Creative Writing, Advice)
        for pat in OFF_TOPIC_REGEXES:
            if re.search(pat, lower_query):
                return DomainCheckResult(
                    category=DomainQueryCategory.OUT_OF_DOMAIN,
                    is_allowed=False,
                    direct_response=(
                        "🛡️ **Query Out of Scope**: Nexus Query is strictly scoped to querying your connected "
                        "databases (PostgreSQL, MongoDB, and Elasticsearch). I cannot answer general knowledge, "
                        "open-ended conversational questions, or requests unrelated to your data.\n\n"
                        "💡 **You can ask me questions about your data, such as:**\n"
                        "- *'Show top 5 products by revenue'*\n"
                        "- *'How many customers registered this month?'*\n"
                        "- *'List all tables across connected databases'*\n"
                        "- *'Find orders with status pending'*"
                    ),
                    reason="off_topic_regex",
                )

        # 4. Check Metadata / Database Structure Queries
        for pat in METADATA_PATTERNS:
            if re.search(pat, lower_query):
                return DomainCheckResult(
                    category=DomainQueryCategory.METADATA,
                    is_allowed=False,  # Handled deterministically by metadata service, no LLM required
                    reason="metadata_query",
                )

        # 5. Extract Dynamic Schema Entities (Tables, Columns, Database Names)
        known_entities: set[str] = set()
        known_fields: set[str] = set()

        if connections:
            for conn in connections.values():
                if conn.name:
                    known_entities.add(conn.name.lower())
                if conn.database:
                    known_entities.add(conn.database.lower())

        if snapshots:
            for snap in snapshots.values():
                for obj in snap.objects:
                    t_name = obj.name.lower()
                    known_entities.add(t_name)
                    # Add singular form if table ends with 's'
                    if t_name.endswith("s") and len(t_name) > 3:
                        known_entities.add(t_name[:-1])
                    for field in obj.fields:
                        f_name = field.name.lower()
                        known_fields.add(f_name)

        # Add synonyms from semantic lexicon
        for canonical, syns in ENTITY_SYNONYMS.items():
            for syn in syns:
                known_entities.add(syn.lower())

        for canonical_col, col_syns in COLUMN_SYNONYMS.items():
            for csyn in col_syns:
                known_fields.add(csyn.lower())

        # Check token overlaps with schema entities or columns
        # Split query into words/tokens
        tokens = set(re.findall(r"\b[a-zA-Z0-9_-]+\b", lower_query))

        has_schema_entity_match = bool(tokens & known_entities)
        has_field_match = bool(tokens & known_fields)
        has_query_action = bool(tokens & QUERY_ACTION_TERMS)
        has_metric_term = bool(tokens & METRIC_TERMS)
        has_database_term = bool(tokens & DATABASE_STRUCTURAL_TERMS)
        has_condition_term = bool(tokens & DATA_CONDITION_TERMS)

        # Check multi-word phrase matching in query
        if not has_schema_entity_match:
            for ent in known_entities:
                if " " in ent and ent in lower_query:
                    has_schema_entity_match = True
                    break

        if not has_field_match:
            for fld in known_fields:
                if " " in fld and fld in lower_query:
                    has_field_match = True
                    break

        # A valid database query must have:
        # (Schema entity match OR Structural database term)
        # OR
        # (Query action term AND (Metric term OR Condition term))
        # OR
        # (Metric term AND (Schema entity match OR Field match OR Database term))
        is_database_related = (
            has_schema_entity_match
            or has_database_term
            or (has_query_action and (has_metric_term or has_condition_term or has_field_match))
            or (has_metric_term and (has_field_match or has_condition_term))
        )

        if not is_database_related:
            # Query has no connection to databases, data structures, or analytics
            return DomainCheckResult(
                category=DomainQueryCategory.OUT_OF_DOMAIN,
                is_allowed=False,
                direct_response=(
                    "🛡️ **Query Out of Scope**: Nexus Query is strictly scoped to querying your connected "
                    "databases (PostgreSQL, MongoDB, and Elasticsearch).\n\n"
                    "Your question does not appear to relate to any connected table, collection, or database entity. "
                    "Please ask a question about your database records, schemas, or analytical metrics."
                ),
                reason="no_database_relevance",
            )

        # If it passed all guards, it is a valid database query
        return DomainCheckResult(
            category=DomainQueryCategory.VALID_DATABASE_QUERY,
            is_allowed=True,
            reason="valid_database_query",
        )
