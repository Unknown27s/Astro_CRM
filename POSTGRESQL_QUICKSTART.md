# PostgreSQL Setup - Quick Reference Guide

## TL;DR - 5 Steps to Get Running

### 1️⃣ Download PostgreSQL 17
- **Windows**: https://www.postgresql.org/download/windows/ → Download EDB installer
- **macOS**: `brew install postgresql@17 && brew services start postgresql@17`
- **Linux**: `sudo apt install postgresql` or `sudo dnf install postgresql`

### 2️⃣ During Installation (Windows)
- Set password to: **`postgres`**
- Port: **`5432`** (default)
- Start service automatically ✅

### 3️⃣ Create AstroCRM Database
```bash
psql -U postgres
psql> CREATE DATABASE astrocrm;
psql> \q
```

Or using pgAdmin GUI:
1. Open pgAdmin 4
2. Right-click Databases → Create → Database
3. Name: `astrocrm` → Save

### 4️⃣ Setup Backend
```bash
cd backend
# Verify .env file has:
PG_USER=postgres
PG_PASSWORD=postgres
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=astrocrm
```

### 5️⃣ Run the App
```bash
# Terminal 1
cd backend
npm install
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

Visit: **http://localhost:5173**

---

## Verify Everything Works

### Check PostgreSQL
```bash
# Should show version
psql --version

# Should connect successfully
psql -U postgres -d astrocrm
psql> \dt  # Shows tables
psql> \q   # Quit
```

### Check Backend (Terminal 1)
```
listening on port 3001
Database initialized successfully (PostgreSQL)
```

### Check Frontend (Terminal 2)
```
VITE v7.3.1 ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

## Common Problems & Solutions

| Problem | Solution |
|---------|----------|
| `psql: command not found` | Add PostgreSQL bin to PATH: `C:\Program Files\PostgreSQL\17\bin` |
| `Cannot connect to database` | PostgreSQL service not running - start it from Services or Terminal |
| `Database astrocrm does not exist` | Run: `psql -U postgres -c "CREATE DATABASE astrocrm;"` |
| `Password authentication failed` | Verify .env `PG_PASSWORD` matches your PostgreSQL password |
| `Port 5432 already in use` | Change port in `.env`: `PG_PORT=5433` |
| Backend won't start | Check `.env` file exists in `backend/` directory |
| Frontend won't load | Check backend is running: `cd backend && npm run dev` |

---

## Connection String Reference

**Node-postgres connection string** (used by backend):
```
postgresql://postgres:postgres@localhost:5432/astrocrm
```

**psql CLI command:**
```bash
psql -U postgres -h localhost -p 5432 -d astrocrm
```

**Environment variables** (in `.env`):
```
PG_USER=postgres
PG_PASSWORD=postgres
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=astrocrm
```

---

## PostgreSQL Versions Tested

| OS | Version | Status |
|----|---------|--------|
| Windows 10/11 | 17.9 | ✅ Tested |
| macOS | 17.x | ✅ Recommended |
| Linux (Ubuntu) | 17.x | ✅ Recommended |
| Linux (Fedora) | 17.x | ✅ Recommended |

---

## Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database server |
| Backend API | 3001 | Express.js server |
| Frontend UI | 5173 | Vite development server |
| pgAdmin | 5050 | PostgreSQL GUI (optional) |

---

## Change Password (if needed)

```bash
# Connect to PostgreSQL
psql -U postgres

# Change password
psql> ALTER USER postgres WITH PASSWORD 'new_password';

# Exit
psql> \q

# Update .env file
PG_PASSWORD=new_password
```

---

## Data Import Files

Sample data available in `sample-data/`:
- `sample-customers-large.csv` - 550 customers
- `sample-products-large.csv` - 550 products

Upload via the **Import** tab in the app.

---

## Production Deployment Tips

1. **Use strong password**: Don't use `postgres` in production
2. **Remote connection**: Update `PG_HOST` to your database server
3. **SSL support**: Enable SSL for remote connections
4. **Backups**: Regular `pg_dump` backups scheduled
5. **Monitoring**: Monitor server resources and query performance

```bash
# Backup database
pg_dump -U postgres astrocrm > astrocrm_backup.sql

# Restore from backup
psql -U postgres astrocrm < astrocrm_backup.sql
```

---

**For detailed setup**: See `README.md` in project root.
