-- CRM Database Schema v3.0.0 - Retail Edition
-- Focus: Customer Purchase Tracking + SMS Campaigns

-- Users table for authentication (unchanged)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers table (simplified from contacts, retail-focused)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  location TEXT,
  notes TEXT,
  total_spent REAL DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  last_purchase_date TEXT,
  first_purchase_date TEXT,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT (datetime('now')),
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Purchase transactions (enhanced from sales)
CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  items TEXT NOT NULL,
  total_amount REAL NOT NULL,
  payment_method TEXT,
  purchase_date TEXT DEFAULT (date('now')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Campaign configuration
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  audience_filter TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  sent_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Campaign sends
CREATE TABLE IF NOT EXISTS campaign_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'Pending',
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Customer segments (optional - keep for ML analytics)
CREATE TABLE IF NOT EXISTS customer_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER UNIQUE,
  segment_id INTEGER,
  segment_name TEXT,
  features TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_location ON customers(location);
CREATE INDEX IF NOT EXISTS idx_purchases_customer ON purchases(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_customer ON campaign_sends(customer_id);
