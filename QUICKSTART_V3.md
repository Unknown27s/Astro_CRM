# 🚀 Quick Start Guide - Retail CRM v3.0.0

## Step 1: Start the Backend

```bash
cd backend
npm run dev
```

You'll see:
```
🔄 Running v3.0.0 migration...
✅ Migration to v3.0.0 completed successfully!
🚀 CRM API Server v3.0.0 - Retail Edition
🛍️  Phase 3: Customer Purchase Tracking + SMS Campaigns
📡 Server running on http://localhost:3001
```

## Step 2: Start the Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## Step 3: Login

Use existing credentials or register a new account.

## Step 4: Explore Features

### 📋 Dashboard
- See total customers, active customers, VIP count
- View revenue trends (last 30 days)
- Check recent purchases

### 👥 Customers
- **Add Customer**: Click "+ Add Customer" button
- **View Details**: Click any customer to see purchase history
- **Add Purchase**: Select customer → "+ Add Purchase" → Add items → Save
- **Search & Filter**: Use search bar and status filter

### 📱 Campaigns
- **Create Campaign**: Click "+ New Campaign"
- **Choose Template**: Select from pre-built templates
- **Target Audience**: Select who receives the message
  - All Customers
  - Inactive (no purchase in 60+ days)
  - VIP customers
  - High/Low spenders
- **Personalize**: Use `{{name}}` and `{{total_spent}}` placeholders
- **Preview**: See recipient count and sample messages
- **Send**: Click "Send Campaign" (currently mock - stores in database)

### 📊 Insights
- **Select Period**: Choose 7 days, 30 days, 3 months, 6 months, or 1 year
- **Revenue Trends**: Line chart showing daily/weekly revenue
- **Customer Distribution**: Pie chart of Active/VIP/Inactive
- **Purchase Patterns**: Bar chart by day of week
- **Top Items**: See best-selling products
- **Location Analysis**: Revenue breakdown by location
- **Top Customers**: Leaderboard of highest spenders
- **Payment Methods**: Distribution of Cash/Card/UPI

### 📤 Import
- **Upload CSV/Excel**: Import customer data
- **Map Fields**: Match columns to customer fields
- **Review**: Preview first 10 rows
- **Import**: Bulk create customers

## Tips

1. **Customer Status** is auto-assigned:
   - **Active**: Recent purchase (< 90 days)
   - **VIP**: Total spent ≥ ₹50,000
   - **Inactive**: No purchase in 90+ days

2. **Purchase Items**: Add multiple items per transaction
   - Each item has: name, quantity, price
   - Total is calculated automatically

3. **Campaign Placeholders**:
   - `{{name}}` - Customer name
   - `{{total_spent}}` - Total amount spent
   - `{{location}}` - Customer location

4. **Data Migration**: Your old v2.0.0 data is automatically migrated and backed up as `*_v2_backup` tables

## Common Workflows

### Onboard New Customer
1. Go to Customers
2. Click "Add Customer"
3. Enter name, phone, location
4. Save
5. Immediately add their first purchase

### Send Re-engagement Campaign
1. Go to Campaigns
2. New Campaign → "Welcome Back" template
3. Target: "Inactive Customers"
4. Adjust message as needed
5. Preview recipients
6. Send

### Check Monthly Performance
1. Go to Insights
2. Select "Last 30 Days"
3. View revenue trends
4. Check top items
5. Identify top customers

## Troubleshooting

**Backend won't start:**
- Check if port 3001 is already in use
- Verify Node.js version (18+ required)

**Frontend shows blank:**
- Check if backend is running
- Check browser console for errors
- Verify token in localStorage

**Migration errors:**
- Check backend console logs
- Backup data is in `*_v2_backup` tables
- Contact support with error message

## Support

For issues or questions:
- Check CHANGELOG_V3.md for detailed changes
- Review RETAIL_REDESIGN_PROPOSAL.md for full specs
- Backend errors: Check terminal where `npm run dev` is running
- Frontend errors: Check browser console (F12)

---

**Ready to use! 🎉**

Version: 3.0.0 - Retail Edition  
Last Updated: February 25, 2026
