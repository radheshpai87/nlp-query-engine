# SYSTEM ARCHITECTURE

**Product:** Ambiguity-Aware Natural Language Query Engine for Heterogeneous Databases  
**Architecture Paradigm:** Federated Ambiguity-First Read-Only Hybrid Architecture

```
                    ┌───────────────────────────────────────────────┐
                    │            Enterprise Next.js 14 UI           │
                    │   Landing • Auth • Onboarding • Chat • Schema │
                    └───────────────────────┬───────────────────────┘
                                            │ REST / JSON (JWT Auth)
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │               FastAPI Gateway                 │
                    │     CORS • Rate Limiting • RBAC Checker       │
                    └───────────────────────┬───────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
  │   Semantic Lexicon &    │  │   Interactive Ambiguity │  │   Schema Graph (BFS)    │
  │     Intent Extractor    │  │     Resolution Engine   │  │   Multi-Hop Join Engine │
  └────────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │       Logical Query Plan (IR Builder)         │
                    │  Sources • Multi-Hop Joins • Filters • Proj   │
                    └───────────────────────┬───────────────────────┘
                                            │ Validated Read-Only IR
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │         Native Dialect Generators             │
                    │   PostgreSQL SQL • MongoDB MQL • ES DSL       │
                    └───────────────────────┬───────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
  │   PostgreSQL Adapter    │  │     MongoDB Adapter     │  │  Elasticsearch Adapter  │
  │   (Relational / ACID)   │  │  (Document / Analytics) │  │  (Search & Telemetry)   │
  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │      Federated Execution & Join Engine        │
                    │   In-Memory Merge • Bounded Memory Budget     │
                    └───────────────────────┬───────────────────────┘
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
  ┌─────────────────────────┐                               ┌─────────────────────────┐
  │  Conversational Answer  │                               │ Cryptographic Audit     │
  │  & Provenance Inspector │                               │ Ledger (SHA-256 Chain)  │
  └─────────────────────────┘                               └─────────────────────────┘
```

---

## 1. Core Architectural Principles

1. **Ambiguity-First Execution Workflow:**
   Never guess user intent silently. If a query has underspecified entities (*"a certain customer"*), ambiguous columns, undefined metrics (*"revenue"*), or vague timeframes, the engine pauses and returns a structured clarification card. Execution only proceeds upon explicit user confirmation.

2. **Strict Read-Only Enforcement:**
   Every generated dialect query passes through multi-layer AST and keyword validation blocking all DDL/DML (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `GRANT`, `REVOKE`).

3. **Multi-Hop Schema Graph Traversal:**
   A bidirectional `SchemaGraph` uses Breadth-First Search (BFS) to automatically discover join paths across foreign keys and user-defined cross-database links without requiring manual join specification.

4. **Tamper-Evident SHA-256 Audit Ledger:**
   Every user query, dialect generated, execution metric, and administrative action is appended to an immutable cryptographic hash chain where `hash_n = SHA-256(hash_{n-1} + payload)`.

5. **Polyglot Database Support:**
   - **PostgreSQL 16:** Relational OLTP transactions (`customers`, `orders`, `order_items`, `products`).
   - **MongoDB 7.0:** Document-oriented semi-structured collections (`reviews`, `events`).
   - **Elasticsearch 8.13:** Full-text catalog search and time-series operational logs (`catalog`, `access_logs`).
   - **Metadata Database (MongoDB):** System users, workspaces, membership RBAC, encrypted connection profiles, and conversation threads.
