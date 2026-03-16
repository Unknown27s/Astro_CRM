# 🎤 AstroCRM — Jury Questions & Definitions Guide

> Prepared for project demo / viva / jury evaluation  
> **Created by AH AH Coders × Claude AI**

---

## 📋 Table of Contents
1. [Frequently Asked Jury Questions](#-frequently-asked-jury-questions)
2. [Technology Definitions](#-technology-definitions)
3. [ML/AI Concept Definitions](#-mlai-concept-definitions)
4. [CRM Concept Definitions](#-crm-concept-definitions)
5. [Architecture & Design Patterns](#-architecture--design-patterns)

---

## ❓ Frequently Asked Jury Questions

### General / Overview

**Q1: What is AstroCRM and what problem does it solve?**
> AstroCRM is an AI-powered Customer Relationship Management system for retail businesses. It solves the problem of scattered customer data by centralizing customer information, purchase history, sales deals, marketing campaigns, and analytics into one platform. The AI features help business owners make data-driven decisions without needing technical expertise.

**Q2: What makes your CRM different from existing solutions?**
> Three key differentiators:
> 1. **7 ML Analytics modules** — K-Means Segmentation, RFM Analysis, Churn Prediction, LTV Prediction, Product Affinity, Revenue Forecasting, and Cohort Analysis
> 2. **DB-aware AI chatbot** — Users can ask natural language questions like "Who is my top customer?" and get answers directly from their database
> 3. **Full-stack integration** — Deals auto-update customer records, activities reflect on customer profiles, and everything stays in sync

**Q3: Who is your target user?**
> Small to medium retail business owners, shop managers, and sales teams who need a modern, affordable CRM without enterprise complexity.

**Q4: How many modules does the application have?**
> The application has 13 major modules: Dashboard, Customers, Deals Pipeline, Tasks & Activities, ML Analytics (7 sub-modules), AI Studio, Campaigns, Insights, Reports, Stock Management, Online Store, Import Data, and User Roles.

---

### Technical / Architecture

**Q5: What is your technology stack?**
> - **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS + Recharts
> - **Backend**: Node.js + Express.js 4 + TypeScript
> - **Database**: PostgreSQL 17 with node-postgres (pg)
> - **AI**: ASI:One (OpenAI-compatible API)
> - **ML**: Custom K-Means clustering implementation in TypeScript

**Q6: Why did you choose PostgreSQL over MySQL or MongoDB?**
> PostgreSQL because:
> 1. **JSONB support** — We store purchase items as JSON arrays, and PostgreSQL's JSONB allows us to query inside JSON fields (e.g., product affinity analysis)
> 2. **Complex aggregations** — Our analytics require window functions, CTEs, and date arithmetic that PostgreSQL handles better
> 3. **ACID compliance** — Financial data (purchases, deals) needs strong transaction guarantees
> 4. **Scalability** — PostgreSQL handles concurrent reads/writes better for CRM workloads

**Q7: Why React + Vite instead of Next.js?**
> We chose React + Vite because:
> 1. Our app is a **SPA (Single Page Application)** — no server-side rendering needed
> 2. Vite's **Hot Module Replacement** gives faster development feedback
> 3. Next.js adds routing complexity we don't need — React Router handles our client-side routing
> 4. Easier deployment — the frontend builds to static files that any web server can host

**Q8: How does your authentication work?**
> We use **JWT (JSON Web Token)** authentication:
> 1. User registers/logs in → backend generates a JWT token
> 2. Token is stored in `localStorage` on the frontend
> 3. Every API request includes the token in the `Authorization: Bearer <token>` header
> 4. Backend middleware verifies the token before processing requests
> 5. If token is expired/invalid, user is redirected to login

**Q9: How does the frontend communicate with the backend?**
> Through a centralized **API service layer** (`api.ts`):
> 1. Uses **Axios** HTTP client with interceptors
> 2. Automatically attaches JWT token to every request
> 3. Handles 401 (unauthorized) responses by clearing the token and redirecting to login
> 4. All API methods are organized by feature (customers, deals, analytics, etc.)

**Q10: How is your database schema designed?**
> The schema has 14 tables following a relational design:
> - **Core**: `users`, `customers`, `purchases`, `products`
> - **CRM**: `deals`, `activities`, `notes`, `campaigns`, `campaign_sends`
> - **ML**: `customer_segments` (stores K-means clustering results)
> - **Commerce**: `store_settings`, `online_orders`, `coupons`, `inventory_transactions`
> - Tables are connected via foreign keys (e.g., `deals.customer_id → customers.id`)

---

### AI / Machine Learning

**Q11: How does the AI chatbot work?**
> The chatbot uses a **query-template matching + LLM** architecture:
> 1. When the user asks a question, the backend matches keywords to 15 pre-defined SQL query templates
> 2. If a match is found, the SQL runs against the real database
> 3. The live data is injected into the AI prompt as context
> 4. The ASI:One LLM generates a natural language response using the real data
> 5. This avoids SQL injection risks because queries are pre-defined, not AI-generated

**Q12: What is K-Means clustering and how do you use it?**
> K-Means is an **unsupervised machine learning algorithm** that groups data points into K clusters based on similarity.
> 
> In AstroCRM:
> 1. We extract features: total spent, purchase frequency, recency (days since last purchase)
> 2. Features are normalized (scaled to 0-1)
> 3. K-Means runs with K=4 clusters
> 4. Each cluster gets a meaningful name based on its characteristics (Champions, Loyal, At-Risk, Lost)
> 5. Results are stored in `customer_segments` table

**Q13: What is RFM Analysis?**
> RFM stands for **Recency, Frequency, Monetary** — a customer segmentation technique:
> - **Recency**: How recently did the customer make a purchase? (scored 1-5)
> - **Frequency**: How often do they purchase? (scored 1-5)
> - **Monetary**: How much do they spend? (scored 1-5)
> - Combined score (e.g., "555" = best customer, "111" = least active)
> - Segments: VIP (5xx), Active (4xx/5xx), Medium (2-3xx), Inactive (1xx)

**Q14: How does Churn Prediction work?**
> Our churn prediction uses a **rule-based scoring model**:
> 1. Queries customers who haven't purchased in 90+ days
> 2. Calculates a risk score: `min(100, (days_inactive / 365) × 100)`
> 3. Classifies into risk levels: Critical (≥80), High (≥60), Medium (≥40), Low (<40)
> 4. Generates action recommendations (e.g., "Send win-back campaign")
> 5. This is a practical heuristic — production systems would use logistic regression or gradient boosting

**Q15: What is Customer Lifetime Value (CLV/LTV)?**
> CLV predicts how much revenue a customer will generate over their entire relationship:
> - Formula: `Average Order Value × Purchase Frequency (annual) × Estimated Lifespan (3 years)`
> - We tier customers: Premium (≥₹50K), High (≥₹20K), Medium (≥₹5K), Low (<₹5K)
> - This helps prioritize high-value customers for VIP treatment

**Q16: What is the AI autocomplete feature?**
> When writing descriptions for activities or notes:
> 1. User clicks the "✨ AI Suggest" button
> 2. Backend sends the context (activity type + subject) and partial text to the AI
> 3. AI generates or expands the description professionally
> 4. The suggestion replaces the textarea content
> 5. This saves time and ensures consistent, professional documentation

---

### Data & Business Logic

**Q17: How does the Deal → Customer sync work?**
> When a deal stage changes to or from "Closed Won":
> 1. The `syncCustomerOnStageChange()` function runs automatically
> 2. If **entering** Closed Won: deal value is added to customer's `total_spent`, `total_purchases` increments, `last_purchase_date` updates
> 3. If **leaving** Closed Won (e.g., reopened): values are subtracted (with `GREATEST(..., 0)` safety)
> 4. This keeps customer metrics accurate without manual updates

**Q18: How does cohort analysis work?**
> Cohort analysis groups customers by their **registration month** and tracks their behavior over time:
> 1. Query groups customers by `created_at` month
> 2. For each cohort: counts total members, total purchases, total revenue
> 3. Calculates retention rate: `(active_in_last_30_days / cohort_size) × 100`
> 4. Revenue per customer: `total_revenue / cohort_size`
> 5. Helps answer: "Are newer customers more valuable than older ones?"

**Q19: What is Product Affinity analysis?**
> Product Affinity identifies which products are frequently purchased together:
> 1. Extracts items from JSONB purchase data
> 2. Counts how many times each product appears across purchases
> 3. Identifies co-purchased products (products in the same basket)
> 4. This enables cross-selling recommendations like "Customers who bought X also bought Y"

**Q20: How does Revenue Forecasting work?**
> Our forecasting uses **trend analysis and moving averages**:
> 1. Fetches 90 days of daily revenue data
> 2. Calculates a 7-day moving average to smooth fluctuations
> 3. Compares first-half vs second-half of last 30 days for trend direction
> 4. Projects 30-day and 90-day revenue based on daily average × growth rate
> 5. Classifies trend as "up" (>2%), "down" (<-2%), or "stable"

---

### Deployment & Security

**Q21: How would you deploy this to production?**
> 1. **Backend**: Build with `npm run build`, deploy to a cloud server (AWS EC2, Railway, or Render)
> 2. **Frontend**: Build with `npm run build`, deploy `dist/` folder to Vercel, Netlify, or any static hosting
> 3. **Database**: Use a managed PostgreSQL service (AWS RDS, Supabase, or Neon)
> 4. **Environment**: Set production env vars (secure JWT secret, database URL, API keys)

**Q22: What security measures have you implemented?**
> 1. **JWT authentication** — Token-based stateless auth
> 2. **Password hashing** — bcrypt for storing passwords
> 3. **Role-based access** — Admin/Manager/Viewer roles
> 4. **Query templates** — AI chat uses pre-defined SQL, preventing SQL injection
> 5. **CORS** — Cross-origin resource sharing configured
> 6. **API middleware** — Auth verification on protected routes

**Q23: What are the limitations of this project?**
> 1. Campaigns don't actually send SMS/emails (requires Twilio or SendGrid integration)
> 2. Churn prediction uses heuristic scoring, not ML models like logistic regression
> 3. No real-time notifications (would need WebSockets)
> 4. No unit/integration tests (recommended for production)
> 5. AI features require an ASI:One API key

---

## 📖 Technology Definitions

| Technology | What It Is |
|-----------|-----------|
| **React** | JavaScript library for building user interfaces using reusable components |
| **TypeScript** | Superset of JavaScript that adds static type checking for safer code |
| **Vite** | Ultra-fast frontend build tool and development server (replacement for Webpack) |
| **Tailwind CSS** | Utility-first CSS framework that lets you style elements using predefined classes |
| **Express.js** | Minimal web framework for Node.js to build REST APIs |
| **PostgreSQL** | Open-source relational database management system (RDBMS) |
| **Node.js** | JavaScript runtime that lets you run JavaScript on the server |
| **JWT (JSON Web Token)** | Compact, URL-safe token for securely transmitting identity claims |
| **Axios** | Promise-based HTTP client for making API requests from the browser |
| **Recharts** | React component library for building charts and data visualizations |
| **Lucide React** | Modern icon library with 200+ SVG icons as React components |
| **Radix UI** | Headless (unstyled) UI components for building accessible interfaces |
| **ASI:One** | OpenAI-compatible AI inference API used for chatbot and text generation |
| **pdfkit** | Node.js library for generating PDF documents programmatically |
| **ExcelJS** | Node.js library for reading/writing Excel files (XLSX format) |
| **multer** | Node.js middleware for handling multipart/form-data (file uploads) |
| **csv-parser** | Streaming CSV parser for Node.js |
| **CORS** | Cross-Origin Resource Sharing — browser security mechanism for cross-domain API calls |
| **REST API** | Architectural style for web services using HTTP methods (GET, POST, PUT, DELETE) |
| **SPA** | Single Page Application — loads one HTML page and dynamically updates content |

---

## 🧠 ML/AI Concept Definitions

| Concept | Definition |
|---------|-----------|
| **K-Means Clustering** | Unsupervised ML algorithm that partitions data into K groups based on feature similarity by minimizing within-cluster variance |
| **RFM Analysis** | Marketing technique that segments customers based on how recently they purchased (Recency), how often (Frequency), and how much they spent (Monetary) |
| **Churn Prediction** | Forecasting which customers are likely to stop buying, using behavioral signals like inactivity duration |
| **Customer Lifetime Value (CLV/LTV)** | Prediction of total revenue a business can expect from a customer over their entire relationship |
| **Product Affinity Analysis** | Identifying products frequently purchased together to enable cross-selling and bundle recommendations |
| **Cohort Analysis** | Grouping users by acquisition date and tracking their behavior over time to measure retention |
| **Revenue Forecasting** | Predicting future revenue using historical data trends and moving averages |
| **Moving Average** | Statistical method that smooths data by averaging values over a rolling window (e.g., 7 days) |
| **Feature Normalization** | Scaling numerical features to a common range (0-1) so no single feature dominates the algorithm |
| **Unsupervised Learning** | ML technique that finds patterns in data without labeled examples (unlike supervised learning) |
| **Natural Language Processing (NLP)** | AI's ability to understand and generate human language (used in our chatbot) |
| **Prompt Engineering** | Designing effective instructions for AI models to get accurate, useful responses |
| **RAG (Retrieval Augmented Generation)** | Pattern where real data is retrieved and injected into an AI prompt for grounded responses |

---

## 🏢 CRM Concept Definitions

| Concept | Definition |
|---------|-----------|
| **CRM** | Customer Relationship Management — system for managing interactions with customers and prospects |
| **Sales Pipeline** | Visual representation of sales deals at different stages from lead to close |
| **Kanban Board** | Visual workflow management method using columns (stages) and cards (deals) |
| **Lead** | A potential customer who has shown interest but hasn't committed to a purchase |
| **Deal** | A potential sale being tracked through the sales pipeline |
| **Closed Won** | A deal that has been successfully completed (customer purchased) |
| **Closed Lost** | A deal that was lost (customer chose not to purchase) |
| **Customer Segmentation** | Dividing customers into groups based on shared characteristics or behaviors |
| **Campaign** | A coordinated marketing effort targeting a specific audience with a message |
| **360° Customer View** | A complete, unified view of all customer data in one place (contacts, deals, purchases, notes, activities) |
| **Customer Notes** | Recorded interactions and observations about a customer (calls, meetings, feedback) |
| **Activity Tracking** | Logging sales team activities (calls, emails, meetings, tasks) related to customers |
| **KPI (Key Performance Indicator)** | Measurable value demonstrating business effectiveness (e.g., total revenue, customer count) |

---

## 🏗 Architecture & Design Patterns

| Pattern | Where It's Used |
|---------|----------------|
| **MVC (Model-View-Controller)** | Backend: Routes (Controller) → Database queries (Model) → JSON responses (View) |
| **Component-Based Architecture** | Frontend: Reusable React components (Button, Card, Modal, Badge) |
| **Service Layer Pattern** | `api.ts` centralizes all API calls; `aihelper.ts` centralizes all AI calls |
| **Repository Pattern** | Database queries in route files acting as data access layer |
| **Observer Pattern** | React's `useState` + `useEffect` hooks for reactive UI updates |
| **Middleware Pattern** | Express middleware chain: CORS → Auth → Route Handler |
| **Template Method Pattern** | AI query templates — pre-defined SQL with keyword matching |
| **Singleton Pattern** | ASI:One AI client created once and reused (`getAsiClient()`) |

---

> 💡 **Tip for jury**: Focus on explaining the **business value** of each feature, not just the technical implementation. For example: "Our RFM analysis helps shop owners identify their most valuable customers so they can send targeted promotions."
