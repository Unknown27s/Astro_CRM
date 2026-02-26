# Install Requirements (Astro CRM)

## Prerequisites
- Node.js **18+**
- npm (comes with Node.js)

## Fast Install (Windows PowerShell)
Run this from the project root (`Astro_CRM`):

```powershell
cd backend; npm.cmd install; cd ..\frontend; npm.cmd install
```

If PowerShell blocks `npm` with execution policy errors, use `npm.cmd` in all commands.

## Fast Install (macOS/Linux)
Run this from the project root (`Astro_CRM`):

```bash
cd backend && npm install && cd ../frontend && npm install
```

## Install Each Pack Separately
### Backend
```bash
cd backend
npm.cmd install
```

### Frontend
```bash
cd frontend
npm.cmd install
```

## Optional: Install specific runtime packages manually
### Backend runtime packages
```bash
cd backend
npm.cmd install express cors sql.js multer csv-parser exceljs jsonwebtoken pdfkit dotenv
```

### Frontend runtime packages
```bash
cd frontend
npm.cmd install react react-dom react-router-dom axios @tanstack/react-table recharts papaparse lucide-react
```

## Start after installation
### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```
