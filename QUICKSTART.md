# Quick Start Guide - CRM Pro

## Installation & Setup

### 1. Backend Setup

✅ **Fixed!** The backend now uses `sql.js` (pure JavaScript) instead of `better-sqlite3`, avoiding Windows compilation issues.

```bash
cd backend
npm install
```

This should complete without errors!

### 2. Start Backend

```bash
cd backend
npx tsx src/server.ts
```

You should see:
```
🚀 CRM API Server running on http://localhost:3001
Database initialized successfully
```

Backend runs on: `http://localhost:3001`

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on: `http://localhost:5173`

## First Steps

1. **Register Account**
   - Open http://localhost:5173
   - Click "Don't have an account? Register"
   - Enter email, password, and full name
   - Click "Register"

2. **Import Sample Data**
   - Login to your account
   - Navigate to "Import Data" in sidebar
   - Select "Contacts" as import type
   - Upload `sample-data/sample-contacts.csv`
   - Review field mapping (should auto-map correctly)
   - Click "Import Data"
   - Repeat for "Sales Data" with `sample-data/sample-sales.csv`

3. **Run Customer Segmentation**
   - Navigate to "Analytics"
   - Click "Run Segmentation" button
   - Wait for K-means clustering to complete
   - View customer segments and visualization

4. **Generate Reports**
   - Navigate to "Reports"
   - Select "Sales Report"
   - Choose "Excel" format
   - Click "Generate Report"
   - File downloads automatically

## Troubleshooting

### Backend won't start
- Ensure Node.js 18+ is installed
- Check if port 3001 is available
- Run: `npm install` in backend folder

### Frontend won't start
- Ensure port 5173 is available
- Run: `npm install` in frontend folder

### Database errors
- Delete `backend/data/crm.db` to reset database
- Restart backend server

### Import not working
- Ensure CSV has headers in first row
- Check file encoding (UTF-8 recommended)
- Verify file size < 50MB

## Technical Notes

- **Database**: Uses sql.js (pure JavaScript SQLite) - no native compilation needed
- **Password Hashing**: Uses crypto SHA-256 (demo only - use bcrypt in production)
- **File Storage**: Database saved to `backend/data/crm.db`

## Features to Try

✅ **Dashboard** - View KPIs and sales trends
✅ **Contacts** - Add, edit, search contacts
✅ **Sales** - View pipeline Kanban board
✅ **Analytics** - ML customer segmentation
✅ **Reports** - Generate PDF/Excel reports
✅ **Import** - Bulk import CSV/Excel data

## Next Steps

- Add more contacts and sales data
- Experiment with different cluster counts (4-6 recommended)
- Generate reports with different date ranges
- Explore the API endpoints in the README

Enjoy your CRM Pro system! 🚀
