# End-to-End User Guide

## Ambiguity-Aware Natural Language Query Engine for Heterogeneous Databases

Welcome to the **Ambiguity-Aware Natural Language Query Engine**. This guide will walk you through setting up, configuring, exploring schemas, issuing natural language queries, resolving ambiguities, and visualizing federated results.

---

### 1. Quickstart & Local Provisioning

#### Step 1: Start Container Infrastructure
Spin up all database services (Application Metadata MongoDB, PostgreSQL target, MongoDB target, and Elasticsearch target):
```bash
docker compose up -d
```

#### Step 2: Seed Demo Heterogeneous Databases
Run the automated idempotent seeding script to populate realistic e-commerce, review, and search datasets:
```bash
make seed
```
This automatically configures:
- **Default Workspace**: `Demo Workspace`
- **Default Admin Account**: `admin@example.com` (password: `Admin123!`)
- **Target Connections**:
  - `PostgreSQL E-Commerce`: `customers`, `products`, `orders`, `order_items`
  - `MongoDB Analytics`: `events`, `reviews`
  - `Elasticsearch Catalog`: `catalog`, `access_logs`
- **Cross-Database Relationships**: Links MongoDB reviews and Elasticsearch search documents to PostgreSQL product records.

#### Step 3: Launch Frontend & Backend
```bash
# In terminal 1 (Backend API):
uvicorn app.main:app --app-dir backend --reload --port 8000

# In terminal 2 (Next.js Frontend):
cd frontend && pnpm dev
```
Navigate your browser to `http://localhost:3000`.

---

### 2. Exploring Database Connections (`/connections`)

1. Open the **Connections** tab from the left sidebar.
2. View all active database connections with real-time health indicators:
   - **PostgreSQL**: Relational storage on port `5432`.
   - **MongoDB**: Document collection storage on port `27018`.
   - **Elasticsearch**: Full-text search cluster on port `9200`.
3. Click **Connect Database** to register a new connection:
   - Provide host, port, database, username, and credentials.
   - Credentials are automatically encrypted at rest using Fernet encryption (`AES-128-CBC` + `HMAC-SHA256`).
4. Click **Test** on any connection card to verify reachability and latency without exposing credentials.

---

### 3. Interactive Schema Canvas (`/schema`)

1. Open the **Schema Explorer** tab from the sidebar.
2. The interactive `@xyflow/react` canvas displays all discovered tables, collections, and indices as visual nodes.
3. Inspect field names, primary keys, foreign keys, and normalized data types (`integer`, `varchar`, `objectId`, `text`).
4. **Define Cross-Database Relationships**:
   - Click **Add Relationship** in the top toolbar.
   - Select the Source Table (e.g. `MongoDB: reviews`) and field (`product_id`).
   - Select the Target Table (e.g. `PostgreSQL: products`) and field (`id`).
   - Choose Cardinality (`many_to_one`) and confirm.
   - The canvas instantly renders a connected edge representing the federated link.

---

### 4. Natural Language Querying & Clarification (`/chat`)

1. Open the **Query Assistant** tab from the sidebar.
2. Ask any natural language question across your heterogeneous databases:
   - *"Show me high-value customers who purchased electronics recently"*
   - *"Which products have top ratings in reviews and high sales in orders?"*
   - *"What is the revenue breakdown by product category?"*

#### The Interactive Clarification Experience
If your query contains vague phrases or missing boundaries, the engine will **never guess** or hallucinate:
- **Vague Predicates**: "high-value" triggers a prompt asking you to choose a monetary threshold (e.g., `>$500`, `>$1,000`, or enter a custom amount).
- **Temporal Ambiguity**: "recently" triggers time window options (`Last 7 days`, `Last 30 days`, `Year to date`).
- **Field Ambiguity**: Competing metrics (e.g. `order total_amount` vs `unit_price`) prompt for your preferred column.

Click your chosen option to confirm. The system checkpoints your conversation state and synthesizes a verified `LogicalQueryPlan`.

---

### 5. Multi-Dialect Code Preview (`View Dialect`)

Before running any query, click **View Dialect** on the assistant message:
- View compiled, optimized target syntax:
  - **PostgreSQL SQL**: `SELECT p.id, p.name, SUM(o.total_amount) ...`
  - **MongoDB MQL Pipeline**: `db.reviews.aggregate([{"$match": ...}, {"$group": ...}])`
  - **Elasticsearch DSL**: `{"query": {"match": {"category": "Electronics"}}}`
- Inspect the cross-database join strategy (`In-Memory Hash Join`).
- Copy raw queries directly to your clipboard.

---

### 6. Executing Queries & Visual Charting

1. Click **Run Query**.
2. The engine executes read-only pushdown queries against the target databases and evaluates in-memory joins.
3. Automatically switches between:
   - **Table View**: Sortable columns, search filter, and CSV/JSON export.
   - **Chart View**: Interactive, responsive SVG visualizations:
     - **Bar Chart**: Ideal for category comparisons and revenue rankings.
     - **Line Chart**: Ideal for time-series trends.
     - **Donut Chart**: Ideal for proportional distributions and percentages.
     - Switch metrics and dimensions dynamically with top selector dropdowns.

---

### 7. Provenance & Explainability Inspector ("How did you get this result?")

Click **How did you get this result?** on any executed result card to open the explainability drawer:
- **Execution Pipeline**: Timeline breakdown showing latency across schema grounding, clarification, optimization, pushdown compilation, and hash join.
- **Grounded Schema**: Full breakdown of tables, collections, and columns referenced.
- **Ambiguity Resolutions**: Log of resolved ambiguous terms and active filter values.
- **Executed Dialects**: The exact syntax dispatched to each target database.
- **Copy Provenance**: Exports a compliance-ready markdown audit report.

---

### 8. Tamper-Evident Audit Ledger (`/audit`)

1. Open the **Audit Trail** tab from the sidebar.
2. View chronological audit events capturing every user action, connection creation, query execution, and export.
3. Filter by action, status (`SUCCESS`, `DENIED`, `FAILED`), or search terms.
4. Click **Verify Chain Integrity**:
   - Audits the cryptographic SHA-256 hash blockchain from genesis to the latest record.
   - Confirms that no audit record has been deleted, modified, or reordered.
5. Click **Export CSV** or **Export JSON** for regulatory compliance archives.
