# CRM Pro - Customer Relationship Management System

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-sql.js-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

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
- **Routing**: React Router v7
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

## Future Enhancements

- Email integration
- Calendar sync
- Mobile app with Capacitor
- Advanced predictive analytics
- Real-time collaboration
- Custom dashboards

## License

MIT

## Author

Built with ❤️ using React, Node.js, and Machine Learning
