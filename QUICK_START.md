# AstroCRM v3 - Quick Start & Troubleshooting

## ✅ System is Ready!

### Fixed Issues:
1. ✅ **PostgreSQL Migration** - Complete (SQLite → PostgreSQL 17)
2. ✅ **AI Helper** - Optional (doesn't block startup)
3. ✅ **Database** - Auto-creates tables on first run
4. ✅ **TypeScript** - Zero build errors

---

## 🚀 Start the Application (3 Ways)

### Option 1: Double-Click (Easiest - Windows)
```
F:\Programming_project\Asto_CRMv3\Astro_CRM\START.bat
```
This opens 2 command windows automatically.

### Option 2: Manual Start (All Platforms)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Option 3: One Terminal (Sequential)
```bash
cd backend && npm run dev &
cd frontend && npm run dev
```

---

## ✅ Verify Everything Works

### Backend Started Successfully ✅
Look for these messages:
```
🚀 CRM API Server v3.0.0 - Retail Edition
📡 Server running on http://localhost:3001
Database initialized successfully (PostgreSQL)
```

### Frontend Started Successfully ✅
Look for these messages:
```
VITE v7.3.1 ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Open the App
Go to: **http://localhost:5173**

---

## 🎯 First Steps

### 1. Create an Account
- Click **"Sign Up"**
- Enter email and password
- Click **"Create Account"**

### 2. View Dashboard
- Should see KPI cards with customer/revenue data
- If empty, import sample data (next step)

### 3. Import Sample Data
- Click **"Import"** tab
- Click **"Upload File"**
- Download: `sample-data/sample-customers-large.csv`
- Upload the file
- Click **"Import Customers"**
- ✅ 550 customers imported!

### 4. Explore Features
- **Customers**: Add/edit/delete customers
- **Inventory**: Manage products & stock
- **Purchases**: Track orders
- **Reports**: Generate reports
- **Analytics**: Run ML segmentation

---

## 🔧 Troubleshooting

### Backend won't start: "Cannot connect to database"

**Solution:**
```bash
# Check PostgreSQL is running:
PGPASSWORD=postgres "/c/Program Files/PostgreSQL/17/bin/psql.exe" -U postgres -h localhost -d astrocrm -c "SELECT 1"

# Should return: 1 (success)
```

### Backend stuck on startup

**What it says:**
```
Database initialized successfully (PostgreSQL)
```
✅ **This is normal** - wait 10 seconds, it's loading

### Port 3001 or 5173 already in use

**Solution:** Kill the process using the port
```bash
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change port in backend/.env:
PORT=3002
```

### "Missing ASI_ONE_API_KEY" warning

✅ **This is normal** - AI features are optional
- Backend will start ✅
- All core features work ✅
- AI chat disabled (optional feature)

### Frontend shows white screen / "Cannot reach API"

**Check:**
1. Backend console shows "listening on port 3001" ✅
2. Open http://localhost:3001/api/health
   - Should return `{"status":"ok","version":"3.0.0",...}`
3. Check browser console (F12 → Console) for errors

### Import fails / No data shows up

**Check:**
1. File is CSV or XLSX format ✅
2. Headers match expected format
3. No special characters in data ✅
4. Check browser console for error message

---

## 📊 Features Quick Reference

| Feature | Shortcut | Status |
|---------|----------|--------|
| Dashboard | Top navbar | ✅ Core |
| Customers | Tab | ✅ Core |
| Inventory | Tab | ✅ Core |
| Purchases | In Customers | ✅ Core |
| Import | Tab | ✅ Core |
| Campaigns | Tab | ✅ Core |
| Analytics | Tab | ✅ Core |
| Reports | Tab | ✅ Core |
| Online Store | Tab | ✅ Core |
| Admin | Tab | ✅ Core |
| AI Chat | Tab | ⚠️ Optional (needs key) |
| Google Sheets | Import → Sheets | ⚠️ Optional (needs setup) |

---

## 📁 Important Files

```
Astro_CRM/
├── backend/
│   ├── .env                 ← PostgreSQL config (update password if needed)
│   ├── src/database/        ← Database layer (PostgreSQL)
│   └── src/routes/          ← All API endpoints
├── frontend/
│   ├── src/pages/           ← All pages (Customers, Inventory, etc.)
│   └── src/components/      ← Reusable UI components
├── sample-data/             ← Sample CSV files (import these!)
├── START.bat                ← Start app (Windows)
├── README.md                ← Full setup guide
└── POSTGRESQL_QUICKSTART.md ← PostgreSQL reference
```

---

## 🗄️ Database Schema

12 PostgreSQL tables auto-created:

1. **users** - User accounts
2. **customers** - Customer data
3. **purchases** - Orders/purchases
4. **products** - Product catalog
5. **inventory_transactions** - Stock history
6. **campaigns** - Marketing campaigns
7. **campaign_sends** - Individual messages sent
8. **customer_segments** - ML clustering results
9. **google_sheets_sync** - Sync configuration
10. **store_settings** - Online store config
11. **online_orders** - Storefront orders
12. **coupons** - Discount codes

Auto-initialized on first backend startup ✅

---

## 🔐 Default Credentials

**PostgreSQL:**
- User: `postgres`
- Password: `postgres` (set during install)
- Host: `localhost`
- Port: `5432`
- Database: `astrocrm`

**App:**
- Create new account in Sign Up
- No default login

---

## 🎮 Test Data

Import sample files (550 records each):
```
sample-data/sample-customers-large.csv     → 550 customers
sample-data/sample-products-large.csv      → 550 products
```

In app:
1. **Import** tab
2. Upload a file
3. Preview and click Import ✅

---

## 📞 API Endpoints (Developer Reference)

```
Core:
  POST   /api/auth/register              - Create account
  POST   /api/auth/login                 - Login
  GET    /api/health                     - Health check

Customers:
  GET    /api/customers                  - List (paginated)
  POST   /api/customers                  - Create
  PUT    /api/customers/:id              - Update
  DELETE /api/customers/:id              - Delete

Products:
  GET    /api/products                   - List all
  POST   /api/products                   - Create
  PUT    /api/products/:id               - Update
  DELETE /api/products/:id               - Delete

Inventory:
  GET    /api/inventory/dashboard-stats  - Stock KPIs
  POST   /api/inventory/scan-barcode     - Barcode scan
  GET    /api/inventory/transactions     - History

Purchases:
  GET    /api/purchases                  - List
  POST   /api/purchases                  - Create
  DELETE /api/purchases/:id              - Delete

Campaigns:
  GET    /api/campaigns                  - List
  POST   /api/campaigns                  - Create
  POST   /api/campaigns/:id/send         - Send

Reports:
  POST   /api/reports/sales              - Sales report
  POST   /api/reports/customers          - Customer report
```

Full list in README.md or check routes/ folder

---

## 📱 Mobile Access

Works on mobile/tablet:
1. Get your computer's IP address
2. On mobile, go to: `http://<YOUR_IP>:5173`
3. Login and use app
4. Full responsive design ✅

---

## 🚨 Emergency Reset

**Clear all data (start fresh):**

```bash
# 1. Delete database
PGPASSWORD=postgres "/c/Program Files/PostgreSQL/17/bin/psql.exe" -U postgres -h localhost -c "DROP DATABASE astrocrm;"

# 2. Recreate database
PGPASSWORD=postgres "/c/Program Files/PostgreSQL/17/bin/psql.exe" -U postgres -h localhost -c "CREATE DATABASE astrocrm;"

# 3. Restart backend
cd backend && npm run dev
```

Tables auto-recreate on startup ✅

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Complete setup guide (PostgreSQL, features, troubleshooting) |
| **POSTGRESQL_QUICKSTART.md** | PostgreSQL reference & connection strings |
| **FEATURE_TESTING_CHECKLIST.md** | 15-section test plan for all features |
| **ASTROCRM_FEATURES.md** | Feature descriptions & use cases |
| **CHANGELOG_V3.md** | What changed from v2 to v3 |
| **backend/.env.example** | Environment variable template |

---

## ✅ Production Ready Checklist

- ✅ PostgreSQL database (production-capable)
- ✅ TypeScript strict mode (type-safe)
- ✅ All API endpoints working
- ✅ Error handling implemented
- ✅ Database auto-initialization
- ✅ JWT authentication
- ✅ CORS configured
- ✅ Request logging
- ✅ Mobile responsive
- ✅ Zero build errors
- ✅ Sample data included
- ✅ All 15+ features implemented

---

## 🎉 Next Steps

1. **Start the app**: `START.bat` (Windows) or `npm run dev` (both terminals)
2. **Create account**: Sign up with email
3. **Import test data**: Use sample CSVs
4. **Explore features**: Try each page/action
5. **Run tests**: Use FEATURE_TESTING_CHECKLIST.md
6. **Check console**: Verify no errors (F12 → Console)

---

**Everything is ready to use!** 🚀

Questions? Check the troubleshooting section above or review README.md

Happy building! 🎊
