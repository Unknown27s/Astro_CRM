# AstroCRM v3 - Feature Documentation

## 📊 Project Overview

**AstroCRM** is a comprehensive retail CRM system designed for modern businesses. It combines customer relationship management with advanced inventory tracking, AI-powered analytics, and omnichannel sales capabilities. Built with React, TypeScript, Node.js, and SQLite.

**Version:** 3.0.0 | **Edition:** Retail
**Status:** Production Ready

---

## ✨ Core Features

### 1. **Dashboard Analytics** 📈
- Real-time KPI metrics (Total Customers, Revenue, Orders, Growth Rate)
- Revenue trend charts with interactive visualization
- Recent purchases feed with customer details
- AI-powered insights summaries
- Purchase statistics and customer engagement metrics

**Key Metrics Tracked:**
- Total spend by all customers
- Monthly revenue trends
- Order count and average order value
- Customer acquisition rate
- VIP customer identification

---

### 2. **Customer Management** 👥
- **Add/Edit Customers:** Full customer profile management
  - Name, Phone, Email, Location, Status
  - Automatic customer aggregates (total spent, purchase history)
  - Customer segmentation (Active, Inactive, VIP, Churned)

- **Customer Search & Filter:**
  - Real-time search across names and phone numbers
  - Filter by status and location

- **Bulk Deletion:**
  - Delete multiple customers with confirmation
  - Automatic purchase record cleanup

- **Customer Purchase History:**
  - View detailed purchase records
  - Edit/delete individual purchases
  - Track customer lifetime value

---

### 3. **Purchase Tracking** 💰
- **Create Purchases:**
  - Add items with quantity and price
  - Automatic total calculation
  - Payment method recording
  - Custom notes and dates

- **Update Purchases:**
  - Modify items, amounts, and payment methods
  - Real-time validation

- **Delete Purchases:**
  - Safe deletion with backups
  - Automatic customer aggregate recalculation

- **Purchase Analytics:**
  - Filter by date range
  - Customer-specific purchase history
  - Payment method breakdown

---

### 4. **Stock Management** 📦
- **Barcode Scanning:**
  - Real-time barcode scanning via camera or manual entry
  - Instant stock lookup
  - Quick stock adjustments

- **Stock Transactions:**
  - Track inbound/outbound movements
  - Transaction history with timestamps
  - Auto-generates SKU if needed

- **Low Stock Alerts:**
  - Real-time alerts for items below minimum
  - Configurable thresholds (min/max levels)
  - Visual indicators for critical stock

- **Stock Metrics:**
  - Current inventory value calculation
  - Stock movement trends
  - Supplier information tracking

- **Mobile Ready:**
  - Touch-optimized barcode scanner
  - PWA support with Capacitor
  - Offline capability

---

### 5. **Online Store** 🛍️
- **Product Catalog:**
  - Browse all products with images and descriptions
  - Price display with real-time stock levels
  - Category filtering

- **Shopping Cart:**
  - Add/remove products
  - Quantity adjustments
  - Real-time total calculation

- **Checkout Process:**
  - Customer information capture
  - Address management
  - Payment method selection

- **Order Management:**
  - Order status tracking
  - Automatic stock deduction on purchase
  - Order history and receipts

---

### 6. **Inventory Integration**
- **Automatic Stock Sync:**
  - Online store purchases auto-deduct from inventory
  - Real-time stock updates across all channels
  - Low stock alerts trigger automatically

- **Stock Level Monitoring:**
  - Min/Max stock level configuration per product
  - Restock recommendations
  - Supplier contact information for easy ordering

---

### 7. **Google Sheets Sync** 📊
- **Auto-Sync Configuration:**
  - Connect Google Sheets to CRM
  - Sync intervals configurable (default: 60 seconds)
  - Multiple sync types: Customers, Products, Inventory

- **Data Import:**
  - CSV parsing with header detection
  - Automatic customer/product creation
  - Duplicate detection and updates
  - Error reporting and logging

- **Sync Management:**
  - Start/Stop syncs on demand
  - Manual trigger option
  - Sync history and statistics
  - Error recovery

---

### 8. **Data Import/Export** 📥
- **Multi-Format Support:**
  - Excel/CSV file uploads
  - Template-based imports
  - Custom field mapping
  - Preview before import

- **Import Types:**
  - **Customers:** Name, Phone, Email, Location
  - **Products:** Name, SKU, Barcode, Category, Price, Stock
  - **Stock Transactions:** Barcode, Quantity, Type (In/Out)

- **Sample Templates:**
  - Pre-formatted CSV templates
  - One-click download
  - Instructions included

- **Error Handling:**
  - Validation before import
  - Detailed error reports
  - Selective row import with retry

---

### 9. **Email Campaigns** 📧
- **Campaign Creation:**
  - Compose HTML emails
  - Template library
  - Preview before sending

- **Recipient Selection:**
  - Send to all customers
  - Filter by status (Active, VIP, etc.)
  - Geographic targeting
  - Custom segments

- **Scheduling:**
  - Immediate delivery
  - Schedule for later
  - Recurring campaigns
  - Time zone aware

- **Analytics:**
  - Open rates tracking
  - Click-through tracking
  - Unsubscribe monitoring
  - Delivery status

---

### 10. **SMS Campaigns** 📱
- **Campaign Management:**
  - Send bulk SMS to customers
  - Template library with variables
  - Character limit handling
  - Preview with formatting

- **Targeting:**
  - Send to all customers
  - Filter by status
  - Geographic zone targeting
  - Custom recipient lists

- **Analytics:**
  - Delivery confirmation
  - Bounce tracking
  - Response monitoring
  - Campaign ROI metrics

---

### 11. **Marketing Analytics & ML** 🤖
- **Customer Segmentation:**
  - AI-powered clustering using purchase patterns
  - Visual scatter plot representation
  - Automatic segment identification
  - Segment characteristics explanation

- **Purchase Pattern Analysis:**
  - RFM (Recency, Frequency, Monetary) analysis
  - Churn prediction
  - Value clustering

- **Recommendations:**
  - AI-generated insights on customer groups
  - Product recommendations by segment
  - Campaign targeting suggestions

---

### 12. **Reports & Insights** 📋
- **Automated Reports:**
  - Revenue reports by date range
  - Customer acquisition reports
  - Product performance analysis
  - Geographic sales breakdown

- **AI Summaries:**
  - Natural language report summaries
  - Key findings highlighting
  - Trend analysis and predictions

- **Custom Reports:**
  - Date range selection
  - Metric customization
  - Export options (PDF, CSV)

- **Export Features:**
  - PDF generation
  - CSV download
  - Email scheduling

---

### 13. **AI Studio Chat** 💬
- **Conversational AI:**
  - Natural language queries
  - Multi-turn conversations
  - Context awareness

- **Query Types:**
  - "Show me top customers"
  - "What's our revenue this month?"
  - "Recommend products for VIP customers"
  - "Analyze sales trends"

- **Quick Actions:**
  - Pre-built prompt cards
  - One-click analysis
  - Custom prompt support

- **Model:** Meta-Llama 3.1 405B Instruct (via ASI:One API)

---

### 14. **Admin Dashboard** ⚙️
- **System Health:**
  - Database status
  - API response times
  - Error logs

- **User Management:**
  - Account settings
  - Password management
  - Activity logs

- **Data Management:**
  - Backup/Restore options
  - Database optimization
  - Cleanup utilities

---

### 15. **Authentication & Security** 🔐
- **Login/Signup:**
  - Email-based authentication
  - JWT token management
  - Session management
  - Password encryption

- **Authorization:**
  - Role-based access control
  - Protected routes
  - Token expiration handling

- **Security Features:**
  - CORS protection
  - Input validation
  - SQL injection prevention
  - Rate limiting ready

---

### 16. **Mobile & Responsive Design** 📱
- **PWA Features:**
  - Installable app
  - Offline capability
  - Capacitor support for iOS/Android

- **Responsive Layout:**
  - Mobile-first design
  - Touch-optimized buttons (48px minimum)
  - Collapsible sidebar
  - Mobile hamburger menu

- **Mobile-Specific Features:**
  - Barcode scanner support
  - Simplified navigation
  - Optimized loading times

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS with custom color palette
- **UI Components:** Shadcn/ui inspired pattern
- **Icons:** Lucide React
- **Charts:** Recharts for visualizations
- **Build Tool:** Vite
- **PWA:** Capacitor support
- **State Management:** React hooks and Context API

### Backend
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript
- **Database:** SQLite3
- **Authentication:** JWT (jsonwebtoken)
- **Email:** Nodemailer (via environment config)
- **File Handling:** Multipart form data parsing
- **AI Integration:** ASI:One API (Meta-Llama 3.1)

### Database Schema
- **Core Tables:** customers, purchases, products, inventory
- **Integration Tables:** google_sheets_sync, online_orders, coupons
- **System Tables:** store_settings, users
- **Transaction Tracking:** stock_movements, activity_logs

---

## 📊 Data Models

### Customer
```
- id, name, phone, email, location, status
- total_spent, total_purchases
- first_purchase_date, last_purchase_date
- notes, created_at, updated_at
```

### Purchase
```
- id, customer_id, items (JSON array)
- total_amount, payment_method
- purchase_date, notes
- created_at, updated_at
```

### Product
```
- id, name, sku, barcode, category
- description, cost_price, selling_price
- current_stock, min_stock_level, max_stock_level
- supplier, last_restock_date
- created_at, updated_at
```

### Stock Transaction
```
- id, product_id, transaction_type (In/Out/Adjustment)
- quantity, notes, barcode
- created_at, created_by
```

---

## 🚀 API Endpoints

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `DELETE /api/customers/bulk` - Bulk delete

### Purchases
- `GET /api/purchases` - List purchases
- `GET /api/purchases/recent` - Recent purchases
- `POST /api/purchases` - Create purchase
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Stock
- `GET /api/inventory` - Get inventory levels
- `POST /api/inventory/scan` - Scan barcode
- `POST /api/inventory/transaction` - Record transaction
- `GET /api/inventory/low-stock` - Get low stock alerts

### Campaigns
- `POST /api/campaigns/email` - Send email campaign
- `POST /api/campaigns/sms` - Send SMS campaign
- `GET /api/campaigns/stats` - Campaign statistics

### Reports
- `GET /api/reports/revenue` - Revenue report
- `GET /api/reports/customers` - Customer report
- `POST /api/reports/generate` - Custom report

### Google Sheets
- `POST /api/google-sheets/setup` - Setup sync
- `POST /api/google-sheets/import-csv` - Import CSV
- `GET /api/google-sheets/syncs` - List active syncs

### AI
- `POST /api/chat` - Chat with AI
- `POST /api/insights` - Get AI insights

---

## 📈 Key Metrics Tracked

1. **Customer Metrics:**
   - Total customers
   - Active/Inactive/VIP count
   - Customer acquisition rate
   - Churn rate

2. **Revenue Metrics:**
   - Total revenue
   - Monthly revenue trend
   - Average order value
   - Revenue per customer

3. **Product Metrics:**
   - Top selling products
   - Low stock items
   - Inventory value
   - Stock turnover rate

4. **Campaign Metrics:**
   - Email open rates
   - SMS delivery rates
   - Campaign ROI
   - Engagement rates

---

## 🔄 Sync & Integration Features

### Google Sheets Auto-Sync
- Automatic 60-second syncs
- Configurable intervals
- Multiple sync types
- Error recovery

### Online Store Integration
- Product catalog sync
- Real-time stock updates
- Order-to-inventory sync
- Customer sync

### Email & SMS
- Template library
- Scheduled sending
- Bulk campaigns
- Analytics tracking

---

## 🎨 User Interface

- **Modern Design System:**
  - Sky blue primary color (#0ea5e9)
  - Neutral color palette
  - Consistent spacing (8px grid)
  - Smooth animations

- **Responsive Layout:**
  - Desktop: Full sidebar + content
  - Tablet: Collapsed sidebar
  - Mobile: Hidden sidebar + hamburger menu

- **Navigation:**
  - 10 main sections
  - Quick access icons
  - Collapsible menu
  - Mobile-friendly

---

## 📱 Mobile & PWA

- **Capacitor Support:**
  - iOS app deployment
  - Android app deployment
  - Native camera access

- **PWA Features:**
  - Installable on home screen
  - Offline support
  - Service worker caching
  - App-like experience

---

## ✅ Version 3 Improvements

### From v2 to v3
- Migrated from generic CRM to retail-focused system
- Added comprehensive inventory management
- Email campaigns expansion (now supports SMS)
- AI-powered customer segmentation
- Online store with integrated payments
- Google Sheets real-time sync
- Stock movement tracking
- Advanced reporting

### Data Migration
- Automatic v2→v3 schema migration
- Contact→Customer mapping
- Sales→Purchase consolidation
- Customer aggregate calculation
- Backward compatibility safeguards

---

## 🎯 Use Cases

1. **Retail Stores:** Track inventory, manage customers, send campaigns
2. **E-commerce:** Manage products, process orders, integrate with Google Sheets
3. **Service Businesses:** Track customer interactions, sales, and commitments
4. **Multi-channel Sales:** Sync inventory across online and offline channels
5. **Data Analysis:** AI-powered insights and customer segmentation

---

## 📞 Support & Maintenance

- **Logging:** Comprehensive error and operation logs
- **Monitoring:** Real-time health checks
- **Backup:** Automatic database backups
- **Migration:** Seamless version upgrades
- **Documentation:** Full API and feature docs

---

**Last Updated:** March 15, 2026
**Version:** 3.0.0 (Retail Edition)
**Status:** ✅ Production Ready
