# Retail CRM Redesign Proposal - v3.0.0

## Executive Summary
Transform current generic CRM into a **retail-focused customer purchase tracking system** with automated customer engagement tools. Focus: small retail businesses managing customer relationships through purchase history and targeted campaigns.

---

## Phase 3 Feature Redesign

### 1. **CONTACTS → CUSTOMER PURCHASE TRACKER**

#### Current State
- Basic contact info (name, email, phone, company, address)
- Deals and sales separate entities
- No direct purchase history view

#### Redesigned "Customers" Module
**Purpose**: Track customer identity + complete purchase history in one unified view

**New Database Schema**:
```sql
-- Unified customers table (enhanced from contacts)
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,  -- Simplified: full name
    phone TEXT,
    email TEXT,
    location TEXT,  -- Single field: city/area
    notes TEXT,
    total_spent REAL DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    last_purchase_date TEXT,
    first_purchase_date TEXT,
    status TEXT DEFAULT 'Active',  -- Active, Inactive, VIP
    created_at TEXT DEFAULT (datetime('now'))
);

-- Purchase transactions (enhanced from sales)
CREATE TABLE purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    items TEXT NOT NULL,  -- JSON array: [{"name": "Product A", "qty": 2, "price": 100}, ...]
    total_amount REAL NOT NULL,
    payment_method TEXT,  -- Cash, Card, UPI, etc.
    purchase_date TEXT DEFAULT (date('now')),
    notes TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

**UI Features**:
- **Customer Card**: Photo placeholder, name, phone, email, location, total spent, last visit
- **Purchase Timeline**: Chronological list of all purchases with items breakdown
- **Quick Actions**: Add purchase, Send SMS, Mark VIP
- **Search**: By name, phone, location
- **Filters**: Active/Inactive, VIP, by amount spent, by recency

**Business Logic**:
- Auto-update `total_spent` and `total_purchases` on each purchase
- Auto-set `status = 'Inactive'` if no purchase in 90 days
- Auto-set `status = 'VIP'` if total_spent > ₹50,000 (configurable)

---

### 2. **SALES → SMS CAMPAIGNS & CUSTOMER ENGAGEMENT**

#### Current State
- Sales transaction recording
- Basic product/revenue tracking
- No customer engagement tools

#### Redesigned "Campaigns" Module
**Purpose**: Send targeted SMS messages and offers to customers based on behavior

**New Database Schema**:
```sql
-- Campaign configuration
CREATE TABLE campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,  -- SMS template with {{name}} {{amount}} placeholders
    target_audience TEXT NOT NULL,  -- 'inactive', 'vip', 'all', 'custom'
    audience_filter TEXT,  -- JSON: {"days_since_purchase": 60, "min_spent": 1000}
    created_at TEXT DEFAULT (datetime('now')),
    sent_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Draft'  -- Draft, Sent, Scheduled
);

-- Campaign sends
CREATE TABLE campaign_sends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'Pending',  -- Pending, Sent, Failed
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

**UI Features**:
- **Campaign Builder**: 
  - Name campaign
  - Write SMS message with dynamic fields
  - Select target audience:
    - **Inactive Customers**: No purchase in X days
    - **VIP Customers**: Total spent > X
    - **Low Spenders**: Total spent < X
    - **All Active**: All customers with phone numbers
    - **Custom**: Manual selection
  - Preview recipients count
  - Send immediately or schedule

- **Pre-built Templates**:
  ```
  - "Hi {{name}}! We missed you! Get 20% off on your next visit. Valid till {{date}}."
  - "Thank you {{name}} for being our VIP customer! Exclusive offer just for you: {{offer}}"
  - "{{name}}, it's been a while! Visit us this week and get a special discount."
  ```

- **Campaign History**: 
  - List of all campaigns
  - View sent messages
  - Track delivery status
  - Response analytics (future: track conversions)

**Integration Notes**:
- **Mock SMS Initially**: Store messages in DB, display "SMS Sent" notification
- **Future Integration**: Twilio, MSG91, or local SMS gateway API
- **Bulk SMS**: Batch processing for large audience

---

### 3. **REPORTS → VISUAL GRAPHS & SUMMARIES**

#### Current State
- PDF/Excel export only
- Static report generation
- Limited time-range options

#### Redesigned "Insights" Module
**Purpose**: Visual dashboards showing business trends over customizable time periods

**UI Features**:

**Tab 1: Revenue Trends**
- **Time Selector**: Last 7 days, Last 30 days, Last 3 months, Last 6 months, Last year, Custom range
- **Line Chart**: Total revenue over time (daily/weekly/monthly aggregation based on range)
- **Bar Chart**: Revenue by location
- **Summary Cards**: 
  - Total revenue this period
  - Average transaction value
  - Growth % vs previous period

**Tab 2: Customer Insights**
- **Pie Chart**: Customer distribution (Active, Inactive, VIP)
- **Bar Chart**: Top 10 customers by spend
- **Line Chart**: New customers acquired over time
- **Summary Cards**:
  - Total customers
  - Active customers
  - Average customer lifetime value

**Tab 3: Purchase Patterns**
- **Heatmap/Calendar View**: Purchases by day of week/month
- **Bar Chart**: Most purchased items (requires item-level analysis from purchases JSON)
- **Line Chart**: Purchase frequency trend

**Tab 4: Export Options**
- **Excel Export**: Current view data
- **PDF Summary**: One-page visual report
- **Date Range**: Dynamic filtering for all charts

**Implementation**:
- Use **Recharts** (already in frontend dependencies)
- Aggregate queries on backend (`/api/insights/revenue-trends`, `/api/insights/customer-stats`)
- Client-side date range filtering

---

## Database Migration Plan

### Step 1: Backup Current Data
```sql
-- Export contacts → customers
-- Export sales → purchases (with items converted to JSON)
```

### Step 2: Schema Changes
- Rename `contacts` → `customers`, simplify fields
- Rename `sales` → `purchases`, restructure items
- Add new tables: `campaigns`, `campaign_sends`
- Drop unused tables: `deals`, `activities` (unless needed)

### Step 3: Data Migration Script
```typescript
// Migrate contacts to customers
// Migrate sales to purchases (merge product_name → items array)
// Calculate aggregate fields (total_spent, total_purchases, etc.)
```

---

## API Endpoints Redesign

### Customers (Replace Contacts)
- `GET /api/customers` - List with filters
- `GET /api/customers/:id` - Get customer with purchase history
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Purchases (Replace Sales)
- `GET /api/purchases?customer_id=X` - Get customer purchases
- `POST /api/purchases` - Record new purchase
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase
- `GET /api/purchases/recent` - Recent purchases across all customers

### Campaigns (Replace Sales Page)
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/send` - Send campaign to audience
- `GET /api/campaigns/:id/sends` - View sent messages
- `DELETE /api/campaigns/:id` - Delete campaign

### Insights (Replace Reports)
- `GET /api/insights/revenue-trends?period=30days` - Revenue data
- `GET /api/insights/customer-stats?period=30days` - Customer metrics
- `GET /api/insights/purchase-patterns?period=30days` - Purchase analytics
- `POST /api/insights/export` - Export as Excel/PDF

---

## Frontend Page Redesign

### 1. Dashboard (Update KPIs)
- **Revenue This Month**: Total purchases sum
- **Active Customers**: Count with last_purchase < 30 days
- **Avg Transaction Value**: Total revenue / purchase count
- **Top Product**: Most common item from purchases
- **Recent Purchases**: Last 5 transactions

### 2. Customers Page (Replace Contacts)
- **Search**: Name, phone, location
- **Filters**: Active/Inactive, VIP, by spend range
- **Table Columns**: Name, Phone, Location, Total Spent, Last Purchase, Status
- **Click → Detail View**: Purchase history timeline, Add Purchase button, Send SMS button

### 3. Campaigns Page (Replace Sales)
- **Campaign List**: Name, Target Audience, Sent Count, Status
- **Create Campaign Button** → Modal:
  - Campaign name
  - Message text area (with {{name}}, {{amount}} placeholders)
  - Target selector (dropdown + filters)
  - Preview recipients count
  - Send/Schedule buttons

### 4. Insights Page (Replace Reports)
- **Time Range Picker**: Dropdown at top
- **Tab Navigation**: Revenue | Customers | Patterns | Export
- **Responsive Charts**: Recharts components
- **Download Buttons**: Excel, PDF

### 5. Remove/Archive
- **Import Page**: Keep for initial customer data import (map to new schema)
- **Analytics Page**: Merge ML segmentation into Insights (optional)

---

## Implementation Timeline

### Phase 3A: Database & Backend (Week 1)
1. Create migration script for schema changes
2. Update API routes (customers, purchases, campaigns, insights)
3. Test data migration with existing data
4. Update authentication to work with new schema

### Phase 3B: Frontend UI (Week 2)
1. Redesign Customers page with purchase history
2. Build Campaigns page with SMS builder
3. Create Insights page with Recharts
4. Update Dashboard with new KPIs
5. Update navigation sidebar labels

### Phase 3C: Testing & Polish (Week 3)
1. Test customer purchase flow
2. Test campaign creation and sending (mock SMS)
3. Test insights charts with various date ranges
4. Fix bugs and refine UI
5. Update documentation

---

## Future Enhancements (v3.1+)

1. **SMS Gateway Integration**: Connect to Twilio/MSG91 for real SMS delivery
2. **WhatsApp Campaigns**: Send messages via WhatsApp Business API
3. **Inventory Tracking**: Track stock levels for purchased items
4. **Loyalty Points**: Award points per purchase, redeem for discounts
5. **Appointment Booking**: Schedule customer visits
6. **Multi-Store Support**: Different locations with separate inventories
7. **Mobile App**: React Native app for on-the-go access
8. **Invoice Generation**: Auto-generate PDF invoices for purchases
9. **Payment Reminders**: Auto-SMS for pending payments
10. **Customer Feedback**: Post-purchase SMS surveys

---

## User Approval Required

Please review this proposal and confirm:
1. ✅ Do you approve the customer purchase tracking model?
2. ✅ Do you approve the SMS campaigns approach?
3. ✅ Do you approve the visual insights design?
4. ☑️ Any specific features to add/remove/modify?
5. ☑️ Preferred SMS templates or message examples?
6. ☑️ Should we keep the ML segmentation (Analytics page)?

Once approved, I will proceed with implementation in the order specified above.

---

**Version**: 3.0.0 Proposal  
**Target**: Small Retail Businesses  
**Focus**: Purchase History + Customer Engagement

