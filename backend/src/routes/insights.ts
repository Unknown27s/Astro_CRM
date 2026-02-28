import { Router, Request, Response } from 'express';
import { query } from '../database/db';

const router = Router();

// Get revenue trends
router.get('/revenue-trends', (req: Request, res: Response) => {
    try {
        const { period = '30days' } = req.query;
        const daysBack = parsePeriodToDays(period as string);

        const trends = query(
            `SELECT 
                DATE(purchase_date) as date,
                COUNT(*) as purchase_count,
                SUM(total_amount) as revenue
             FROM purchases
             WHERE purchase_date >= date('now', '-${daysBack} days')
             GROUP BY DATE(purchase_date)
             ORDER BY date ASC`
        );

        // Calculate period totals
        const totals = query(
            `SELECT 
                COUNT(*) as total_purchases,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as avg_transaction
             FROM purchases
             WHERE purchase_date >= date('now', '-${daysBack} days')`
        )[0];

        // Calculate previous period for comparison
        const previousPeriod = query(
            `SELECT SUM(total_amount) as revenue
             FROM purchases
             WHERE purchase_date >= date('now', '-${daysBack * 2} days')
               AND purchase_date < date('now', '-${daysBack} days')`
        )[0];

        const growth = previousPeriod && (previousPeriod as any).revenue > 0
            ? (((totals as any).total_revenue - (previousPeriod as any).revenue) / (previousPeriod as any).revenue) * 100
            : 0;

        res.json({
            trends,
            summary: {
                total_purchases: (totals as any)?.total_purchases || 0,
                total_revenue: (totals as any)?.total_revenue || 0,
                avg_transaction: (totals as any)?.avg_transaction || 0,
                growth_percentage: growth.toFixed(2)
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get customer statistics
router.get('/customer-stats', (req: Request, res: Response) => {
    try {
        const { period = '30days' } = req.query;
        const daysBack = parsePeriodToDays(period as string);

        // Overall customer stats
        const overview = query(
            `SELECT 
                COUNT(*) as total_customers,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_customers,
                COUNT(CASE WHEN status = 'VIP' THEN 1 END) as vip_customers,
                COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_customers
             FROM customers`
        )[0];

        // New customers in period
        const newCustomers = query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
             FROM customers
             WHERE created_at >= date('now', '-${daysBack} days')
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );

        // Top customers by spend
        const topCustomers = query(
            `SELECT id, name, phone, location, total_spent, total_purchases
             FROM customers
             ORDER BY total_spent DESC
             LIMIT 10`
        );

        // Customer lifetime value
        const lifetimeValue = query(
            `SELECT AVG(total_spent) as avg_lifetime_value
             FROM customers
             WHERE total_purchases > 0`
        )[0];

        res.json({
            overview,
            new_customers_trend: newCustomers,
            top_customers: topCustomers,
            avg_lifetime_value: (lifetimeValue as any)?.avg_lifetime_value || 0
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get purchase patterns
router.get('/purchase-patterns', (req: Request, res: Response) => {
    try {
        const { period = '30days' } = req.query;
        const daysBack = parsePeriodToDays(period as string);

        // Purchases by day of week
        const byDayOfWeek = query(
            `SELECT 
                CASE CAST(strftime('%w', purchase_date) AS INTEGER)
                    WHEN 0 THEN 'Sunday'
                    WHEN 1 THEN 'Monday'
                    WHEN 2 THEN 'Tuesday'
                    WHEN 3 THEN 'Wednesday'
                    WHEN 4 THEN 'Thursday'
                    WHEN 5 THEN 'Friday'
                    WHEN 6 THEN 'Saturday'
                END as day_name,
                COUNT(*) as purchase_count,
                SUM(total_amount) as revenue
             FROM purchases
             WHERE purchase_date >= date('now', '-${daysBack} days')
             GROUP BY strftime('%w', purchase_date)
             ORDER BY CAST(strftime('%w', purchase_date) AS INTEGER)`
        );

        // Payment method distribution
        const byPaymentMethod = query(
            `SELECT 
                COALESCE(payment_method, 'Unknown') as payment_method,
                COUNT(*) as count,
                SUM(total_amount) as revenue
             FROM purchases
             WHERE purchase_date >= date('now', '-${daysBack} days')
             GROUP BY payment_method
             ORDER BY count DESC`
        );

        // Popular items (need to parse JSON items)
        const purchases = query(
            `SELECT items FROM purchases
             WHERE purchase_date >= date('now', '-${daysBack} days')`
        );

        const itemCounts: Record<string, { count: number; revenue: number }> = {};
        purchases.forEach((p: any) => {
            try {
                const items = JSON.parse(p.items || '[]');
                items.forEach((item: any) => {
                    const name = item.name || 'Unknown';
                    if (!itemCounts[name]) {
                        itemCounts[name] = { count: 0, revenue: 0 };
                    }
                    itemCounts[name].count += item.qty || 1;
                    itemCounts[name].revenue += (item.qty || 1) * (item.price || 0);
                });
            } catch (e) {
                // Skip invalid JSON
            }
        });

        const topItems = Object.entries(itemCounts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json({
            by_day_of_week: byDayOfWeek,
            by_payment_method: byPaymentMethod,
            top_items: topItems
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get location-wise revenue
router.get('/revenue-by-location', (req: Request, res: Response) => {
    try {
        const { period = '30days' } = req.query;
        const daysBack = parsePeriodToDays(period as string);

        const byLocation = query(
            `SELECT 
                COALESCE(c.location, 'Unknown') as location,
                COUNT(p.id) as purchase_count,
                SUM(p.total_amount) as revenue
             FROM purchases p
             LEFT JOIN customers c ON p.customer_id = c.id
             WHERE p.purchase_date >= date('now', '-${daysBack} days')
             GROUP BY c.location
             ORDER BY revenue DESC
             LIMIT 10`
        );

        res.json({ by_location: byLocation });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Export data (for Excel/PDF)
router.post('/export', async (req: Request, res: Response) => {
    try {
        const { report_type, period = '30days' } = req.body;
        const daysBack = parsePeriodToDays(period);

        let data: any = {};

        switch (report_type) {
            case 'revenue':
                data = query(
                    `SELECT 
                        purchase_date,
                        customer_id,
                        total_amount,
                        payment_method
                     FROM purchases
                     WHERE purchase_date >= date('now', '-${daysBack} days')
                     ORDER BY purchase_date DESC`
                );
                break;

            case 'customers':
                data = query(
                    `SELECT 
                        name,
                        phone,
                        email,
                        location,
                        total_spent,
                        total_purchases,
                        last_purchase_date,
                        status
                     FROM customers
                     ORDER BY total_spent DESC`
                );
                break;

            case 'purchases':
                data = query(
                    `SELECT 
                        p.purchase_date,
                        c.name as customer_name,
                        c.phone,
                        p.total_amount,
                        p.payment_method
                     FROM purchases p
                     LEFT JOIN customers c ON p.customer_id = c.id
                     WHERE p.purchase_date >= date('now', '-${daysBack} days')
                     ORDER BY p.purchase_date DESC`
                );
                break;

            default:
                return res.status(400).json({ error: 'Invalid report type' });
        }

        res.json({ data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Helper: Parse period string to days
function parsePeriodToDays(period: string): number {
    const periodMap: Record<string, number> = {
        '7days': 7,
        '30days': 30,
        '90days': 90,
        '180days': 180,
        '365days': 365
    };

    return periodMap[period] || 30;
}

export default router;
