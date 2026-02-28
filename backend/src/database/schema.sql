-- CRM Database Schema

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  source TEXT, -- e.g., 'Website', 'Referral', 'Import'
  status TEXT DEFAULT 'Active', -- 'Active', 'Inactive', 'Lead'
  tags TEXT, -- JSON array of tags
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Deals/Opportunities table
CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  contact_id INTEGER,
  value REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  stage TEXT DEFAULT 'Prospecting', -- 'Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'
  probability INTEGER DEFAULT 0, -- 0-100
  expected_close_date DATE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Activities table (calls, meetings, emails, tasks)
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- 'Call', 'Meeting', 'Email', 'Task', 'Note'
  subject TEXT NOT NULL,
  description TEXT,
  contact_id INTEGER,
  deal_id INTEGER,
  due_date DATETIME,
  completed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (deal_id) REFERENCES deals(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sales data table (for import and analytics)
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER,
  deal_id INTEGER,
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  sale_date DATE,
  region TEXT,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (deal_id) REFERENCES deals(id)
);

-- Customer segments (from ML clustering)
CREATE TABLE IF NOT EXISTS customer_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER UNIQUE,
  segment_id INTEGER, -- Cluster number from K-means
  segment_name TEXT, -- e.g., 'High Value', 'At Risk', 'New Customer'
  features TEXT, -- JSON object with features used for clustering
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_sales_contact ON sales(contact_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
