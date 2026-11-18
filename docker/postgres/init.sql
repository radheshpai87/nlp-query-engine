-- =============================================================================
-- Ambiguity-Aware NLP Query Engine - PostgreSQL E-Commerce Target Seed Schema
-- =============================================================================

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
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Seed Customers
INSERT INTO customers (id, name, email, country, status, created_at) VALUES
(1, 'Alice Smith', 'alice.smith@example.com', 'US', 'active', '2025-01-15 08:30:00+00'),
(2, 'Bob Jones', 'bob.jones@example.com', 'CA', 'active', '2025-02-10 11:20:00+00'),
(3, 'Charlie Brown', 'charlie.b@example.com', 'UK', 'inactive', '2025-03-05 14:15:00+00'),
(4, 'Diana Prince', 'diana.p@example.com', 'US', 'active', '2025-03-22 09:45:00+00'),
(5, 'Evan Wright', 'evan.w@example.com', 'DE', 'active', '2025-04-12 16:00:00+00'),
(6, 'Fiona Gallagher', 'fiona.g@example.com', 'FR', 'active', '2025-05-01 10:30:00+00'),
(7, 'George Clark', 'george.c@example.com', 'US', 'suspended', '2025-06-18 13:50:00+00'),
(8, 'Hannah Abbott', 'hannah.a@example.com', 'AU', 'active', '2025-07-04 15:10:00+00'),
(9, 'Ian Malcolm', 'ian.m@example.com', 'CA', 'active', '2025-08-19 12:00:00+00'),
(10, 'Julia Roberts', 'julia.r@example.com', 'US', 'active', '2025-09-02 17:25:00+00')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    country = EXCLUDED.country,
    status = EXCLUDED.status;

-- Seed Products
INSERT INTO products (id, sku, name, category, price, stock_quantity, created_at) VALUES
(1, 'TECH-LAP-001', 'UltraBook Pro 15', 'Electronics', 1299.99, 45, '2025-01-01 00:00:00+00'),
(2, 'TECH-PHN-002', 'SmartPhone Prime X', 'Electronics', 899.50, 120, '2025-01-05 00:00:00+00'),
(3, 'TECH-AUD-003', 'Noise-Canceling Headphones', 'Audio', 249.00, 80, '2025-01-10 00:00:00+00'),
(4, 'HOME-COF-004', 'Espresso Artisan Machine', 'Kitchen', 549.00, 30, '2025-01-15 00:00:00+00'),
(5, 'HOME-VAC-005', 'Robotic Vacuum Robot 3000', 'Appliances', 399.99, 60, '2025-02-01 00:00:00+00'),
(6, 'APP-JKT-006', 'All-Weather Mountain Jacket', 'Apparel', 189.95, 150, '2025-02-15 00:00:00+00'),
(7, 'APP-SHO-007', 'Running Trail Shoes', 'Apparel', 129.50, 95, '2025-03-01 00:00:00+00'),
(8, 'FIT-WAT-008', 'Smart Fitness Tracker', 'Wearables', 149.00, 210, '2025-03-10 00:00:00+00'),
(9, 'OFF-CHR-009', 'Ergonomic Desk Chair', 'Furniture', 329.00, 40, '2025-04-01 00:00:00+00'),
(10, 'OFF-DSK-010', 'Electric Standing Desk', 'Furniture', 499.00, 25, '2025-04-15 00:00:00+00')
ON CONFLICT (id) DO UPDATE SET
    sku = EXCLUDED.sku,
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    stock_quantity = EXCLUDED.stock_quantity;

-- Seed Orders
INSERT INTO orders (id, customer_id, order_date, status, total_amount, shipping_country) VALUES
(1, 1, '2025-05-10 14:00:00+00', 'completed', 1548.99, 'US'),
(2, 2, '2025-05-12 11:30:00+00', 'completed', 899.50, 'CA'),
(3, 4, '2025-05-15 16:45:00+00', 'completed', 399.99, 'US'),
(4, 5, '2025-05-20 09:15:00+00', 'completed', 549.00, 'DE'),
(5, 6, '2025-05-25 13:00:00+00', 'completed', 319.45, 'FR'),
(6, 1, '2025-06-01 10:20:00+00', 'completed', 149.00, 'US'),
(7, 8, '2025-06-05 15:40:00+00', 'completed', 1299.99, 'AU'),
(8, 9, '2025-06-11 12:10:00+00', 'pending', 828.00, 'CA'),
(9, 10, '2025-06-18 17:50:00+00', 'completed', 249.00, 'US'),
(10, 2, '2025-06-25 11:05:00+00', 'cancelled', 499.00, 'CA'),
(11, 4, '2025-07-02 14:30:00+00', 'completed', 1798.99, 'US'),
(12, 5, '2025-07-08 16:20:00+00', 'completed', 189.95, 'DE'),
(13, 6, '2025-07-15 08:50:00+00', 'completed', 129.50, 'FR'),
(14, 8, '2025-07-22 13:15:00+00', 'completed', 478.00, 'AU'),
(15, 1, '2025-08-01 18:00:00+00', 'completed', 249.00, 'US'),
(16, 9, '2025-08-10 10:45:00+00', 'completed', 1299.99, 'CA'),
(17, 10, '2025-08-18 15:30:00+00', 'completed', 549.00, 'US'),
(18, 2, '2025-09-01 12:00:00+00', 'processing', 1048.50, 'CA'),
(19, 4, '2025-09-12 14:20:00+00', 'completed', 828.00, 'US'),
(20, 5, '2025-09-20 16:50:00+00', 'completed', 399.99, 'DE')
ON CONFLICT (id) DO UPDATE SET
    customer_id = EXCLUDED.customer_id,
    order_date = EXCLUDED.order_date,
    status = EXCLUDED.status,
    total_amount = EXCLUDED.total_amount,
    shipping_country = EXCLUDED.shipping_country;

-- Seed Order Items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 1, 1299.99),
(2, 1, 3, 1, 249.00),
(3, 2, 2, 1, 899.50),
(4, 3, 5, 1, 399.99),
(5, 4, 4, 1, 549.00),
(6, 5, 6, 1, 189.95),
(7, 5, 7, 1, 129.50),
(8, 6, 8, 1, 149.00),
(9, 7, 1, 1, 1299.99),
(10, 8, 9, 1, 329.00),
(11, 8, 10, 1, 499.00),
(12, 9, 3, 1, 249.00),
(13, 10, 10, 1, 499.00),
(14, 11, 1, 1, 1299.99),
(15, 11, 10, 1, 499.00),
(16, 12, 6, 1, 189.95),
(17, 13, 7, 1, 129.50),
(18, 14, 9, 1, 329.00),
(19, 14, 8, 1, 149.00),
(20, 15, 3, 1, 249.00),
(21, 16, 1, 1, 1299.99),
(22, 17, 4, 1, 549.00),
(23, 18, 2, 1, 899.50),
(24, 18, 8, 1, 149.00),
(25, 19, 9, 1, 329.00),
(26, 19, 10, 1, 499.00),
(27, 20, 5, 1, 399.99)
ON CONFLICT (id) DO UPDATE SET
    order_id = EXCLUDED.order_id,
    product_id = EXCLUDED.product_id,
    quantity = EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price;

SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));
SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));
SELECT setval('order_items_id_seq', (SELECT MAX(id) FROM order_items));
