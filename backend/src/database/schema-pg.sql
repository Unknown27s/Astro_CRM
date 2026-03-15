-- AstroCRM PostgreSQL Schema v3.0.0
-- All tables for retail CRM with inventory, online store, campaigns

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    location VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    customer_type VARCHAR(50) DEFAULT 'buyer',
    total_spent DECIMAL(12,2) DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    first_purchase_date TIMESTAMP,
    last_purchase_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id)
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]',
    total_amount DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    purchase_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id)
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    message TEXT,
    email_subject VARCHAR(255),
    campaign_type VARCHAR(50) DEFAULT 'sms',
    target_audience VARCHAR(50) DEFAULT 'all',
    audience_filter TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id)
);

-- Campaign Sends
CREATE TABLE IF NOT EXISTS campaign_sends (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id),
    phone VARCHAR(50),
    email VARCHAR(255),
    message TEXT,
    campaign_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Segments (ML clustering results)
CREATE TABLE IF NOT EXISTS customer_segments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER UNIQUE REFERENCES customers(id),
    segment_id INTEGER,
    segment_name VARCHAR(255),
    features JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    category VARCHAR(100),
    -- Pricing
    price DECIMAL(12,2),
    original_price DECIMAL(12,2),
    cost_price DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    -- Stock (online store)
    stock_qty INTEGER DEFAULT 0,
    in_stock BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT TRUE,
    is_online_store_product BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    -- Stock (inventory)
    current_stock INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 0,
    -- Details
    supplier VARCHAR(255),
    last_restock_date TIMESTAMP,
    seller_id INTEGER,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id)
);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER DEFAULT 0,
    new_quantity INTEGER DEFAULT 0,
    reason VARCHAR(255),
    barcode_scanned VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id)
);

-- Google Sheets Sync Configuration
CREATE TABLE IF NOT EXISTS google_sheets_sync (
    id SERIAL PRIMARY KEY,
    sheet_id VARCHAR(255) NOT NULL,
    sheet_name VARCHAR(255) NOT NULL,
    sync_type VARCHAR(50) DEFAULT 'customers',
    status VARCHAR(50) DEFAULT 'Active',
    total_rows_synced INTEGER DEFAULT 0,
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    UNIQUE(sheet_id, sheet_name)
);

-- Store Settings (Online Store)
CREATE TABLE IF NOT EXISTS store_settings (
    id SERIAL PRIMARY KEY,
    store_name TEXT DEFAULT 'My Online Store',
    store_tagline TEXT DEFAULT 'Quality products at great prices',
    primary_color TEXT DEFAULT '#4F46E5',
    banner_text TEXT DEFAULT 'Welcome to our store!',
    contact_phone TEXT DEFAULT '',
    contact_email TEXT DEFAULT '',
    currency TEXT DEFAULT '₹',
    whatsapp_number TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    asi_api_key TEXT DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Online Orders
CREATE TABLE IF NOT EXISTS online_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    customer_address TEXT,
    items JSONB DEFAULT '[]',
    total_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    coupon_code VARCHAR(100),
    discount_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(50) DEFAULT 'percentage',
    discount_value DECIMAL(12,2) DEFAULT 0,
    min_order_amount DECIMAL(12,2) DEFAULT 0,
    max_discount DECIMAL(12,2) DEFAULT 0,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_purchases_customer ON purchases(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);

-- Seed default store settings if empty
INSERT INTO store_settings (id, store_name) VALUES (1, 'AstroCRM Store')
ON CONFLICT (id) DO NOTHING;
