# AstroCRM - Feature Testing Checklist ✅

## Pre-Flight Check
- [ ] PostgreSQL is running and database `astrocrm` exists
- [ ] Backend started: `cd backend && npm run dev`
  - Should see: `🚀 CRM API Server v3.0.0`
  - Should see: `📡 Server running on http://localhost:3001`
  - Should see: `Database initialized successfully (PostgreSQL)`
- [ ] Frontend started: `cd frontend && npm run dev`
  - Should see: `VITE v7.x.x ready in XXX ms`
  - Should see: `➜  Local: http://localhost:5173/`
- [ ] Browser: http://localhost:5173 loads without errors

---

## 1️⃣ Authentication & User Management

### Sign Up
- [ ] Navigate to login page
- [ ] Click "Sign Up" or "Don't have an account? Sign up here"
- [ ] Fill form: Email, Password, Confirm Password
- [ ] Click "Create Account"
- [ ] Should redirect to Dashboard
- [ ] **Check Console**: No errors in browser F12 → Console

### Login
- [ ] Click "Go back to login" or navigate to login
- [ ] Enter registered email and password
- [ ] Click "Sign In"
- [ ] Should redirect to Dashboard
- [ ] **Check Console**: No errors

### Logout
- [ ] Click user menu or logout button (top-right)
- [ ] Should redirect to login page
- [ ] **Check localStorage**: JWT token should be cleared

---

## 2️⃣ Dashboard

### Dashboard Loads
- [ ] Main Dashboard page visible
- [ ] All cards render without errors
- [ ] **KPI Cards visible**:
  - Total Customers
  - Total Revenue
  - Total Products
  - Recent Purchases
  - Average Order Value
  - Active Campaigns

### Dashboard Features
- [ ] Charts load (if data exists)
- [ ] Recent activities section shows data
- [ ] Top products section visible
- [ ] Sales trend chart renders
- [ ] **No red errors** in browser console

---

## 3️⃣ Customer Management

### View Customers List
- [ ] Navigate to **Customers** tab
- [ ] Customer list displays
- [ ] **Pagination works**:
  - Previous/Next buttons visible
  - Page indicator shows correct count (e.g., "Page 1 of 5")
  - Clicking Next → goes to page 2
  - Clicking Previous → goes back

### Add Customer
- [ ] Click "Add Customer" button
- [ ] Modal/form opens with fields:
  - Name ✅
  - Email ✅
  - Phone ✅
  - Location ✅
  - Customer Type (dropdown): Buyer / Seller / Both ✅
  - Notes ✅
- [ ] Fill in form
- [ ] Click "Save"
- [ ] Customer appears in list
- [ ] Notification shows success
- [ ] Customer Type saved correctly

### Edit Customer
- [ ] Click on customer row or edit icon
- [ ] Form opens with existing data
- [ ] Edit Customer Type dropdown
- [ ] Change name or other field
- [ ] Click "Update"
- [ ] Changes reflected in list
- [ ] Notification shows success

### Delete Customer
- [ ] Click delete button (trash icon)
- [ ] Confirmation dialog appears
- [ ] Click "Delete"
- [ ] Customer removed from list
- [ ] **Purchases deleted** with cascading delete
- [ ] Notification shows success

### Bulk Delete
- [ ] Check multiple customer checkboxes
- [ ] "Delete Selected" button appears
- [ ] Click to delete all selected
- [ ] Confirmation shown
- [ ] All selected deleted

### Search Customers
- [ ] Type in search box
- [ ] List filters as you type
- [ ] Results update
- [ ] Clear search → shows all again

---

## 4️⃣ Stock & Inventory Management

### View Products
- [ ] Navigate to **Inventory** or **Stock** tab
- [ ] Product table visible with columns:
  - SKU ✅
  - Product Name ✅
  - Category ✅
  - Current Stock ✅
  - Min/Max Level ✅
  - Status (In Stock / Low Stock / Out) ✅

### Add Product
- [ ] Click "Add Product" button
- [ ] Form opens with:
  - Name, SKU, Barcode, Category ✅
  - Price, Cost Price ✅
  - Stock Quantity ✅
  - Min/Max Stock Level ✅
  - Description ✅
- [ ] Fill form
- [ ] Click "Save"
- [ ] Product added to inventory
- [ ] Product appears in list

### Stock Transaction History
- [ ] Click on product
- [ ] "Transactions" or "History" tab visible
- [ ] Shows:
  - Transaction Type (stock_in, stock_out, adjustment) ✅
  - Quantity Changed ✅
  - Reason ✅
  - Timestamp ✅
  - Previous/New Quantity ✅

### Barcode Scanning
- [ ] Click "Barcode Scanner" button
- [ ] Camera permission dialog appears (on mobile/with camera)
- [ ] Allow camera access
- [ ] Scanner interface appears
- [ ] Scan a barcode
- [ ] Product details load
- [ ] Quantity adjusts
- [ ] Transaction recorded

### Low Stock Alerts
- [ ] Set a product's Min Stock Level to 10
- [ ] Manually reduce stock below min level
- [ ] Dashboard shows low stock alert
- [ ] Color changes to orange/red in list

### Stock Import
- [ ] Navigate to **Import** tab
- [ ] Go to **Stock Import** section
- [ ] Download template CSV
- [ ] Fill template with products
- [ ] Upload file
- [ ] Preview shows data
- [ ] Click "Import"
- [ ] Products added to inventory
- [ ] Stock quantities updated

---

## 5️⃣ Purchases & Orders

### Add Purchase
- [ ] Click on Customer
- [ ] Click "Add Purchase" button
- [ ] Modal opens with:
  - Product selection ✅
  - Quantity ✅
  - Price ✅
  - Payment Method (Cash, Card, Cheque, etc.) ✅
  - Notes ✅
- [ ] Add products (can add multiple)
- [ ] Click "Save Purchase"
- [ ] Purchase appears in customer history
- [ ] Customer **total_spent** updates
- [ ] Customer **total_purchases** increments

### View Purchase History
- [ ] Click on customer
- [ ] "Purchases" or "Order History" section visible
- [ ] Shows all purchases with:
  - Date ✅
  - Items ✅
  - Total Amount ✅
  - Payment Method ✅
- [ ] Click to view details

### Delete Purchase
- [ ] Click delete button on purchase
- [ ] Confirmation shown
- [ ] Click "Delete"
- [ ] Purchase removed
- [ ] Customer aggregates recalculated:
  - total_spent decreased ✅
  - total_purchases decremented ✅

---

## 6️⃣ Data Import & Export

### Import Customers
- [ ] Navigate to **Import** tab
- [ ] Go to **Upload File** section
- [ ] Download sample CSV from `sample-data/sample-customers-large.csv`
- [ ] Click "Upload File"
- [ ] Select CSV file
- [ ] Preview data appears
- [ ] Columns auto-map
- [ ] Click "Import Customers"
- [ ] Success notification
- [ ] Customers appear in Customers list

### Import Products
- [ ] Go to **Stock Import**
- [ ] Download sample from `sample-data/sample-products-large.csv`
- [ ] Upload file
- [ ] Preview shows products with:
  - Name, SKU, Barcode, Category ✅
  - Cost Price, Selling Price ✅
  - Stock Levels ✅
- [ ] Click "Import Products"
- [ ] Products added to inventory
- [ ] Stock levels initialized

### Google Sheets Sync (if configured)
- [ ] Go to **Google Sheets** section in Import tab
- [ ] Enter shared Google Sheets URL (requires setup)
- [ ] Click "Configure"
- [ ] Sync status shows: "Active" or "Syncing"
- [ ] Auto-syncs every 60 seconds (verify in network tab)
- [ ] New data from sheet appears in CRM

---

## 7️⃣ Campaigns & Marketing

### View Campaigns
- [ ] Navigate to **Campaigns** tab
- [ ] List of campaigns visible (if any created)
- [ ] Shows: Name, Type (SMS/Email), Status, Sent Count

### Create Campaign
- [ ] Click "Create Campaign" button
- [ ] Form opens with:
  - Campaign Name ✅
  - Message Text ✅
  - Campaign Type (SMS/Email) ✅
  - Target Audience (All/VIP/At-Risk) ✅
  - Email Subject (if Email type) ✅
- [ ] Fill form
- [ ] Click "Save" or "Send"
- [ ] Campaign saved with status "Draft" or "Sent"
- [ ] If sent, sent_count increments

### Send Campaign
- [ ] Click on campaign
- [ ] Click "Send Campaign" button
- [ ] Confirmation dialog shows
- [ ] Shows count of recipients
- [ ] Click "Send"
- [ ] Status changes to "Sent"
- [ ] sent_count increases

---

## 8️⃣ Analytics & ML Segmentation

### View Analytics Dashboard
- [ ] Navigate to **Analytics** tab
- [ ] See analytics metrics:
  - Total Customers ✅
  - Active Customers ✅
  - VIP Customers ✅
  - Inactive/Churned ✅
- [ ] Revenue metrics visible
- [ ] Growth percentage displayed

### Run K-means Segmentation
- [ ] Click "Run Segmentation" button
- [ ] Modal shows "Processing..."
- [ ] Wait for completion (1-5 seconds)
- [ ] Success notification
- [ ] Segments display:
  - Segment Name ✅
  - Customer Count ✅
  - Avg Order Value ✅
  - Avg Purchase Frequency ✅
  - Color-coded ✅

### View Segment Details
- [ ] Click on segment
- [ ] List of customers in segment appears
- [ ] Shows RFM values (Recency, Frequency, Monetary)
- [ ] Click customer → goes to customer detail

---

## 9️⃣ Reports & Insights

### Generate Sales Report
- [ ] Navigate to **Reports** tab
- [ ] Click "Sales Report"
- [ ] Set date range (optional)
- [ ] Click "Generate"
- [ ] Wait for PDF/Excel generation
- [ ] Download link appears
- [ ] File downloads successfully

### Generate Customer Report
- [ ] Click "Customer Report"
- [ ] Click "Generate"
- [ ] Excel file with customer data (name, email, phone, total_spent, etc.)
- [ ] Downloads successfully

### View Insights
- [ ] Navigate to **Insights** tab
- [ ] AI-powered insights display (if API key configured):
  - Dashboard Summary ✅
  - Customer Segments Explained ✅
  - Top Performing Products ✅
- [ ] Shows actionable recommendations

---

## 🔟 Online Store (if enabled)

### View Store Frontend
- [ ] Navigate to **Shop** or **Online Store** tab
- [ ] Store page displays:
  - Store Name ✅
  - Store Logo/Banner ✅
  - Product Grid ✅
  - Product Categories ✅
  - Search bar ✅

### Browse Products
- [ ] Click on product
- [ ] Product detail page shows:
  - Image ✅
  - Name, SKU, Description ✅
  - Price ✅
  - Stock Status ✅
  - "Add to Cart" button ✅

### Shopping Cart
- [ ] Click "Add to Cart"
- [ ] Item added to cart
- [ ] Cart icon shows item count
- [ ] Click cart icon
- [ ] Cart summary shows:
  - Items with images ✅
  - Quantities (can adjust) ✅
  - Subtotal ✅
- [ ] "Proceed to Checkout" button

### Checkout Process
- [ ] Click "Proceed to Checkout"
- [ ] Form shows:
  - Customer Name ✅
  - Email ✅
  - Phone ✅
  - Address ✅
- [ ] Optional coupon code field
- [ ] Order summary with total
- [ ] Click "Place Order"
- [ ] Order created
- [ ] Order number shown
- [ ] Stock automatically deducted

### Coupon System
- [ ] Navigate to **Coupons** section
- [ ] Click "Create Coupon"
- [ ] Form with:
  - Code ✅
  - Discount Type (Percentage/Fixed) ✅
  - Discount Value ✅
  - Min Order Amount ✅
  - Max Uses ✅
  - Expiry Date ✅
- [ ] Fill and save
- [ ] Go to shop
- [ ] Add items to cart
- [ ] Enter coupon code
- [ ] Discount applied to total
- [ ] Final amount correct

---

## 1️⃣1️⃣ Admin & Settings

### Admin Dashboard
- [ ] Navigate to **Admin** tab
- [ ] Database stats visible:
  - Total Users ✅
  - Total Customers ✅
  - Total Products ✅
  - Total Purchases ✅

### Export Data
- [ ] Click "Export Database"
- [ ] JSON file with all data
- [ ] Downloads successfully

### Store Settings
- [ ] Go to **Store Settings**
- [ ] Edit:
  - Store Name ✅
  - Store Description ✅
  - Currency ✅
  - Delivery Fee ✅
  - Min Order Amount ✅
  - Store Phone/Email/Address ✅
- [ ] Click "Save"
- [ ] Settings persisted

---

## 1️⃣2️⃣ Error Scenarios (should NOT crash)

### Missing Required Fields
- [ ] Try adding customer with blank name
- [ ] Should show validation error
- [ ] Form not submitted

### Invalid Email Format
- [ ] Enter invalid email
- [ ] Should show error
- [ ] No submission

### Network Errors
- [ ] Disconnect internet
- [ ] Try to make API call
- [ ] Should show user-friendly error
- [ ] No crash
- [ ] Reconnect internet → retries work

### Database Errors
- [ ] Stop PostgreSQL
- [ ] Try any action
- [ ] Backend logs error
- [ ] Frontend shows "Connection error"
- [ ] No crash
- [ ] Restart PostgreSQL → works again

---

## 1️⃣3️⃣ Performance Tests

### Large Dataset Loading
- [ ] Import 550 customers (sample-customers-large.csv)
- [ ] List loads in <2 seconds
- [ ] Pagination works smoothly
- [ ] Search is instant

### Concurrent Users (if deployed)
- [ ] Open app in 2 browsers
- [ ] Both can perform actions
- [ ] No data conflicts
- [ ] Both see updated data

### Mobile Responsiveness
- [ ] Open http://localhost:5173 on mobile/tablet
- [ ] Layout adjusts:
  - Sidebar collapses to icons ✅
  - Tables become scrollable ✅
  - Forms stack vertically ✅
  - Touch targets large enough ✅

---

## 1️⃣4️⃣ Browser Console Checks

After each major action:
- [ ] Open Browser DevTools (F12)
- [ ] Go to **Console** tab
- [ ] Check for:
  - ❌ No red errors
  - ⚠️ No yellow warnings (except third-party)
  - 🔵 Only info/debug logs (blue)

---

## 1️⃣5️⃣ Network Tab Checks

- [ ] Open Network tab (F12 → Network)
- [ ] Check API calls:
  - Status 200/201 for successful requests ✅
  - Status 400/401/500 for errors (with error message) ✅
  - No pending requests hanging ✅
- [ ] Load time < 1 second for most calls

---

## Summary Checklist

| Component | Status |
|-----------|--------|
| Authentication | ✅ / ❌ |
| Dashboard | ✅ / ❌ |
| Customers | ✅ / ❌ |
| Inventory & Stock | ✅ / ❌ |
| Purchases | ✅ / ❌ |
| Import/Export | ✅ / ❌ |
| Campaigns | ✅ / ❌ |
| Analytics | ✅ / ❌ |
| Reports | ✅ / ❌ |
| Online Store | ✅ / ❌ |
| Admin | ✅ / ❌ |
| Error Handling | ✅ / ❌ |
| Performance | ✅ / ❌ |
| Responsive Design | ✅ / ❌ |

---

## Notes

- **AI Features**: Optional - Only works if `ASI_ONE_API_KEY` is set in `.env`
- **Google Sheets Sync**: Optional - Only works if configured with valid Google Sheets URL
- **Online Store**: Optional - Can be enabled/disabled in Settings

---

**Report any issues or failures to**: Console → Check logs in terminal windows
