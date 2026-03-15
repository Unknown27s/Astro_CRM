# AstroCRM v3 - Complete Installation & Startup Guide

**Last Updated:** March 2026
**Status:** ✅ Production Ready | PostgreSQL 17 | Zero Build Errors

---

## 🚀 Quick Links

- **5-Minute Setup:** [Jump to "I'm in a hurry"](#-im-in-a-hurry---5-minute-setup)
- **Step-by-Step:** [Jump to "Let me do it step by step"](#step-by-step-installation)
- **Troubleshooting:** [Jump to Troubleshooting](#-troubleshooting)

---

## ⏱️ I'm in a hurry - 5-Minute Setup

### Windows Only:
```bash
# 1. Make sure PostgreSQL 17 is installed and running
# 2. Double-click this file:
START.bat
```

That's it! The app opens on http://localhost:5173

**If that doesn't work, follow the step-by-step guide below.**

---

## Step-by-Step Installation

### STEP 1: Install PostgreSQL (Choose Your OS)

#### Windows
1. **Download PostgreSQL 17:**
   - Go to: https://www.postgresql.org/download/windows/
   - Click **"Download the installer"**
   - Download version **17.x** (latest)

2. **Run the installer:**
   - Double-click `postgresql-17.x-x64.exe`
   - **Important:** Remember the password you set for the `postgres` user (you'll need it)
   - Default settings are fine, just click **Next** through all steps

3. **Verify installation:**
   ```bash
   # Open PowerShell or Command Prompt and run:
   psql --version
   ```
   Should show: `psql (PostgreSQL) 17.x ...`

---

#### macOS
```bash
# Use Homebrew (easiest method)
brew install postgresql@17
brew services start postgresql@17

# Verify:
psql --version
```

---

#### Linux (Ubuntu/Debian)
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql-17 postgresql-contrib-17

# Start PostgreSQL service
sudo systemctl start postgresql

# Verify:
psql --version
```

---

### STEP 2: Create the Database

#### Windows (PowerShell or Command Prompt):
```bash
# This command creates the database and doesn't require a password prompt
# Replace "postgres" with your PostgreSQL password if different:

PGPASSWORD=postgres "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE astrocrm;"

# Verify database was created:
PGPASSWORD=postgres "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "\l"
```

You should see `astrocrm` in the list of databases.

---

#### macOS/Linux:
```bash
# Create database
psql -U postgres -h localhost -c "CREATE DATABASE astrocrm;"

# Or if you have password:
PGPASSWORD=your_password psql -U postgres -h localhost -c "CREATE DATABASE astrocrm;"

# Verify:
psql -U postgres -h localhost -c "\l"
```

---

### STEP 3: Configure Environment

1. **Navigate to the backend folder:**
   ```bash
   cd F:\Programming_project\Asto_CRMv3\Astro_CRM\backend
   # OR on Mac/Linux:
   cd ~/path/to/Asto_CRM/backend
   ```

2. **Check if `.env` file exists:**
   - Look for `backend/.env` file
   - If it doesn't exist, copy it from `.env.example`:
     ```bash
     cp .env.example .env
     ```

3. **Edit `.env` with your PostgreSQL credentials:**
   ```bash
   PG_USER=postgres
   PG_PASSWORD=postgres  # Your password from Step 1
   PG_HOST=localhost
   PG_PORT=5432
   PG_DATABASE=astrocrm
   ```

   **On Windows:** Use Notepad to edit `backend\.env` file

---

### STEP 4: Install Dependencies

**Terminal 1 - Backend:**
```bash
cd backend
npm install
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
```

---

### STEP 5: Start the Application

#### Option A: Automatic (Windows Only)
```bash
# From the main folder, double-click:
START.bat
```

#### Option B: Manual (All Platforms)

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run dev
```

Wait for: `📡 Server running on http://localhost:3001`

**Terminal 2 - Start Frontend (in a NEW terminal):**
```bash
cd frontend
npm run dev
```

Wait for: `➜  Local: http://localhost:5173`

#### Option C: Sequential (Single Terminal)
```bash
cd backend && npm run dev &
cd frontend && npm run dev
```

---

## ✅ Verify Everything Works

### Backend Check ✅
Look for these messages in Terminal 1:
```
Database initialized successfully (PostgreSQL)
🚀 CRM API Server v3.0.0 - Retail Edition
📡 Server running on http://localhost:3001
Database initialized successfully (PostgreSQL)
```

### Frontend Check ✅
Look for these messages in Terminal 2:
```
VITE v7.x.x ready in XXX ms
➜  Local:   http://localhost:5173/
```

### Open the App ✅
Go to: **http://localhost:5173**

---

## 🎯 First Time Startup Steps

### 1. Create an Account
- Click **"Sign Up"** or **"Don't have an account?"**
- Enter email and password
- Click **"Create Account"**

### 2. View Dashboard
- Should see empty dashboard (no data yet)
- Click on different tabs to explore

### 3. Import Sample Data (Optional)
- Click **"Import"** tab
- Click **"Upload File"**
- Download sample data:
  - `sample-data/sample-customers-large.csv` → 550 customers
  - `sample-data/sample-products-large.csv` → 550 products
- Upload the file
- Click **"Import Customers"** or **"Import Products"**
- ✅ Data now visible in Dashboard and Customers tab

---

## 🔧 Troubleshooting

### ❌ "PostgreSQL not installed"
```bash
# Windows - Check if psql is in PATH:
psql --version

# If it fails, add PostgreSQL to PATH:
# Control Panel → System → Edit Environment Variables
# Add to PATH: C:\Program Files\PostgreSQL\17\bin
```

### ❌ "Cannot connect to database"
```bash
# Windows - Check if PostgreSQL is running:
# Open Services → Look for "postgresql-x64-17" → Should be "Running"

# Or restart PostgreSQL:
PGPASSWORD=postgres "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "SELECT 1"
# Should return: 1 (success)
```

### ❌ "Database astrocrm does not exist"
```bash
# Create it again:
PGPASSWORD=postgres "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE astrocrm;"

# Verify:
PGPASSWORD=postgres "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "\l"
```

### ❌ "Port 3001 or 5173 already in use"
```bash
# Windows - Find and kill the process:
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Or change the port in backend/.env:
PORT=3002
```

### ❌ "Backend shows white screen or API not responding"
```bash
# Check if backend is running:
curl http://localhost:3001/api/health

# Should return:
# {"status":"ok","version":"3.0.0",...}

# If not, restart backend:
# Kill Terminal 1, run: cd backend && npm run dev
```

### ❌ "TypeScript errors when starting"
```bash
# Clear node_modules and reinstall:
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev

# Do the same for frontend if needed
```

### ❌ "AI features show error about API key"
```bash
# This is NORMAL - AI features are optional
# To enable: Get API key from ASI:One and go to:
# Online Store → Customize tab → Enter API Key
# Save
```

---

## 📊 Database Schema (Auto-Created)

When the backend starts, these tables are automatically created:

1. **users** - User accounts & authentication
2. **customers** - Customer information
3. **purchases** - Customer orders/transactions
4. **products** - Product catalog
5. **inventory_transactions** - Stock movement history
6. **campaigns** - Marketing campaigns
7. **campaign_sends** - Individual campaign messages
8. **customer_segments** - ML clustering results
9. **google_sheets_sync** - Sheets sync configuration
10. **store_settings** - Online store configuration
11. **online_orders** - Storefront orders
12. **coupons** - Discount codes

**No manual setup needed** - All created automatically! ✅

---

## 📁 File Structure

```
Astro_CRM/
├── backend/
│   ├── .env                    ← PostgreSQL credentials (EDIT THIS)
│   ├── .env.example            ← Template (reference)
│   ├── package.json
│   └── src/
│       ├── database/           ← Database layer
│       │   ├── db.ts
│       │   ├── schema-pg.sql
│       │   ├── migrate-v3.ts
│       │   └── migrate-shop.ts
│       ├── routes/             ← API endpoints
│       └── server.ts           ← Main server file
├── frontend/
│   ├── package.json
│   └── src/
│       ├── pages/              ← All pages
│       ├── components/         ← UI components
│       └── services/           ← API client
├── sample-data/                ← Test CSV files
├── START.bat                   ← Quick start (Windows)
├── README.md                   ← Full documentation
├── QUICK_START.md              ← Quick reference
├── POSTGRESQL_QUICKSTART.md    ← Database reference
└── FEATURE_TESTING_CHECKLIST.md ← Test all features
```

---

## 🔐 Credentials

### PostgreSQL (Database)
```
User:     postgres
Password: postgres  (or whatever you set during install)
Host:     localhost
Port:     5432
Database: astrocrm
```

### AstroCRM App
```
Email:    Create during signup
Password: Create during signup
No default login - signup first!
```

---

## 🎮 Testing the Installation

### Minimal Test (2 minutes)
```bash
# Everything should be running
# Go to: http://localhost:5173
# 1. Sign up with any email
# 2. Click "Customers" tab
# 3. Add a customer
# 4. Should see them in the list
```

### Full Test (10 minutes)
Follow the **FEATURE_TESTING_CHECKLIST.md** in the project root (400+ test cases)

---

## 🚀 Production Deployment

### Build for Production:
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Deploy:
- Backend: `backend/dist/` folder
- Frontend: `frontend/dist/` folder
- Database: PostgreSQL 17 running on your server

---

## 📞 Common Issues Quick Fix

| Issue | Solution |
|-------|----------|
| PostgreSQL won't start | Restart Windows or run `pg_ctl start` |
| Database doesn't exist | Run CREATE DATABASE command again |
| Can't find psql | Add `C:\Program Files\PostgreSQL\17\bin` to PATH |
| Ports in use | Kill process with `taskkill` or change port in `.env` |
| White screen | Check browser console (F12) for errors |
| Slow startup | Normal - first startup runs migrations (takes 10-20 seconds) |
| Node command not found | Install Node.js from nodejs.org |

---

## ✨ What to Do Next

1. **✅ Start the app** - Run `START.bat` or manual steps above
2. **✅ Create account** - Sign up with any email
3. **✅ Import data** - Use sample CSVs from `sample-data/` folder
4. **✅ Explore features** - Click through all tabs
5. **✅ Test checklist** - Use `FEATURE_TESTING_CHECKLIST.md` to verify everything
6. **✅ Read docs** - Check `README.md` for detailed features

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Complete feature guide & technical details |
| **QUICK_START.md** | Quick reference guide |
| **POSTGRESQL_QUICKSTART.md** | PostgreSQL-specific reference |
| **FEATURE_TESTING_CHECKLIST.md** | Test plan for all 15+ features |
| **INSTALL_AND_START.md** | This file - installation guide |

---

## 🎉 You're Ready!

Your AstroCRM system is now:
- ✅ PostgreSQL 17 configured
- ✅ Database created automatically
- ✅ Backend API running
- ✅ Frontend ready to use
- ✅ Production-ready code

**Time to launch: 5-10 minutes** ⏱️

### Next: Start the app!
```bash
# Windows
START.bat

# Or manually
cd backend && npm run dev &
cd frontend && npm run dev
```

**Questions?** Check the troubleshooting section or see README.md for more details.

**Happy building!** 🚀
