# 🚀 AstroCRM v3.0 — AI-Powered Customer Relationship Management

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql&logoColor=white)
![AI](https://img.shields.io/badge/AI-ASI:One-8B5CF6?logo=openai&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

> A full-stack, AI-powered retail CRM with ML analytics, sales pipeline, real-time dashboards, and an intelligent chatbot — built with React, Node.js, PostgreSQL, and ASI:One AI.

**Created by AH AH Coders × Claude AI** 🤝

---

## ✨ Key Features

### 🧠 AI-Powered Intelligence
- **DB-Aware AI Chatbot** — Ask natural language questions like *"Who is my top customer?"* and get answers from your real database
- **AI Description Helper** — ✨ AI Suggest button auto-writes professional descriptions for activities, deals, and notes
- **AI Dashboard Summary** — One-click executive briefing of your business health
- **AI Segment Explainer** — Plain-English explanations of your customer clusters
- **AI Campaign Generator** — Generates SMS marketing copy tailored to your audience
- **AI Customer Risk Assessment** — Predicts individual customer churn probability
- **AI Sales Forecasting** — Revenue projection with confidence scoring
- **AI Report Summaries** — Executive-level automated report narratives

### 📊 7 ML Analytics Modules
| Module | What It Does |
|--------|-------------|
| **K-Means Segmentation** | Groups customers into behavioral clusters (Champions, Loyal, At-Risk, Lost) |
| **RFM Analysis** | Scores every customer on Recency, Frequency, and Monetary value (1-5 scale) |
| **Churn Risk Prediction** | Identifies at-risk customers with risk scores and recommended actions |
| **Customer LTV** | Predicts 3-year Customer Lifetime Value with tier classification |
| **Product Affinity** | Discovers which products are frequently purchased together |
| **Revenue Forecasting** | 90-day trend analysis with 7-day moving average and projections |
| **Cohort Analysis** | Monthly acquisition cohorts with retention rates and revenue tracking |

### 🤝 Sales Pipeline (Deals)
- Visual Kanban-style pipeline with drag-and-drop stage changes
- Stages: Lead → Qualified → Proposal → Negotiation → Closed Won / Closed Lost
- **Auto-sync**: When a deal is won/lost, customer's `total_spent` and `total_purchases` are automatically updated
- Deal stats visible on Customer detail page (Won / Active / Lost counts with values)

### 👥 Customer 360° View
- Contact information with phone, email, location
- **Purchase History** with itemized breakdowns
- **Deals & Pipeline** section showing deal stats and list
- **Notes & Interactions** — Add, pin, delete notes by type (General, Call, Meeting, Complaint, Feedback, Internal)
- **Activities & Follow-Ups** — View linked tasks, calls, meetings with overdue alerts

### 📋 Tasks & Activities
- Stats dashboard (Total / Pending / Completed / Overdue)
- Filter by type (Call, Meeting, Email, Task, Follow-up, Note)
- Filter by priority and completion status
- Toggle completion, CRUD operations via modals
- Associate activities with customers

### 📈 Dashboard & Insights
- Real-time KPIs: Total Customers, Active, Revenue, VIP count
- Revenue trend charts and growth metrics
- AI-powered dashboard summary with one click

### 📣 Campaigns
- SMS/Email campaign management
- Audience targeting by customer segment
- AI-generated campaign messages
- Send tracking per customer

### 📄 Reports
- PDF and Excel export
- Sales, Customer, and Segment reports
- AI-generated executive summaries
- Monthly business reports with date filtering

### 🛒 Online Store
- Public storefront with product display
- Cart, checkout, and order management
- Coupon/discount code system
- QR code generation for products

### 📦 Inventory / Stock Management
- Product catalog with SKU tracking
- Stock in/out transactions with audit trail
- Low stock alerts
- Barcode scanning support

### 📤 Data Import
- CSV and XLSX file import for customers and products
- Google Sheets auto-sync (every 60 seconds)
- Smart field mapping

### 👤 User Roles
- Admin / Manager / Viewer role-based access
- JWT authentication with token refresh

---

## 🛠 Technology Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js + TypeScript** | Server runtime |
| **Express.js 4** | REST API framework |
| **PostgreSQL 17** | Relational database |
| **pg (node-postgres)** | Database driver with connection pooling |
| **ASI:One (OpenAI-compatible)** | AI/ML inference engine |
| **pdfkit** | PDF report generation |
| **exceljs** | Excel report generation |
| **jsonwebtoken** | JWT authentication |
| **multer** | File upload handling |
| **csv-parser** | CSV file parsing |
| **node-cron** | Scheduled tasks |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19 + TypeScript** | UI framework |
| **Vite 7** | Build tool and dev server |
| **React Router v7** | Client-side routing |
| **Tailwind CSS 3** | Utility-first CSS framework |
| **Recharts** | Charts and data visualization |
| **Lucide React** | Icon library (200+ icons) |
| **Axios** | HTTP client with interceptors |
| **react-hot-toast** | Toast notifications |
| **Radix UI** | Headless UI primitives (Dialog, Dropdown) |
| **html2canvas + jspdf** | Client-side PDF generation |

### Database
| Table | Purpose |
|-------|---------|
| `users` | User accounts and authentication |
| `customers` | Customer contact information and aggregates |
| `purchases` | Purchase/order records with itemized details |
| `products` | Product catalog with prices and stock |
| `inventory_transactions` | Stock movement audit trail |
| `campaigns` | Email/SMS marketing campaigns |
| `campaign_sends` | Individual campaign message records |
| `customer_segments` | K-means clustering results |
| `store_settings` | Online store configuration |
| `online_orders` | Orders from online storefront |
| `coupons` | Discount codes and promotions |
| `deals` | Sales pipeline deals |
| `activities` | CRM activity tracking (calls, meetings, tasks) |
| `notes` | Customer interaction notes |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 17
- Git

### Setup

```bash
# 1. Clone the project
git clone <your-repo-url>
cd Astro_CRM

# 2. Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE astrocrm;"

# 3. Configure backend
cd backend
cp .env.example .env   # Edit with your DB credentials
npm install

# 4. Configure frontend
cd ../frontend
npm install

# 5. Start backend (Terminal 1)
cd backend
npm run dev
# → Listening on port 3001

# 6. Start frontend (Terminal 2)
cd frontend
npm run dev
# → http://localhost:5173
```

### Environment Variables (`backend/.env`)
```env
PORT=3001
JWT_SECRET=your-secret-key
PG_USER=postgres
PG_PASSWORD=postgres
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=astrocrm
ASI_ONE_API_KEY=your-asi-one-api-key  # For AI features
```

---

## 📁 Project Structure

```
Astro_CRM/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.ts                # PostgreSQL connection & helpers
│   │   │   └── schema-pg.sql        # Database schema
│   │   ├── routes/
│   │   │   ├── ai.ts                # AI endpoints (chat, summary, forecast)
│   │   │   ├── aihelper.ts          # ASI:One integration + DB query templates
│   │   │   ├── analytics.ts         # ML analytics (K-means, RFM, Churn, LTV, etc.)
│   │   │   ├── activities.ts        # Activity/task tracking
│   │   │   ├── campaigns.ts         # Marketing campaigns
│   │   │   ├── customers.ts         # Customer CRUD + deal sync
│   │   │   ├── deals.ts             # Sales pipeline + customer sync
│   │   │   ├── insights.ts          # Business insights/metrics
│   │   │   ├── notes.ts             # Customer notes/interactions
│   │   │   ├── products.ts          # Product catalog
│   │   │   ├── purchases.ts         # Purchase tracking
│   │   │   └── reports.ts           # PDF/Excel report generation
│   │   ├── services/
│   │   │   └── mlService.ts         # K-means clustering implementation
│   │   └── server.ts                # Express server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # Reusable UI components (Button, Card, Modal, etc.)
│   │   │   ├── AIAssistant.tsx      # Floating AI chatbot panel
│   │   │   └── Layout.tsx           # App layout with sidebar navigation
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Main dashboard with KPIs
│   │   │   ├── Customers.tsx        # Customer 360° (Notes, Deals, Activities, Purchases)
│   │   │   ├── Deals.tsx            # Sales pipeline Kanban board
│   │   │   ├── Activities.tsx       # Task & activity management
│   │   │   ├── Analytics.tsx        # 7 ML analytics modules (tabbed)
│   │   │   ├── Campaigns.tsx        # Campaign management
│   │   │   ├── Insights.tsx         # Business insights & trends
│   │   │   ├── Reports.tsx          # Report generation
│   │   │   └── ...                  # Stock, Store, Import, Users pages
│   │   ├── services/
│   │   │   └── api.ts               # Centralized API service layer
│   │   └── App.tsx                  # Root component with routing
│   └── package.json
├── sample-data/                     # Sample CSV/XLSX files for testing
└── README.md                        # This file
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers |
| GET | `/api/customers/:id` | Get customer + deals + purchases |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Delete customer |

### Deals Pipeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deals` | List all deals |
| POST | `/api/deals` | Create deal |
| PUT | `/api/deals/:id` | Update deal (auto-syncs customer) |
| PATCH | `/api/deals/:id/stage` | Change deal stage (Kanban drag) |
| DELETE | `/api/deals/:id` | Delete deal |

### AI Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | DB-aware AI chatbot |
| POST | `/api/ai/autocomplete` | AI description helper |
| POST | `/api/ai/dashboard-summary` | AI dashboard briefing |
| POST | `/api/ai/explain-analytics` | AI segment explanation |
| POST | `/api/ai/generate-campaign` | AI campaign copy |
| POST | `/api/ai/customer-risk` | AI churn assessment |
| POST | `/api/ai/sales-forecast` | AI revenue prediction |
| POST | `/api/ai/report-summary` | AI report narrative |

### ML Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analytics/segment-customers` | Run K-means clustering |
| GET | `/api/analytics/segments` | Get segment results |
| GET | `/api/analytics/rfm-analysis` | RFM scoring |
| GET | `/api/analytics/churn-risk` | Churn prediction |
| GET | `/api/analytics/customer-ltv` | Customer LTV |
| GET | `/api/analytics/product-affinity` | Product affinity |
| GET | `/api/analytics/revenue-forecast` | Revenue forecasting |
| GET | `/api/analytics/cohort-analysis` | Cohort analysis |

---

## 🧪 Sample Data

Sample data files in `sample-data/` folder:
- `sample-customers-large.csv` — 550 realistic customer records
- `sample-products-large.csv` — 550 product records with inventory

Import via the **Import Data** page.

---

## 🔒 Security

- JWT-based authentication with token expiry
- Password hashing with bcrypt
- Role-based access control (Admin / Manager / Viewer)
- API route protection via middleware

---

## 📜 License

MIT License

---

## 👨‍💻 Authors

**Created by AH AH Coders × Claude AI** 🤝

Built with ❤️ using React, Node.js, PostgreSQL, TypeScript, ASI:One AI, and Machine Learning

---

## 🆘 Support

1. Check the **Troubleshooting** section in the old README
2. Check backend logs: `cd backend && npm run dev`
3. Check frontend console: Browser → F12 → Console tab
4. Check database: `psql -U postgres -d astrocrm`
