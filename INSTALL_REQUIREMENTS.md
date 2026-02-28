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

## Host Frontend on Netlify (Hackathon)
Netlify will host the `frontend` app. Backend API should be hosted separately (for example Render/Railway).

### 1) Push code to GitHub
Make sure this repo is pushed to GitHub.

### 2) Create site in Netlify
- Netlify Dashboard → **Add new site** → **Import from Git**
- Select this repository

### 3) Set build settings
If Netlify is building from repo root, use:

```text
Base directory: frontend
Build command: npm run build
Publish directory: dist
```

`frontend/netlify.toml` is already included for SPA redirect support.

### 4) Add environment variable in Netlify
In Netlify site settings → **Environment variables**, add:

```text
VITE_API_BASE_URL=https://<your-backend-domain>/api
```

Example:

```text
VITE_API_BASE_URL=https://astro-crm-api.onrender.com/api
```

### 5) Deploy
Click **Deploy site**. After deployment, your frontend URL will be:

```text
https://<your-site-name>.netlify.app
```

## Host Full Project on Render (Frontend + Backend)
Render can host both services from this same repository.

### Option A) Blueprint deploy (recommended)
This project includes `render.yaml` at repo root.

1. Push latest code to GitHub
2. In Render: **New +** → **Blueprint**
3. Select this repository
4. Render will create:
	 - `astro-crm-api` (Node web service from `backend`)
	 - `astro-crm-web` (Static site from `frontend`)

After first deploy, update this env var in `astro-crm-web`:

```text
VITE_API_BASE_URL=https://<your-real-backend-service>.onrender.com/api
```

Then trigger a redeploy of `astro-crm-web`.

### Option B) Manual services
Create these two Render services manually from the same repository.

#### 1) Backend service (Web Service)
```text
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm run start
Environment Variables:
	NODE_ENV=production
	JWT_SECRET=<strong-random-secret>
```

#### 2) Frontend service (Static Site)
```text
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
Environment Variables:
	VITE_API_BASE_URL=https://<backend-service>.onrender.com/api
```

For SPA routing on Render Static Site, add rewrite:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```
