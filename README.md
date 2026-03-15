# AstroCRM - Customer Relationship Management System

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

A full-featured retail CRM web application with PostgreSQL backend, ML-powered customer segmentation, stock management, online store integration, and comprehensive reporting.

## Features

### Core CRM Functionality
- **Contact Management**: Complete CRUD operations for customer contacts
- **Sales Pipeline**: Visual Kanban board for deal tracking
- **Activity Tracking**: Log calls, meetings, emails, and tasks
- **Dashboard**: Real-time KPIs and metrics

### Stock & Inventory Management
- **Product Catalog**: Manage products with SKU and barcode support
- **Barcode Scanning**: Real-time inventory tracking with barcode camera
- **Stock Transactions**: Complete audit trail of all stock changes (in, out, adjustments)
- **Low Stock Alerts**: Automatic notifications for products below minimum level
- **Multi-channel**: Online store + retail inventory unified

### Data Import & Sync
- **CSV/XLSX Support**: Import customers, products, and inventory data
- **Google Sheets Sync**: Auto-sync every 60 seconds from shared spreadsheets
- **Smart Field Mapping**: Automatic field detection and mapping
- **Bulk Operations**: Process thousands of records efficiently

### ML Analytics
- **K-means Clustering**: Automatic customer segmentation based on RFM analysis
- **Customer Insights**: Identify Champions, Loyal Customers, At-Risk, and Lost segments
- **Visual Analytics**: Interactive scatter plots and charts

### Report Generation
- **Multiple Formats**: Export reports as PDF or Excel
- **Report Types**: Sales reports, customer reports, segment analysis
- **Customizable**: Filter by date range, region, category

### Online Store Integration
- **Product Display**: Browse and purchase products online
- **Cart & Checkout**: Shopping cart with discount codes
- **Order Management**: Track online orders with status updates
- **Coupon System**: Discount codes and promotional campaigns

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 4
- **Database**: PostgreSQL 17 (node-postgres)
- **ML**: Custom K-means implementation
- **File Processing**: multer, csv-parser, exceljs
- **Reports**: pdfkit, exceljs
- **AI Integration**: Groq SDK for AI chat features

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router v7
- **Styling**: Tailwind CSS 3
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Database (PostgreSQL)
- **Version**: PostgreSQL 17
- **Tables**: 12 tables (users, customers, purchases, products, inventory_transactions, campaigns, google_sheets_sync, store_settings, online_orders, coupons, activities, and more)
- **Connection**: Node-postgres (pg) with connection pooling

---

# INSTALLATION GUIDE

## Prerequisites

**Before starting, you MUST install PostgreSQL 17 on your system.**

### Requirements
- Node.js 18+ and npm
- PostgreSQL 17 (see instructions below)
- Git (optional, for version control)

---

## STEP 1: Download & Install PostgreSQL 17

### Windows Installation

#### Option A: Direct Download from EDB (Recommended)

1. **Go to PostgreSQL download page:**
   - Visit: https://www.postgresql.org/download/windows/
   - Click "**Download the installer**" → Download PostgreSQL 17 for Windows x86-64

2. **Run the PostgreSQL Installer:**
   - Double-click the downloaded `.exe` file (e.g., `postgresql-17.9-2-windows-x64.exe`)
   - Click through the setup wizard

3. **Important Setup Options:**

   | Setting | Value |
   |---------|-------|
   | Installation Directory | Use default `C:\Program Files\PostgreSQL\17` |
   | Password | **Set to: `postgres`** (important!) |
   | Port | `5432` (default) |
   | Locale | Your system locale |
   | pgAdmin 4 | ✅ Check (optional, but helpful) |
   | Stack Builder | ❌ Uncheck (not needed) |

4. **Complete the installation:**
   - Click "Finish" to complete
   - PostgreSQL service will start automatically

5. **Verify Installation:**
   - Open Command Prompt or PowerShell
   - Run this command:
   ```bash
   psql --version
   ```
   - You should see: `psql (PostgreSQL) 17.9`

#### Option B: Using Windows Package Manager (if available)

```powershell
winget install PostgreSQL.PostgreSQL.17
```

### macOS Installation

```bash
# Using Homebrew
brew install postgresql@17
brew services start postgresql@17

# Or download DMG from: https://www.postgresql.org/download/macosx/
```

### Linux Installation

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib postgresql-17
sudo systemctl start postgresql
```

**Fedora/RHEL:**
```bash
sudo dnf install postgresql postgresql-server postgresql-contrib
sudo systemctl start postgresql
```

---

## STEP 2: Create the AstroCRM Database

After PostgreSQL is installed and running, create the database.

### Option A: Using Command Line (All Platforms)

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql prompt, run:
CREATE DATABASE astrocrm;
\q
```

### Option B: Using pgAdmin (GUI - Windows/macOS)

1. Open **pgAdmin 4** (installed with PostgreSQL, or access at `http://localhost:5050`)
2. Login with password `postgres`
3. Right-click **Databases** → **Create** → **Database**
4. Name: `astrocrm`
5. Click "Save"

### Verify Database Creation

```bash
psql -U postgres -d astrocrm -c "\dt"
```

---

## STEP 3: Configure Backend Environment

Navigate to the backend directory and create `.env` file with database credentials.

```bash
cd backend
```

**Create `.env` file:** (or copy from `.env.example`)

```env
# Server Configuration
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production

# PostgreSQL Database Configuration
PG_USER=postgres
PG_PASSWORD=postgres
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=astrocrm

# AI/ML Services (optional)
GROQ_API_KEY=gsk_your_groq_api_key_here
```

**Important:**
- `PG_USER`: Default PostgreSQL user is `postgres`
- `PG_PASSWORD`: The password you set during PostgreSQL installation
- `PG_HOST`: `localhost` or `127.0.0.1` for local development
- `PG_PORT`: Default PostgreSQL port is `5432`
- `PG_DATABASE`: Must match the database name you created (`astrocrm`)

---

## STEP 4: Install Project Dependencies

### Backend Setup

```bash
cd backend
npm install
npm run build  # Verify TypeScript compiles
```

### Frontend Setup

```bash
cd frontend
npm install
npm run build  # Verify build succeeds
```

---

## STEP 5: Run the Application

Open **two terminal windows** (or use tab splits).

### Terminal 1: Start Backend API

```bash
cd backend
npm run dev
```

**Expected output:**
```
listening on port 3001
Database initialized successfully (PostgreSQL)
```

### Terminal 2: Start Frontend UI

```bash
cd frontend
npm run dev
```

**Expected output:**
```
  VITE v7.3.1  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### Access the Application

- **Frontend URL**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **pgAdmin (optional)**: http://localhost:5050

---

# USAGE GUIDE

## 1. Register/Login

1. Open http://localhost:5173 in your browser
2. Click "Sign Up" to create a new account
3. Or use existing credentials if available

## 2. Import Data

**Customers:**
1. Navigate to **Import** tab
2. Go to **Upload File** section
3. Upload a CSV or XLSX file with customer data
4. Click "Import Customers"

**Products & Inventory:**
1. Navigate to **Import** tab
2. Go to **Stock Import** section
3. Upload CSV/Excel with product and stock data
4. Click "Import Products"

**Google Sheets Sync:**
1. Navigate to **Import** tab
2. Go to **Google Sheets** section
3. Configure your shared Google Sheets URL
4. Auto-syncs every 60 seconds

## 3. View Dashboard

- See real-time metrics and KPIs
- View sales trends over time
- Check recent activities and alerts

## 4. Manage Customers

1. Go to **Customers** tab
2. View customer list with pagination
3. Click customer name to edit or delete
4. Add new customers with "Add Customer" button
5. Track customer type (buyer/seller/both)
6. View purchase history

## 5. Manage Stock

1. Go to **Inventory** tab
2. View all products with current stock levels
3. Use **Barcode Scanner** to update stock in real-time
4. View transaction history for each product
5. Set minimum/maximum stock levels
6. Get low-stock alerts

## 6. Track Purchases

1. Go to **Customers** tab
2. Click on a customer
3. Add purchase with items and payment method
4. View purchase history and totals

## 7. Run Analytics

1. Click **AI Studio** or **Analytics** tab
2. Run K-means segmentation to identify customer groups
3. View visualizations and insights
4. Export segment data

## 8. Generate Reports

1. Go to **Reports** tab
2. Select report type:
   - **Sales Reports**: Revenue, quantity, trends
   - **Customer Reports**: Details, segments, lifetime value
   - **Inventory Reports**: Stock levels, movements
3. Choose output format: PDF or Excel
4. Download the generated report

---

# DATABASE STRUCTURE

PostgreSQL tables created automatically on first run:

| Table | Purpose |
|-------|---------|
| `users` | User accounts and authentication |
| `customers` | Customer contact information |
| `purchases` | Purchase/order records |
| `products` | Product catalog with prices and stock |
| `inventory_transactions` | Stock movement audit trail |
| `campaigns` | Email/SMS marketing campaigns |
| `campaign_sends` | Individual campaign message records |
| `customer_segments` | ML clustering results |
| `google_sheets_sync` | Google Sheets sync configuration |
| `store_settings` | Online store configuration |
| `online_orders` | Orders from online store |
| `coupons` | Discount codes |

**Auto-initialization:** The database schema is created automatically when the backend starts for the first time.

---

# API ENDPOINTS

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Customers
- `GET /api/customers` - Get all customers (with pagination)
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Inventory
- `POST /api/inventory/products` - Add product to inventory
- `POST /api/inventory/scan-barcode` - Barcode scan (update stock)
- `GET /api/inventory/dashboard-stats` - Stock KPIs
- `GET /api/inventory/transactions` - Stock transaction history

### Purchases
- `POST /api/purchases` - Create purchase
- `GET /api/purchases` - Get all purchases
- `DELETE /api/purchases/:id` - Delete purchase

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/send` - Send campaign

### Google Sheets
- `POST /api/google-sheets/setup` - Configure sync
- `POST /api/google-sheets/import-csv` - Bulk import

### Reports
- `POST /api/reports/sales` - Generate sales report
- `POST /api/reports/customers` - Generate customer report
- `POST /api/reports/inventory` - Generate inventory report

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `POST /api/analytics/segment-customers` - Run K-means clustering
- `GET /api/analytics/segments` - Get segments

---

# TROUBLESHOOTING

## PostgreSQL Issues

### "psql: command not found"
**Solution:** PostgreSQL is not in your system PATH.
1. Add `C:\Program Files\PostgreSQL\17\bin` to your Windows PATH
2. Or use full path: `C:\Program Files\PostgreSQL\17\bin\psql.exe -U postgres`

### "Connection refused" (backend won't start)
**Solution:** PostgreSQL service is not running.
- **Windows:** Search "Services" → Find "postgresql-17" → Click "Start"
- **macOS:** `brew services start postgresql@17`
- **Linux:** `sudo systemctl start postgresql`

### "Database astrocrm does not exist"
**Solution:** Run the database creation command:
```bash
psql -U postgres -c "CREATE DATABASE astrocrm;"
```

### "Password authentication failed"
**Solution:** The `.env` password doesn't match PostgreSQL password.
1. Verify your PostgreSQL password (set during installation)
2. Update `PG_PASSWORD` in backend `.env` file
3. Restart backend: `npm run dev`

### Port 5432 already in use
**Solution:** PostgreSQL is running on a different port or another service uses it.
```bash
# Find what's using port 5432
netstat -ano | findstr :5432  # Windows
lsof -i :5432                  # macOS/Linux

# Or configure PostgreSQL to use different port in .env:
PG_PORT=5433
```

## Backend Issues

### "EADDRINUSE: address already in use :::3001"
**Solution:** Port 3001 is already in use.
```bash
# Kill the process or change port in .env
PORT=3002
```

### "Cannot find module 'pg'"
**Solution:** Dependencies not installed.
```bash
cd backend
npm install
```

### TypeScript build errors
**Solution:** Run type checker before building.
```bash
cd backend
npm run build
```

## Frontend Issues

### "EADDRINUSE: address already in use :::5173"
**Solution:** Port 5173 is already in use.
```bash
cd frontend
npm run dev -- --port 5174
```

### White screen after login
**Solution:** Backend is not running or API calls are failing.
1. Check backend is running: `cd backend && npm run dev`
2. Check browser console for errors (F12 → Console tab)
3. Verify API URL in `.env` or config

---

# BUILD & DEPLOYMENT

### Production Build

```bash
# Backend
cd backend
npm run build
NODE_ENV=production npm start

# Frontend
cd frontend
npm run build
# Deploy dist/ folder to hosting
```

### Environment Variables for Production

**`backend/.env` (Production)**
```env
PORT=3001
NODE_ENV=production
JWT_SECRET=your-very-secure-secret-key-here-change-this

# PostgreSQL (use your production database)
PG_USER=astrocrm_user
PG_PASSWORD=your-secure-password
PG_HOST=your-database-host.com
PG_PORT=5432
PG_DATABASE=astrocrm
```

---

# Sample Data

Sample data files are available in the `sample-data/` folder:
- `sample-customers-large.csv` - 550 realistic customer records
- `sample-products-large.csv` - 550 product records with inventory

Import these files via the **Import** tab to populate test data.

---

# License

MIT

## Author

Built with ❤️ using React, Node.js, PostgreSQL, TypeScript, and Machine Learning

## Support

For issues or questions:
1. Check the **Troubleshooting** section above
2. Check backend logs: `cd backend && npm run dev`
3. Check frontend console: Open browser → F12 → Console tab
4. Check database connection: `psql -U postgres -d astrocrm`
