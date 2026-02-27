# CRM Pro - Customer Relationship Management System

A full-featured CRM web application with ML-powered customer segmentation, data import capabilities, and comprehensive reporting.

## Features

### Core CRM Functionality
- **Contact Management**: Complete CRUD operations for customer contacts
- **Sales Pipeline**: Visual Kanban board for deal tracking
- **Activity Tracking**: Log calls, meetings, emails, and tasks
- **Dashboard**: Real-time KPIs and metrics

### ML Analytics
- **K-means Clustering**: Automatic customer segmentation based on RFM (Recency, Frequency, Monetary) analysis
- **Customer Insights**: Identify Champions, Loyal Customers, At-Risk, and Lost segments
- **Visual Analytics**: Interactive scatter plots and charts

### Data Import
- **CSV/XLSX Support**: Import contacts and sales data from spreadsheets
- **Smart Field Mapping**: Automatic field detection and mapping
- **Bulk Operations**: Process thousands of records efficiently

### Report Generation
- **Multiple Formats**: Export reports as PDF or Excel
- **Report Types**: Sales reports, customer reports, segment analysis
- **Customizable**: Filter by date range, region, category

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite via sql.js (pure JavaScript)
- **ML**: Custom K-means implementation
- **File Processing**: multer, csv-parser, exceljs
- **Reports**: pdfkit, exceljs

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios

## Installation

### Prerequisites
- Node.js 18+ and npm

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend API will run on `http://localhost:3001`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

### 1. Register/Login
- Open `http://localhost:5173`
- Create a new account or login

### 2. Import Data
- Navigate to "Import Data"
- Upload a CSV or XLSX file with contacts or sales data
- Review the field mapping
- Click "Import Data"

### 3. View Dashboard
- See real-time metrics and KPIs
- View sales trends over time
- Check recent activities

### 4. Manage Contacts
- Add, edit, or delete contacts
- Search and filter contacts
- View contact details

### 5. Track Sales
- Visualize your sales pipeline
- Monitor deals by stage
- Monitor deal values and probabilities

### 6. Run Analytics
- Click "Run Segmentation" to perform K-means clustering
- View customer segments and characteristics
- Explore segment customers

### 7. Generate Reports
- Select report type (Sales, Customers, Segments)
- Choose format (PDF or Excel)
- Set date range (for sales reports)
- Download the generated report

## Sample Data

Sample CSV files are provided in the `sample-data` folder:
- `sample-contacts.csv`: 50 sample contacts
- `sample-sales.csv`: 100 sample sales transactions

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Deals
- `GET /api/deals` - Get all deals
- `GET /api/deals/stats/pipeline` - Get pipeline statistics

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/stats/summary` - Get sales summary

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard data
- `GET /api/analytics/segments` - Get customer segments
- `POST /api/analytics/segment-customers` - Run K-means clustering

### Import
- `POST /api/import/upload` - Upload and preview file
- `POST /api/import/execute` - Execute import with field mapping

### Reports
- `POST /api/reports/sales` - Generate sales report
- `POST /api/reports/customers` - Generate customer report
- `POST /api/reports/segments` - Generate segment analysis

## Database Schema

The SQLite database includes the following tables:
- `users` - User accounts
- `contacts` - Customer contacts
- `deals` - Sales opportunities
- `activities` - Activity log
- `sales` - Sales transactions
- `customer_segments` - ML clustering results

## ML Algorithm

The application uses a custom K-means clustering implementation with:
- K-means++ initialization for better convergence
- Min-max normalization for feature scaling
- RFM (Recency, Frequency, Monetary) features
- Automatic segment naming based on characteristics

## Why Are There Two npm Processes?

This project is a **full-stack application** split into two independent services that each need their own process:

| Service | Directory | Port | Purpose |
|---------|-----------|------|---------|
| **Backend** | `backend/` | `3001` | REST API, database (SQLite), authentication, file processing |
| **Frontend** | `frontend/` | `5173` | React UI, served by Vite dev server |

The backend and frontend are kept separate so that:
- The backend can be deployed independently (e.g., on Render/Railway) while the frontend is hosted as a static site (e.g., on Netlify).
- Each service has its own dependencies and can be updated or scaled without affecting the other.
- Local development mirrors the production architecture — the frontend makes HTTP requests to the backend API, just as it would in production.

You must run **both** at the same time (in two terminal windows/tabs):

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

## Future Enhancements (Next Update)

The following features are planned for the next release:

### 🔔 Notifications & Reminders
- In-app notification centre for campaign delivery updates
- Scheduled reminders for follow-up activities

### 📧 Email Integration
- Send emails directly from customer profiles
- Email open/click tracking within campaigns
- SMTP and SendGrid support

### 📅 Calendar Sync
- Two-way sync with Google Calendar and Outlook
- Schedule activities and see them in a unified calendar view

### 📱 Mobile App (Capacitor)
- Native iOS and Android app built from the existing React codebase
- Push notifications for campaign results and reminders

### 🤖 Advanced Predictive Analytics
- Churn prediction model using purchase-history signals
- Next-purchase date forecasting per customer
- Revenue forecasting for the next 30/60/90 days

### 👥 Real-Time Collaboration
- Multiple users can work simultaneously with live data updates via WebSockets
- Presence indicators showing who is viewing a customer profile

### 🎛️ Custom Dashboards
- Drag-and-drop dashboard widget builder
- Save and share personalised dashboard layouts

### 🔗 Third-Party Integrations
- Twilio integration for real SMS delivery (replace simulation)
- WhatsApp Business API support for campaigns
- Zapier/Make webhook support for automation

### 🛡️ Security & Access Control
- Role-based access control (Admin, Manager, Staff)
- Audit log of all data changes
- Two-factor authentication (2FA)

## License

MIT

## Author

Built with ❤️ using React, Node.js, and Machine Learning
