"""Multi-Database Seeding & Orchestration Script.

Seeds heterogeneous demo databases:
1. PostgreSQL (ecommerce_demo: customers, products, orders, order_items)
2. MongoDB target (analytics_demo: events, reviews)
3. Elasticsearch target (catalog, access_logs)
4. Application Metadata MongoDB (nlp_query_engine_meta: default workspace, demo admin user,
   encrypted connections, schema snapshots, and cross-database relationships)
"""

import argparse
import logging
import os
import sys
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

from pymongo import MongoClient

# Ensure app package is in Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.adapters.factory import create_adapter
from app.core.auth import hash_password
from app.core.config import get_settings
from app.core.security import encrypt_secret
from app.models.connection import ConnectionStatus, DatabaseConnection, DatabaseType
from app.models.schema import Cardinality, RelationshipProvenance, UserDefinedRelationship
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMembership, WorkspaceRole

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_demo_databases")


# -----------------------------------------------------------------------------
# 1. PostgreSQL E-Commerce Seeding
# -----------------------------------------------------------------------------
def seed_postgres(uri: str | None = None) -> bool:
    """Connect to PostgreSQL and seed tables and sample records."""
    import psycopg

    pg_uri = (
        uri
        or os.getenv(
            "DEMO_POSTGRES_URI",
            "postgresql://postgres:postgrespassword@localhost:5432/ecommerce_demo",
        )
        or "postgresql://postgres:postgrespassword@localhost:5432/ecommerce_demo"
    )

    logger.info("Seeding PostgreSQL target database: %s", pg_uri.split("@")[-1])
    try:
        with psycopg.connect(pg_uri, autocommit=True) as conn:
            with conn.cursor() as cur:
                # Schema creation
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS customers (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        country VARCHAR(50) NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'active',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS products (
                        id SERIAL PRIMARY KEY,
                        sku VARCHAR(50) UNIQUE NOT NULL,
                        name VARCHAR(150) NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        price NUMERIC(10, 2) NOT NULL,
                        stock_quantity INTEGER NOT NULL DEFAULT 0,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS orders (
                        id SERIAL PRIMARY KEY,
                        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                        order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        status VARCHAR(30) NOT NULL DEFAULT 'completed',
                        total_amount NUMERIC(10, 2) NOT NULL,
                        shipping_country VARCHAR(50) NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS order_items (
                        id SERIAL PRIMARY KEY,
                        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                        product_id INTEGER REFERENCES products(id) ON DELETE RESTRICT,
                        quantity INTEGER NOT NULL,
                        unit_price NUMERIC(10, 2) NOT NULL
                    );

                    CREATE INDEX IF NOT EXISTS idx_customers_country ON customers(country);
                    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
                    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
                    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
                    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
                """)

                # Clear existing sample data for a fresh, clean voluminous load
                cur.execute("TRUNCATE TABLE order_items, orders, products, customers RESTART IDENTITY CASCADE;")

                # 1. 50 Customers
                customers_data = [
                    (1, "Alice Smith", "alice.smith@example.com", "US", "active", "2024-01-15 08:30:00+00"),
                    (2, "Bob Jones", "bob.jones@example.com", "CA", "active", "2024-02-10 11:20:00+00"),
                    (3, "Charlie Brown", "charlie.b@example.com", "UK", "inactive", "2024-03-05 14:15:00+00"),
                    (4, "Diana Prince", "diana.p@example.com", "US", "active", "2024-03-22 09:45:00+00"),
                    (5, "Evan Wright", "evan.w@example.com", "DE", "active", "2024-04-12 16:00:00+00"),
                    (6, "Fiona Gallagher", "fiona.g@example.com", "FR", "active", "2024-05-01 10:30:00+00"),
                    (7, "George Clark", "george.c@example.com", "US", "suspended", "2024-06-18 13:50:00+00"),
                    (8, "Hannah Abbott", "hannah.a@example.com", "AU", "active", "2024-07-04 15:10:00+00"),
                    (9, "Ian Malcolm", "ian.m@example.com", "CA", "active", "2024-08-19 12:00:00+00"),
                    (10, "Julia Roberts", "julia.r@example.com", "US", "active", "2024-09-02 17:25:00+00"),
                    (11, "Kenji Sato", "kenji.sato@example.jp", "JP", "active", "2024-09-15 03:00:00+00"),
                    (12, "Lars Lindholm", "lars.l@example.se", "SE", "active", "2024-10-01 08:00:00+00"),
                    (13, "Maria Garcia", "maria.g@example.es", "ES", "active", "2024-10-14 14:20:00+00"),
                    (14, "Noah Taylor", "noah.t@example.com", "US", "active", "2024-11-05 10:10:00+00"),
                    (15, "Olivia Wilson", "olivia.w@example.com", "UK", "active", "2024-11-20 18:30:00+00"),
                    (16, "Priya Sharma", "priya.s@example.in", "IN", "active", "2024-12-01 05:40:00+00"),
                    (17, "Quinn Adams", "quinn.a@example.com", "US", "active", "2024-12-15 21:00:00+00"),
                    (18, "Rafael Silva", "rafael.s@example.br", "BR", "active", "2025-01-02 13:15:00+00"),
                    (19, "Sophie Martin", "sophie.m@example.fr", "FR", "active", "2025-01-18 09:50:00+00"),
                    (20, "Thomas Mueller", "thomas.m@example.de", "DE", "active", "2025-02-04 16:35:00+00"),
                    (21, "Uma Patel", "uma.patel@example.in", "IN", "active", "2025-02-14 06:10:00+00"),
                    (22, "Victor Hugo", "victor.h@example.fr", "FR", "inactive", "2025-02-28 11:45:00+00"),
                    (23, "Wendy Chen", "wendy.c@example.sg", "SG", "active", "2025-03-10 02:30:00+00"),
                    (24, "Xavier Roux", "xavier.r@example.fr", "FR", "active", "2025-03-25 15:20:00+00"),
                    (25, "Yuki Tanaka", "yuki.t@example.jp", "JP", "active", "2025-04-05 04:00:00+00"),
                    (26, "Zack Snyder", "zack.s@example.com", "US", "active", "2025-04-18 19:10:00+00"),
                    (27, "Aaron Rodgers", "aaron.r@example.com", "US", "active", "2025-05-02 12:00:00+00"),
                    (28, "Bella Swan", "bella.s@example.ca", "CA", "active", "2025-05-15 17:40:00+00"),
                    (29, "Connor MacLeod", "connor.m@example.uk", "UK", "active", "2025-06-01 10:15:00+00"),
                    (30, "Daisy Ridley", "daisy.r@example.uk", "UK", "active", "2025-06-12 14:50:00+00"),
                    (31, "Elena Rostova", "elena.r@example.de", "DE", "active", "2025-06-25 08:30:00+00"),
                    (32, "Frank Castle", "frank.c@example.com", "US", "suspended", "2025-07-04 22:00:00+00"),
                    (33, "Grace Hopper", "grace.h@example.com", "US", "active", "2025-07-16 11:20:00+00"),
                    (34, "Henry Cavill", "henry.c@example.uk", "UK", "active", "2025-08-01 13:00:00+00"),
                    (35, "Iris West", "iris.w@example.com", "US", "active", "2025-08-14 16:15:00+00"),
                    (36, "Jack Sparrow", "jack.s@example.au", "AU", "inactive", "2025-08-28 07:45:00+00"),
                    (37, "Kara Danvers", "kara.d@example.com", "US", "active", "2025-09-08 10:30:00+00"),
                    (38, "Leo Messi", "leo.m@example.es", "ES", "active", "2025-09-21 18:00:00+00"),
                    (39, "Mia Khalifa", "mia.k@example.lb", "LB", "active", "2025-10-05 12:40:00+00"),
                    (40, "Nathan Drake", "nathan.d@example.com", "US", "active", "2025-10-18 15:55:00+00"),
                    (41, "Oscar Isaac", "oscar.i@example.com", "US", "active", "2025-11-01 09:25:00+00"),
                    (42, "Peter Parker", "peter.p@example.com", "US", "active", "2025-11-14 14:10:00+00"),
                    (43, "Queen Latifah", "queen.l@example.com", "US", "active", "2025-11-28 20:30:00+00"),
                    (44, "Ron Weasley", "ron.w@example.uk", "UK", "active", "2025-12-10 11:00:00+00"),
                    (45, "Sarah Connor", "sarah.c@example.com", "US", "active", "2025-12-22 17:15:00+00"),
                    (46, "Tony Stark", "tony.stark@example.com", "US", "active", "2026-01-05 13:45:00+00"),
                    (47, "Ursula Corbero", "ursula.c@example.es", "ES", "active", "2026-01-19 16:20:00+00"),
                    (48, "Vito Corleone", "vito.c@example.it", "IT", "inactive", "2026-02-01 10:00:00+00"),
                    (49, "Wanda Maximoff", "wanda.m@example.com", "US", "active", "2026-02-14 18:30:00+00"),
                    (50, "Yoda Master", "yoda@example.org", "US", "active", "2026-03-01 00:00:00+00"),
                ]
                cur.executemany(
                    "INSERT INTO customers (id, name, email, country, status, created_at) VALUES (%s, %s, %s, %s, %s, %s);",
                    customers_data,
                )

                # 2. 30 Products
                products_data = [
                    (1, "TECH-LAP-001", "UltraBook Pro 15", "Electronics", 1299.99, 45, "2024-01-01 00:00:00+00"),
                    (2, "TECH-PHN-002", "SmartPhone Prime X", "Electronics", 899.50, 120, "2024-01-05 00:00:00+00"),
                    (3, "TECH-AUD-003", "Noise-Canceling Headphones", "Audio", 249.00, 80, "2024-01-10 00:00:00+00"),
                    (4, "HOME-COF-004", "Espresso Artisan Machine", "Kitchen", 549.00, 30, "2024-01-15 00:00:00+00"),
                    (5, "HOME-VAC-005", "Robotic Vacuum Robot 3000", "Appliances", 399.99, 60, "2024-02-01 00:00:00+00"),
                    (6, "APP-JKT-006", "All-Weather Mountain Jacket", "Apparel", 189.95, 150, "2024-02-15 00:00:00+00"),
                    (7, "APP-SHO-007", "Running Trail Shoes", "Apparel", 129.50, 95, "2024-03-01 00:00:00+00"),
                    (8, "FIT-WAT-008", "Smart Fitness Tracker", "Wearables", 149.00, 210, "2024-03-10 00:00:00+00"),
                    (9, "OFF-CHR-009", "Ergonomic Desk Chair", "Furniture", 329.00, 40, "2024-04-01 00:00:00+00"),
                    (10, "OFF-DSK-010", "Electric Standing Desk", "Furniture", 499.00, 25, "2024-04-15 00:00:00+00"),
                    (11, "TECH-MON-011", "UltraWide 4K Gaming Monitor 34-inch", "Electronics", 799.00, 35, "2024-05-01 00:00:00+00"),
                    (12, "TECH-KEY-012", "Mechanical Wireless Keyboard RGB", "Electronics", 119.99, 140, "2024-05-10 00:00:00+00"),
                    (13, "TECH-MOU-013", "Precision Ergonomic Wireless Mouse", "Electronics", 69.50, 180, "2024-05-20 00:00:00+00"),
                    (14, "AUD-SPK-014", "Waterproof Bluetooth Outdoor Speaker", "Audio", 89.00, 110, "2024-06-01 00:00:00+00"),
                    (15, "AUD-MIC-015", "Studio USB Condenser Microphone", "Audio", 139.00, 65, "2024-06-15 00:00:00+00"),
                    (16, "KIT-BLN-016", "High-Speed Vortex Kitchen Blender", "Kitchen", 159.00, 50, "2024-07-01 00:00:00+00"),
                    (17, "KIT-AIR-017", "Digital Dual-Basket Air Fryer XL", "Kitchen", 179.99, 75, "2024-07-15 00:00:00+00"),
                    (18, "KIT-KNV-018", "Damascus Steel Chef Knife 8-piece Set", "Kitchen", 219.00, 40, "2024-08-01 00:00:00+00"),
                    (19, "APP-HOO-019", "Heavyweight Organic Cotton Hoodie", "Apparel", 79.00, 200, "2024-08-15 00:00:00+00"),
                    (20, "APP-PAN-020", "Technical Stretch Cargo Pants", "Apparel", 89.95, 120, "2024-09-01 00:00:00+00"),
                    (21, "FIT-YOG-021", "Eco-Friendly Non-Slip Yoga Mat", "Wearables", 48.00, 160, "2024-09-15 00:00:00+00"),
                    (22, "FIT-DMB-022", "Adjustable Rapid-Lock Dumbbell Set", "Wearables", 299.00, 30, "2024-10-01 00:00:00+00"),
                    (23, "OFF-LMP-023", "Architect LED Desk Lamp with Wireless Charging", "Furniture", 59.99, 90, "2024-10-15 00:00:00+00"),
                    (24, "OFF-BOK-024", "Solid Oak 5-Tier Modern Bookshelf", "Furniture", 249.00, 20, "2024-11-01 00:00:00+00"),
                    (25, "OUT-TEN-025", "Ultralight 3-Season Backpacking Tent", "Outdoor", 289.00, 45, "2024-11-15 00:00:00+00"),
                    (26, "OUT-SLP-026", "Sub-Zero Mummy Sleeping Bag", "Outdoor", 149.50, 60, "2024-12-01 00:00:00+00"),
                    (27, "GAM-CNS-027", "Next-Gen 4K Console 1TB Edition", "Gaming", 499.99, 50, "2024-12-15 00:00:00+00"),
                    (28, "GAM-CTL-028", "Pro Wireless Esports Controller", "Gaming", 159.00, 85, "2025-01-05 00:00:00+00"),
                    (29, "APP-WAT-029", "Luxury Automatic Diver Watch 200m", "Wearables", 650.00, 15, "2025-01-20 00:00:00+00"),
                    (30, "HOM-PUR-030", "True HEPA Smart Air Purifier Pro", "Appliances", 229.00, 70, "2025-02-01 00:00:00+00"),
                ]
                cur.executemany(
                    "INSERT INTO products (id, sku, name, category, price, stock_quantity, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s);",
                    products_data,
                )

                # 3. 100 Orders
                statuses = ["completed", "completed", "completed", "completed", "pending", "processing", "cancelled", "refunded"]
                countries = ["US", "US", "CA", "UK", "DE", "FR", "JP", "AU", "ES", "SG"]

                orders_data = []
                order_items_data = []
                item_id_counter = 1

                for order_id in range(1, 101):
                    cust_id = ((order_id - 1) % 50) + 1
                    status = statuses[order_id % len(statuses)]
                    shipping_c = countries[order_id % len(countries)]
                    
                    month = ((order_id - 1) % 12) + 1
                    day = ((order_id * 3) % 28) + 1
                    year = 2025 if order_id <= 70 else 2026
                    hour = (order_id * 7) % 24
                    minute = (order_id * 13) % 60
                    order_date = f"{year}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:00+00"

                    num_items = (order_id % 4) + 1
                    order_total = 0.0

                    for item_idx in range(num_items):
                        prod_id = ((order_id + item_idx * 7) % 30) + 1
                        prod_price = float(products_data[prod_id - 1][4])
                        qty = ((order_id + item_idx) % 3) + 1
                        line_total = prod_price * qty
                        order_total += line_total

                        order_items_data.append((item_id_counter, order_id, prod_id, qty, prod_price))
                        item_id_counter += 1

                    orders_data.append((order_id, cust_id, order_date, status, round(order_total, 2), shipping_c))

                cur.executemany(
                    "INSERT INTO orders (id, customer_id, order_date, status, total_amount, shipping_country) VALUES (%s, %s, %s, %s, %s, %s);",
                    orders_data,
                )

                cur.executemany(
                    "INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (%s, %s, %s, %s, %s);",
                    order_items_data,
                )

                cur.execute("""
                    SELECT setval('customers_id_seq', COALESCE((SELECT MAX(id) FROM customers), 1));
                    SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1));
                    SELECT setval('orders_id_seq', COALESCE((SELECT MAX(id) FROM orders), 1));
                    SELECT setval('order_items_id_seq', COALESCE((SELECT MAX(id) FROM order_items), 1));
                """)

        logger.info(
            "Successfully seeded PostgreSQL target database with %d customers, %d products, %d orders, and %d items.",
            len(customers_data),
            len(products_data),
            len(orders_data),
            len(order_items_data),
        )
        return True
    except Exception as e:
        logger.warning("Failed to seed PostgreSQL target (%s): %s", pg_uri, e)
        return False


# -----------------------------------------------------------------------------
# 2. MongoDB Target Seeding (User Events & Product Reviews)
# -----------------------------------------------------------------------------
def seed_mongodb_target(uri: str | None = None, db_name: str = "analytics_demo") -> bool:
    """Connect to target MongoDB and seed analytics events and product reviews."""
    target_uri = (
        uri
        or os.getenv(
            "DEMO_MONGO_URI",
            "mongodb://root:targetsecret@localhost:27018/analytics_demo?authSource=admin",
        )
        or "mongodb://root:targetsecret@localhost:27018/analytics_demo?authSource=admin"
    )

    logger.info("Seeding MongoDB target database: %s", target_uri.split("@")[-1])
    try:
        client: MongoClient[dict[str, Any]] = MongoClient(target_uri, serverSelectionTimeoutMS=4000)
        db = client[db_name]

        # 1. Events collection
        events_col = db["events"]
        events_col.create_index("user_id")
        events_col.create_index("event_type")
        events_col.create_index("timestamp")

        events_col.delete_many({})

        event_types = ["page_view", "cart_add", "checkout", "search", "wishlist_add", "page_view", "cart_add"]
        devices = ["mobile", "desktop", "tablet"]
        countries_list = ["US", "CA", "UK", "DE", "FR", "JP", "AU", "ES", "SG", "IN"]

        events_data = []
        for i in range(1, 151):
            cust_id = ((i - 1) % 50) + 1
            ev_type = event_types[i % len(event_types)]
            device = devices[i % len(devices)]
            country = countries_list[i % len(countries_list)]
            prod_id = ((i * 3) % 30) + 1
            
            month = ((i - 1) % 12) + 1
            day = ((i * 5) % 28) + 1
            year = 2025 if i <= 100 else 2026
            hour = (i * 11) % 24
            minute = (i * 17) % 60
            ts = datetime(year, month, day, hour, minute, tzinfo=UTC)

            ev_doc: dict[str, Any] = {
                "_id": f"evt_{i:03d}",
                "event_id": f"evt_{i:03d}",
                "user_id": f"usr_{cust_id}",
                "customer_id": cust_id,
                "event_type": ev_type,
                "device": device,
                "country": country,
                "timestamp": ts,
            }

            if ev_type == "page_view":
                ev_doc["path"] = f"/products/PROD-{prod_id:03d}"
                ev_doc["duration_seconds"] = (i * 13) % 180 + 10
            elif ev_type == "cart_add":
                ev_doc["product_id"] = prod_id
                ev_doc["quantity"] = (i % 3) + 1
            elif ev_type == "checkout":
                order_num = ((i - 1) % 100) + 1
                ev_doc["order_id"] = order_num
                ev_doc["amount"] = round(((i * 47) % 1500) + 49.99, 2)
            elif ev_type == "search":
                search_terms = ["laptop", "headphones", "espresso", "standing desk", "jacket", "shoes", "air fryer", "monitor"]
                ev_doc["query"] = search_terms[i % len(search_terms)]

            events_data.append(ev_doc)

        events_col.insert_many(events_data)

        # 2. Reviews collection
        reviews_col = db["reviews"]
        reviews_col.create_index("product_id")
        reviews_col.create_index("rating")

        reviews_col.delete_many({})

        sample_titles = [
            "Outstanding quality and finish",
            "Exceeded my expectations",
            "Good value for money",
            "Decent, but could be better",
            "Absolute game changer!",
            "Highly recommended for daily use",
            "Solid performance overall",
            "Very pleased with this purchase",
        ]
        sample_comments = [
            "The build quality is phenomenal and it works right out of the box with zero fuss.",
            "Battery life is top notch. Been using it for weeks without any degradation.",
            "Arrived in pristine condition. Exactly what I needed for my home workspace.",
            "Customer support was quick to respond when I had questions. 5 stars!",
            "Performs reliably under heavy load. A great addition to my toolkit.",
            "Lightweight, ergonomic, and aesthetically pleasing design.",
        ]

        reviews_data = []
        for i in range(1, 61):
            prod_id = ((i - 1) % 30) + 1
            rating = 5 if (prod_id == 1 and i <= 30) else ((i % 5) + 1)
            verified = (i % 4) != 0
            month = ((i - 1) % 12) + 1
            day = ((i * 7) % 28) + 1
            year = 2025 if i <= 40 else 2026

            rev_doc = {
                "_id": f"rev_{i:03d}",
                "review_id": f"rev_{i:03d}",
                "product_id": prod_id,
                "customer_name": f"Customer {((i * 3) % 50) + 1}",
                "rating": rating,
                "title": sample_titles[i % len(sample_titles)],
                "comment": sample_comments[i % len(sample_comments)],
                "verified_purchase": verified,
                "created_at": datetime(year, month, day, 10, 30, tzinfo=UTC),
            }
            reviews_data.append(rev_doc)

        reviews_col.insert_many(reviews_data)

        logger.info(
            "Successfully seeded MongoDB target database with %d events and %d reviews.",
            len(events_data),
            len(reviews_data),
        )
        return True
    except Exception as e:
        logger.warning("Failed to seed MongoDB target (%s): %s", target_uri, e)
        return False


# -----------------------------------------------------------------------------
# 3. Elasticsearch Target Seeding (Product Catalog & Access Logs)
# -----------------------------------------------------------------------------
def seed_elasticsearch_target(url: str | None = None) -> bool:
    """Connect to Elasticsearch and seed catalog and access_logs indices."""
    from elasticsearch import Elasticsearch

    es_url = url or os.getenv("DEMO_ELASTICSEARCH_URL", "http://localhost:9200")
    logger.info("Seeding Elasticsearch target database: %s", es_url)
    try:
        es = Elasticsearch(es_url, request_timeout=5)
        if not es.ping():
            logger.warning("Elasticsearch server at %s did not respond to ping", es_url)
            return False

        # 1. Catalog index
        if not es.indices.exists(index="catalog"):
            es.indices.create(
                index="catalog",
                body={
                    "mappings": {
                        "properties": {
                            "product_id": {"type": "integer"},
                            "sku": {"type": "keyword"},
                            "title": {"type": "text"},
                            "description": {"type": "text"},
                            "category": {"type": "keyword"},
                            "price": {"type": "float"},
                            "tags": {"type": "keyword"},
                            "in_stock": {"type": "boolean"},
                            "ratings_average": {"type": "float"},
                            "created_at": {"type": "date"},
                        }
                    }
                },
            )

        catalog_items = [
            {
                "product_id": 1,
                "sku": "TECH-LAP-001",
                "title": "UltraBook Pro 15",
                "description": "High performance computing laptop with 32GB RAM and 1TB NVMe SSD for software engineers and creators.",
                "category": "Electronics",
                "price": 1299.99,
                "tags": ["laptop", "computer", "pro", "fast", "hardware"],
                "in_stock": True,
                "ratings_average": 4.8,
                "created_at": "2025-01-01T00:00:00Z",
            },
            {
                "product_id": 2,
                "sku": "TECH-PHN-002",
                "title": "SmartPhone Prime X",
                "description": "Next generation mobile smartphone with 120Hz OLED screen and 5G dual SIM connectivity.",
                "category": "Electronics",
                "price": 899.50,
                "tags": ["phone", "mobile", "oled", "5g", "smartphone"],
                "in_stock": True,
                "ratings_average": 4.9,
                "created_at": "2025-01-05T00:00:00Z",
            },
            {
                "product_id": 3,
                "sku": "TECH-AUD-003",
                "title": "Noise-Canceling Headphones",
                "description": "Over-ear wireless audio headphones with spatial audio acoustic chamber and 30-hour battery.",
                "category": "Audio",
                "price": 249.00,
                "tags": ["audio", "headphones", "wireless", "anc", "music"],
                "in_stock": True,
                "ratings_average": 4.7,
                "created_at": "2025-01-10T00:00:00Z",
            },
            {
                "product_id": 4,
                "sku": "HOME-COF-004",
                "title": "Espresso Artisan Machine",
                "description": "Commercial-grade espresso coffee maker with precision PID dual-boiler temperature controller.",
                "category": "Kitchen",
                "price": 549.00,
                "tags": ["coffee", "espresso", "kitchen", "artisan", "brew"],
                "in_stock": True,
                "ratings_average": 4.9,
                "created_at": "2025-01-15T00:00:00Z",
            },
            {
                "product_id": 5,
                "sku": "HOME-VAC-005",
                "title": "Robotic Vacuum Robot 3000",
                "description": "Automated LiDAR mapping robotic vacuum with self-emptying base and multi-floor smart scheduling.",
                "category": "Appliances",
                "price": 399.99,
                "tags": ["vacuum", "robot", "cleaning", "smart-home", "appliance"],
                "in_stock": True,
                "ratings_average": 4.6,
                "created_at": "2025-02-01T00:00:00Z",
            },
            {
                "product_id": 6,
                "sku": "APP-JKT-006",
                "title": "All-Weather Mountain Jacket",
                "description": "Triple-layer waterproof breathable shell jacket designed for extreme alpine weather and wind.",
                "category": "Apparel",
                "price": 189.95,
                "tags": ["jacket", "outdoor", "waterproof", "hiking", "apparel"],
                "in_stock": True,
                "ratings_average": 4.7,
                "created_at": "2025-02-15T00:00:00Z",
            },
            {
                "product_id": 7,
                "sku": "APP-SHO-007",
                "title": "Running Trail Shoes",
                "description": "Cushioned responsive trail running shoes with Vibram lugged outsoles and carbon plate stability.",
                "category": "Apparel",
                "price": 129.50,
                "tags": ["shoes", "running", "trail", "fitness", "sport"],
                "in_stock": True,
                "ratings_average": 4.5,
                "created_at": "2025-03-01T00:00:00Z",
            },
            {
                "product_id": 8,
                "sku": "FIT-WAT-008",
                "title": "Smart Fitness Tracker",
                "description": "Continuous heart rate, SpO2, sleep tracker with integrated GPS and 7-day battery life.",
                "category": "Wearables",
                "price": 149.00,
                "tags": ["fitness", "smartwatch", "tracker", "health", "wearable"],
                "in_stock": True,
                "ratings_average": 4.4,
                "created_at": "2025-03-10T00:00:00Z",
            },
            {
                "product_id": 9,
                "sku": "OFF-CHR-009",
                "title": "Ergonomic Desk Chair",
                "description": "Breathable mesh ergonomic office chair with dynamic lumbar support and 4D adjustable armrests.",
                "category": "Furniture",
                "price": 329.00,
                "tags": ["chair", "office", "ergonomic", "furniture", "desk"],
                "in_stock": True,
                "ratings_average": 4.8,
                "created_at": "2025-04-01T00:00:00Z",
            },
            {
                "product_id": 10,
                "sku": "OFF-DSK-010",
                "title": "Electric Standing Desk",
                "description": "Dual-motor motorized standing desk with solid bamboo top and programmable height memory presets.",
                "category": "Furniture",
                "price": 499.00,
                "tags": ["desk", "standing desk", "office", "motorized", "furniture"],
                "in_stock": True,
                "ratings_average": 4.9,
                "created_at": "2025-04-15T00:00:00Z",
            },
            {
                "product_id": 11,
                "sku": "TECH-MON-011",
                "title": "UltraWide 4K Gaming Monitor 34-inch",
                "description": "Curved 34-inch IPS display with 144Hz refresh rate, HDR400, and USB-C 90W power delivery.",
                "category": "Electronics",
                "price": 799.00,
                "tags": ["monitor", "ultrawide", "display", "gaming", "4k"],
                "in_stock": True,
                "ratings_average": 4.7,
                "created_at": "2025-05-01T00:00:00Z",
            },
            {
                "product_id": 12,
                "sku": "TECH-KEY-012",
                "title": "Mechanical Wireless Keyboard RGB",
                "description": "Custom hot-swappable mechanical switches with low-latency Bluetooth and 2.4GHz wireless.",
                "category": "Electronics",
                "price": 119.99,
                "tags": ["keyboard", "mechanical", "wireless", "gaming", "rgb"],
                "in_stock": True,
                "ratings_average": 4.6,
                "created_at": "2025-05-10T00:00:00Z",
            },
            {
                "product_id": 13,
                "sku": "TECH-MOU-013",
                "title": "Precision Ergonomic Wireless Mouse",
                "description": "High-precision 4000 DPI optical sensor with silent clicking switches and ergonomic thumb rest.",
                "category": "Electronics",
                "price": 69.50,
                "tags": ["mouse", "wireless", "ergonomic", "office", "precision"],
                "in_stock": True,
                "ratings_average": 4.5,
                "created_at": "2025-05-20T00:00:00Z",
            },
            {
                "product_id": 14,
                "sku": "AUD-SPK-014",
                "title": "Waterproof Bluetooth Outdoor Speaker",
                "description": "Rugged IPX7 waterproof portable speaker with rich bass radiators and 24-hour battery play time.",
                "category": "Audio",
                "price": 89.00,
                "tags": ["speaker", "bluetooth", "audio", "waterproof", "portable"],
                "in_stock": True,
                "ratings_average": 4.6,
                "created_at": "2025-06-01T00:00:00Z",
            },
            {
                "product_id": 15,
                "sku": "AUD-MIC-015",
                "title": "Studio USB Condenser Microphone",
                "description": "Cardioid studio-quality condenser microphone with built-in pop filter and real-time zero-latency headphone monitoring.",
                "category": "Audio",
                "price": 139.00,
                "tags": ["microphone", "podcast", "studio", "audio", "recording"],
                "in_stock": True,
                "ratings_average": 4.7,
                "created_at": "2025-06-15T00:00:00Z",
            },
            {
                "product_id": 16,
                "sku": "KIT-BLN-016",
                "title": "High-Speed Vortex Kitchen Blender",
                "description": "1500W commercial-grade motor with hardened aircraft-grade stainless steel blades for smoothies and soups.",
                "category": "Kitchen",
                "price": 159.00,
                "tags": ["blender", "kitchen", "smoothie", "food", "cookware"],
                "in_stock": True,
                "ratings_average": 4.8,
                "created_at": "2025-07-01T00:00:00Z",
            },
            {
                "product_id": 17,
                "sku": "KIT-AIR-017",
                "title": "Digital Dual-Basket Air Fryer XL",
                "description": "Independent dual-zone cooking baskets with synchronized finish technology and rapid air circulation.",
                "category": "Kitchen",
                "price": 179.99,
                "tags": ["air fryer", "kitchen", "cooking", "healthy", "appliances"],
                "in_stock": True,
                "ratings_average": 4.9,
                "created_at": "2025-07-15T00:00:00Z",
            },
            {
                "product_id": 18,
                "sku": "KIT-KNV-018",
                "title": "Damascus Steel Chef Knife 8-piece Set",
                "description": "67-layer Japanese high-carbon VG-10 Damascus steel knives with ergonomic pakkawood handles and storage block.",
                "category": "Kitchen",
                "price": 219.00,
                "tags": ["knives", "chef", "damascus", "kitchen", "cutlery"],
                "in_stock": True,
                "ratings_average": 4.8,
                "created_at": "2025-08-01T00:00:00Z",
            },
            {
                "product_id": 19,
                "sku": "APP-HOO-019",
                "title": "Heavyweight Organic Cotton Hoodie",
                "description": "450 GSM French Terry 100% organic cotton pullover hoodie with ribbed cuffs and relaxed fit.",
                "category": "Apparel",
                "price": 79.00,
                "tags": ["hoodie", "clothing", "organic", "cotton", "apparel"],
                "in_stock": True,
                "ratings_average": 4.6,
                "created_at": "2025-08-15T00:00:00Z",
            },
            {
                "product_id": 20,
                "sku": "APP-PAN-020",
                "title": "Technical Stretch Cargo Pants",
                "description": "Water-resistant 4-way stretch fabric cargo pants with magnetic pockets and reinforced knees.",
                "category": "Apparel",
                "price": 89.95,
                "tags": ["pants", "cargo", "technical", "outdoor", "apparel"],
                "in_stock": True,
                "ratings_average": 4.5,
                "created_at": "2025-09-01T00:00:00Z",
            },
            {
                "product_id": 21,
                "sku": "FIT-YOG-021",
                "title": "Eco-Friendly Non-Slip Yoga Mat",
                "description": "Biodegradable natural tree rubber and polyurethane alignment surface with antimicrobial protection.",
                "category": "Wearables",
                "price": 48.00,
                "tags": ["yoga", "fitness", "mat", "exercise", "eco"],
                "in_stock": True,
                "ratings_average": 4.7,
                "created_at": "2025-09-15T00:00:00Z",
            },
            {
                "product_id": 22,
                "sku": "FIT-DMB-022",
                "title": "Adjustable Rapid-Lock Dumbbell Set",
                "description": "Quick-turn dial selector adjusting from 5 to 52.5 lbs per dumbbell with anti-roll base trays.",
                "category": "Wearables",
                "price": 299.00,
                "tags": ["dumbbell", "weights", "gym", "fitness", "strength"],
                "in_stock": True,
                "ratings_average": 4.8,
                "created_at": "2025-10-01T00:00:00Z",
            },
            {
                "product_id": 23,
                "sku": "OFF-LMP-023",
                "title": "Architect LED Desk Lamp with Wireless Charging",
                "description": "Stepless dimmable 1000 lumen task lamp with multi-angle gooseneck arm and Qi 15W wireless charger.",
                "category": "Furniture",
                "price": 59.99,
                "tags": ["lamp", "lighting", "desk", "office", "charging"],
                "in_stock": True,
                "ratings_average": 4.4,
                "created_at": "2025-10-15T00:00:00Z",
            },
            {
                "product_id": 24,
                "sku": "OFF-BOK-024",
                "title": "Solid Oak 5-Tier Modern Bookshelf",
                "description": "Sustainably harvested solid white oak shelving unit with industrial powder-coated steel frame.",
                "category": "Furniture",
                "price": 249.00,
                "tags": ["bookshelf", "furniture", "storage", "oak", "living"],
                "in_stock": False,
                "ratings_average": 4.6,
                "created_at": "2025-11-01T00:00:00Z",
            },
            {
                "product_id": 25,
                "sku": "OUT-TEN-025",
                "title": "Ultralight 3-Season Backpacking Tent",
                "description": "Freestanding 2-person tent weighing only 2.4 lbs with DAC aluminum poles and silicone ripstop rainfly.",
                "category": "Outdoor",
                "price": 289.00,
                "tags": ["tent", "camping", "backpacking", "outdoor", "ultralight"],
                "in_stock": True,
                "ratings_average": 4.9,
                "created_at": "2025-11-15T00:00:00Z",
            },
            {
                "product_id": 26,
                "sku": "OUT-SLP-026",
                "title": "Sub-Zero Mummy Sleeping Bag",
                "description": "800 fill power hydro-repellent goose down sleeping bag rated down to 0°F (-18°C) with draft collar.",
                "category": "Outdoor",
                "price": 149.50,
                "tags": ["sleeping bag", "camping", "down", "cold", "outdoor"],
                "in_stock": True,
                "ratings_average": 4.7,
                "created_at": "2025-12-01T00:00:00Z",
            },
            {
                "product_id": 27,
                "sku": "GAM-CNS-027",
                "title": "Next-Gen 4K Console 1TB Edition",
                "description": "Console gaming system featuring custom 8-core CPU, ray tracing GPU, 120 FPS support, and 1TB ultra-fast SSD.",
                "category": "Gaming",
                "price": 499.99,
                "tags": ["console", "gaming", "play", "4k", "entertainment"],
                "in_stock": True,
                "ratings_average": 4.9,
                "created_at": "2025-12-15T00:00:00Z",
            },
            {
                "product_id": 28,
                "sku": "GAM-CTL-028",
                "title": "Pro Wireless Esports Controller",
                "description": "Competition-grade wireless game controller with Hall-effect magnetic joysticks and trigger stop switches.",
                "category": "Gaming",
                "price": 159.00,
                "tags": ["controller", "gamepad", "gaming", "esports", "wireless"],
                "in_stock": True,
                "ratings_average": 4.7,
                "created_at": "2026-01-05T00:00:00Z",
            },
            {
                "product_id": 29,
                "sku": "APP-WAT-029",
                "title": "Luxury Automatic Diver Watch 200m",
                "description": "Automatic mechanical movement, ceramic bezel, sapphire crystal, and 200m ISO 6425 diving rating.",
                "category": "Wearables",
                "price": 650.00,
                "tags": ["watch", "luxury", "automatic", "diver", "accessories"],
                "in_stock": True,
                "ratings_average": 4.8,
                "created_at": "2026-01-20T00:00:00Z",
            },
            {
                "product_id": 30,
                "sku": "HOM-PUR-030",
                "title": "True HEPA Smart Air Purifier Pro",
                "description": "Multi-stage H13 medical-grade HEPA filtration system covering up to 1200 sq ft with real-time PM2.5 display.",
                "category": "Appliances",
                "price": 229.00,
                "tags": ["purifier", "air", "hepa", "smart home", "appliances"],
                "in_stock": True,
                "ratings_average": 4.8,
                "created_at": "2026-02-01T00:00:00Z",
            },
        ]

        for item in catalog_items:
            es.index(index="catalog", id=f"cat_{item['product_id']}", document=item)

        # 2. Access logs index
        if not es.indices.exists(index="access_logs"):
            es.indices.create(
                index="access_logs",
                body={
                    "mappings": {
                        "properties": {
                            "timestamp": {"type": "date"},
                            "method": {"type": "keyword"},
                            "endpoint": {"type": "keyword"},
                            "status_code": {"type": "integer"},
                            "response_time_ms": {"type": "integer"},
                            "client_ip": {"type": "ip"},
                        }
                    }
                },
            )

        methods_pool = ["GET", "GET", "GET", "POST", "PUT", "DELETE"]
        endpoints_pool = [
            "/api/v1/search?q=laptop",
            "/api/v1/search?q=headphones",
            "/api/v1/search?q=espresso",
            "/api/v1/products/1",
            "/api/v1/products/2",
            "/api/v1/products/10",
            "/api/v1/orders",
            "/api/v1/checkout",
            "/api/v1/cart",
            "/health",
            "/api/v1/users/profile",
            "/api/v1/analytics/events",
        ]
        status_pool = [200, 200, 200, 200, 201, 204, 400, 404, 500]

        logs_data = []
        for log_idx in range(1, 101):
            method = methods_pool[log_idx % len(methods_pool)]
            endpoint = endpoints_pool[log_idx % len(endpoints_pool)]
            status_code = status_pool[log_idx % len(status_pool)]
            # If endpoint is checkout or cart, adjust method
            if "checkout" in endpoint:
                method = "POST"
                status_code = 201 if status_code == 200 else status_code
            elif "health" in endpoint:
                method = "GET"
                status_code = 200

            resp_time = (log_idx * 17) % 450 + 12
            ip_suffix = ((log_idx * 7) % 250) + 1
            client_ip = f"192.168.1.{ip_suffix}"

            month = ((log_idx - 1) % 12) + 1
            day = ((log_idx * 3) % 28) + 1
            year = 2025 if log_idx <= 60 else 2026
            hour = (log_idx * 5) % 24
            minute = (log_idx * 11) % 60
            second = (log_idx * 19) % 60
            iso_ts = f"{year}-{month:02d}-{day:02d}T{hour:02d}:{minute:02d}:{second:02d}Z"

            logs_data.append({
                "timestamp": iso_ts,
                "method": method,
                "endpoint": endpoint,
                "status_code": status_code,
                "response_time_ms": resp_time,
                "client_ip": client_ip,
            })

        for idx, log in enumerate(logs_data):
            es.index(index="access_logs", id=f"log_{idx+1}", document=log)

        es.indices.refresh(index="catalog")
        es.indices.refresh(index="access_logs")
        logger.info("Successfully seeded Elasticsearch target database with catalog and access_logs indices.")
        return True
    except Exception as e:
        logger.warning("Failed to seed Elasticsearch target (%s): %s", es_url, e)
        return False


# -----------------------------------------------------------------------------
# 4. Metadata Storage Seeding (Workspaces, Users, Connections & Relationships)
# -----------------------------------------------------------------------------
def seed_metadata(
    meta_uri: str | None = None,
    meta_db_name: str = "nlp_query_engine_meta",
    pg_host: str | None = None,
    pg_port: int = 5432,
    mongo_host: str | None = None,
    mongo_port: int = 27018,
    es_host: str | None = None,
    es_port: int = 9200,
    introspect: bool = True,
) -> bool:
    """Connect to application metadata MongoDB and populate workspace, admin user, connections, and relationships."""
    settings = get_settings()
    app_uri = meta_uri or settings.APP_MONGO_URI

    logger.info("Seeding Application Metadata storage: %s", app_uri.split("@")[-1])
    try:
        client: MongoClient[dict[str, Any]] = MongoClient(app_uri, serverSelectionTimeoutMS=4000)
        db = client[meta_db_name]

        # 1. Demo Workspace
        ws = Workspace(
            id="ws_default",
            name="Demo Workspace",
            description="Production heterogeneous e-commerce & analytics workspace",
            owner_id="usr_admin",
            is_active=True,
        )
        db["workspaces"].update_one({"_id": ws.id}, {"$set": ws.to_mongo()}, upsert=True)

        # 2. Demo Admin User
        admin_user = User(
            id="usr_admin",
            email="admin@example.com",
            full_name="Demo Administrator",
            hashed_password=hash_password("Admin123!"),
            is_active=True,
            is_superuser=True,
            default_workspace_id="ws_default",
        )
        db["users"].update_one(
            {"_id": admin_user.id}, {"$set": admin_user.to_mongo()}, upsert=True
        )

        # 3. Workspace Membership
        membership = WorkspaceMembership(
            id="wm_admin_default",
            workspace_id="ws_default",
            user_id="usr_admin",
            role=WorkspaceRole.ADMIN,
            is_active=True,
        )
        db["workspace_memberships"].update_one(
            {"_id": membership.id}, {"$set": membership.to_mongo()}, upsert=True
        )

        # Determine target connection hosts and ports dynamically
        pg_uri_env = os.getenv("DEMO_POSTGRES_URI")
        mongo_uri_env = os.getenv("DEMO_MONGO_URI")
        es_url_env = os.getenv("DEMO_ELASTICSEARCH_URL")

        parsed_pg = urlparse(pg_uri_env) if pg_uri_env else None
        parsed_mongo = urlparse(mongo_uri_env) if mongo_uri_env else None
        parsed_es = urlparse(es_url_env) if es_url_env else None

        resolved_pg_host = pg_host or (parsed_pg.hostname if parsed_pg and parsed_pg.hostname else None) or os.getenv("DEMO_POSTGRES_HOST", "localhost")
        resolved_pg_port = (parsed_pg.port if parsed_pg and parsed_pg.port else None) or pg_port

        resolved_mongo_host = mongo_host or (parsed_mongo.hostname if parsed_mongo and parsed_mongo.hostname else None) or os.getenv("DEMO_MONGO_HOST", "localhost")
        resolved_mongo_port = (parsed_mongo.port if parsed_mongo and parsed_mongo.port else None) or mongo_port

        resolved_es_host = es_host or (parsed_es.hostname if parsed_es and parsed_es.hostname else None) or os.getenv("DEMO_ES_HOST", "localhost")
        resolved_es_port = (parsed_es.port if parsed_es and parsed_es.port else None) or es_port

        healthcare_only = os.getenv("HEALTHCARE_ONLY", "false").lower() in ("true", "1", "yes")
        if healthcare_only:
            logger.info("Operating in Healthcare-Only Database Mode: removing non-healthcare databases...")
            # Clean up other connections, relations and snapshots
            db["connections"].delete_many({"_id": {"$in": ["conn_postgres_demo", "conn_mongo_demo", "conn_es_demo"]}})
            db["schema_snapshots"].delete_many({"connection_id": {"$in": ["conn_postgres_demo", "conn_mongo_demo", "conn_es_demo"]}})
            db["user_defined_relationships"].delete_many({})

            conn_hc = DatabaseConnection(
                id="conn_healthcare_demo",
                workspace_id="ws_default",
                name="Healthcare Hospital System",
                db_type=DatabaseType.POSTGRESQL,
                host=resolved_pg_host,
                port=resolved_pg_port,
                database="healthcare_demo",
                username="postgres",
                encrypted_secret=encrypt_secret("postgrespassword"),
                status=ConnectionStatus.ONLINE,
                status_message="Connected to Alpine PostgreSQL (healthcare_demo)",
                is_enabled=True,
            )
            db["connections"].replace_one(
                {"_id": conn_hc.id}, conn_hc.to_mongo(), upsert=True
            )

            if introspect:
                try:
                    adapter = create_adapter(conn_hc, decrypted_secret="postgrespassword")
                    snapshot = adapter.discover_schema(workspace_id="ws_default")
                    s_dict = snapshot.to_mongo()
                    s_dict["workspace_id"] = "ws_default"
                    s_dict["connection_id"] = conn_hc.id
                    db["schema_snapshots"].delete_many({"connection_id": conn_hc.id})
                    db["schema_snapshots"].insert_one(s_dict)
                    logger.info("Introspected and persisted schema snapshot for Healthcare Hospital System (%d objects)", len(s_dict.get("objects", [])))
                except Exception as ex:
                    logger.info("Schema introspection for Healthcare deferred: %s", ex)

            logger.info("Successfully seeded Application Metadata with ONLY Healthcare DB.")
            return True

        # 4. Target Database Connections
        conn_pg = DatabaseConnection(
            id="conn_postgres_demo",
            workspace_id="ws_default",
            name="PostgreSQL E-Commerce",
            db_type=DatabaseType.POSTGRESQL,
            host=resolved_pg_host,
            port=resolved_pg_port,
            database="ecommerce_demo",
            username="postgres",
            encrypted_secret=encrypt_secret("postgrespassword"),
            status=ConnectionStatus.ONLINE,
            is_enabled=True,
        )
        db["connections"].update_one(
            {"_id": conn_pg.id}, {"$set": conn_pg.to_mongo()}, upsert=True
        )

        conn_mongo = DatabaseConnection(
            id="conn_mongo_demo",
            workspace_id="ws_default",
            name="MongoDB Analytics",
            db_type=DatabaseType.MONGODB,
            host=resolved_mongo_host,
            port=resolved_mongo_port,
            database="analytics_demo",
            username="root",
            encrypted_secret=encrypt_secret("targetsecret"),
            status=ConnectionStatus.ONLINE,
            is_enabled=True,
        )
        db["connections"].update_one(
            {"_id": conn_mongo.id}, {"$set": conn_mongo.to_mongo()}, upsert=True
        )

        conn_es = DatabaseConnection(
            id="conn_es_demo",
            workspace_id="ws_default",
            name="Elasticsearch Catalog",
            db_type=DatabaseType.ELASTICSEARCH,
            host=resolved_es_host,
            port=resolved_es_port,
            database="catalog",
            encrypted_secret=encrypt_secret(f"http://{resolved_es_host}:{resolved_es_port}"),
            options={"is_uri": True},
            status=ConnectionStatus.ONLINE,
            is_enabled=True,
        )
        db["connections"].update_one(
            {"_id": conn_es.id}, {"$set": conn_es.to_mongo()}, upsert=True
        )

        # 5. User-Defined Cross-Database Relationships
        # Mongo reviews.product_id -> Postgres products.id
        rel_reviews = UserDefinedRelationship(
            id="rel_reviews_to_products",
            workspace_id="ws_default",
            name="Reviews to Product Details",
            source_connection_id="conn_mongo_demo",
            source_table="reviews",
            source_fields=["product_id"],
            target_connection_id="conn_postgres_demo",
            target_table="products",
            target_fields=["id"],
            provenance=RelationshipProvenance.USER_DEFINED,
            cardinality=Cardinality.MANY_TO_ONE,
            confidence=1.0,
            description="Cross-database link connecting MongoDB reviews to PostgreSQL product records",
            created_by="usr_admin",
        )
        db["user_defined_relationships"].update_one(
            {"_id": rel_reviews.id}, {"$set": rel_reviews.to_mongo()}, upsert=True
        )

        # Elasticsearch catalog.product_id -> Postgres products.id
        rel_catalog = UserDefinedRelationship(
            id="rel_catalog_to_products",
            workspace_id="ws_default",
            name="Catalog Search to Relational Inventory",
            source_connection_id="conn_es_demo",
            source_table="catalog",
            source_fields=["product_id"],
            target_connection_id="conn_postgres_demo",
            target_table="products",
            target_fields=["id"],
            provenance=RelationshipProvenance.USER_DEFINED,
            cardinality=Cardinality.ONE_TO_ONE,
            confidence=1.0,
            description="Cross-database link connecting Elasticsearch search documents to PostgreSQL product records",
            created_by="usr_admin",
        )
        db["user_defined_relationships"].update_one(
            {"_id": rel_catalog.id}, {"$set": rel_catalog.to_mongo()}, upsert=True
        )

        # 6. Introspect Schemas if requested
        if introspect:
            logger.info("Attempting automatic schema introspection for seeded connections...")
            for conn_obj, secret in [
                (conn_pg, "postgrespassword"),
                (conn_mongo, "targetsecret"),
                (conn_es, f"http://{resolved_es_host}:{resolved_es_port}"),
            ]:
                try:
                    adapter = create_adapter(conn_obj, decrypted_secret=secret)
                    snapshot = adapter.discover_schema(workspace_id="ws_default")
                    snapshot_dict = snapshot.to_mongo()
                    snapshot_dict.pop("_id", None)
                    db["schema_snapshots"].update_one(
                        {"workspace_id": "ws_default", "connection_id": conn_obj.id},
                        {"$set": snapshot_dict},
                        upsert=True,
                    )
                    logger.info("Introspected and persisted schema snapshot for '%s'", conn_obj.name)
                except Exception as ex:
                    logger.info("Schema introspection for '%s' deferred (target not yet reachable): %s", conn_obj.name, ex)

        logger.info("Successfully seeded Application Metadata (workspace, admin user, 3 connections, cross-database relations).")
        return True
    except Exception as e:
        logger.warning("Failed to seed metadata database (%s): %s", app_uri, e)
        return False


# -----------------------------------------------------------------------------
# 5. Master Orchestrator
# -----------------------------------------------------------------------------
def seed_all(
    pg_uri: str | None = None,
    mongo_uri: str | None = None,
    es_url: str | None = None,
    meta_uri: str | None = None,
) -> dict[str, bool]:
    """Seed all heterogeneous databases and metadata."""
    results = {}
    logger.info("=================================================================")
    logger.info("Starting Multi-Database Orchestration & Seeding...")
    logger.info("=================================================================")

    if pg_uri:
        os.environ["DEMO_POSTGRES_URI"] = pg_uri
    if mongo_uri:
        os.environ["DEMO_MONGO_URI"] = mongo_uri
    if es_url:
        os.environ["DEMO_ELASTICSEARCH_URL"] = es_url
    if meta_uri:
        os.environ["APP_MONGO_URI"] = meta_uri

    healthcare_only = os.getenv("HEALTHCARE_ONLY", "false").lower() in ("true", "1", "yes")
    if healthcare_only:
        results["postgres"] = True
        results["metadata"] = seed_metadata(meta_uri)
        logger.info("Healthcare-only seeding completed with status summary: %s", results)
        return results

    results["postgres"] = seed_postgres(pg_uri)
    results["mongodb_target"] = seed_mongodb_target(mongo_uri)
    results["elasticsearch"] = seed_elasticsearch_target(es_url)
    results["metadata"] = seed_metadata(meta_uri)

    logger.info("Seeding run completed with status summary: %s", results)
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Multi-Database Seeder for NLP Query Engine")
    parser.add_argument("--all", action="store_true", default=True, help="Seed all targets and metadata")
    parser.add_argument("--postgres-only", action="store_true", help="Seed only PostgreSQL target")
    parser.add_argument("--mongo-only", action="store_true", help="Seed only MongoDB target")
    parser.add_argument("--elasticsearch-only", action="store_true", help="Seed only Elasticsearch target")
    parser.add_argument("--metadata-only", action="store_true", help="Seed only metadata database")
    parser.add_argument("--postgres-uri", type=str, help="PostgreSQL connection URI")
    parser.add_argument("--mongo-uri", type=str, help="MongoDB target connection URI")
    parser.add_argument("--elasticsearch-url", type=str, help="Elasticsearch cluster URL")
    parser.add_argument("--metadata-uri", type=str, help="Application Metadata MongoDB URI")

    args = parser.parse_args()

    if args.postgres_only:
        seed_postgres(args.postgres_uri)
    elif args.mongo_only:
        seed_mongodb_target(args.mongo_uri)
    elif args.elasticsearch_only:
        seed_elasticsearch_target(args.elasticsearch_url)
    elif args.metadata_only:
        seed_metadata(args.metadata_uri)
    else:
        seed_all(
            pg_uri=args.postgres_uri,
            mongo_uri=args.mongo_uri,
            es_url=args.elasticsearch_url,
            meta_uri=args.metadata_uri,
        )


if __name__ == "__main__":
    main()
