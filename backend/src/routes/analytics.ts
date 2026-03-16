import { Router, Request, Response } from 'express';
import { query, execute, transaction } from '../database/db';
import { performKMeansClustering, prepareCustomerFeatures } from '../services/mlService';

const router = Router();

// Get customer segmentation
router.get('/segments', async (req: Request, res: Response) => {
    try {
        const segments = await query(`
      SELECT
        cs.segment_id,
        cs.segment_name,
        COUNT(*) as customer_count,
        AVG((cs.features::jsonb->>'total_value')::float) as avg_value,
        AVG((cs.features::jsonb->>'purchase_frequency')::float) as avg_frequency
      FROM customer_segments cs
      GROUP BY cs.segment_id, cs.segment_name
      ORDER BY cs.segment_id
    `);

        res.json({ segments });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get customers in a specific segment
router.get('/segments/:segmentId/customers', async (req: Request, res: Response) => {
    try {
        const customers = await query(`
      SELECT
        c.*,
        cs.segment_name,
        cs.features
      FROM customer_segments cs
      JOIN customers c ON cs.customer_id = c.id
      WHERE cs.segment_id = ?
      ORDER BY c.name
    `, [req.params.segmentId]);

        res.json({ customers });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Perform customer segmentation using K-means
router.post('/segment-customers', async (req: Request, res: Response) => {
    try {
        const { numClusters = 4 } = req.body;

        // Get customer data with purchase metrics
        const customerData = await query(`
      SELECT
        c.id as customer_id,
        c.name,
        c.phone,
        c.location,
        COUNT(DISTINCT p.id) as purchase_count,
        COALESCE(SUM(p.total_amount), 0) as total_value,
        COALESCE(AVG(p.total_amount), 0) as avg_order_value,
        COALESCE(MAX(p.purchase_date), c.created_at) as last_purchase_date,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(MAX(p.purchase_date), c.created_at))) / 86400 as days_since_last_purchase
      FROM customers c
      LEFT JOIN purchases p ON c.id = p.customer_id
      WHERE c.status IN ('Active', 'VIP')
      GROUP BY c.id, c.name, c.phone, c.location, c.created_at
      HAVING COUNT(DISTINCT p.id) > 0
    `);

        if (customerData.length < numClusters) {
            return res.status(400).json({
                error: `Not enough data. Need at least ${numClusters} customers with sales data.`
            });
        }

        // Prepare features for clustering
        const features = prepareCustomerFeatures(customerData);

        // Perform K-means clustering
        const clusters = await performKMeansClustering(features, numClusters);

        // Assign segment names based on characteristics
        const segmentNames = assignSegmentNames(clusters, customerData);

        // Save segments to database
        await transaction(async (client) => {
            // Clear existing segments
            await execute('DELETE FROM customer_segments');

            // Insert new segments
            for (const [index, cluster] of clusters.entries()) {
                for (const pointIndex of cluster.points) {
                    const customer = customerData[pointIndex];
                    const featureData = {
                        total_value: customer.total_value,
                        purchase_count: customer.purchase_count,
                        avg_order_value: customer.avg_order_value,
                        days_since_last_purchase: customer.days_since_last_purchase
                    };

                    await execute(
                        `INSERT INTO customer_segments (customer_id, segment_id, segment_name, features)
             VALUES (?, ?, ?, ?)`,
                        [customer.customer_id, index, segmentNames[index], JSON.stringify(featureData)]
                    );
                }
            }
        });

        res.json({
            message: 'Customer segmentation completed',
            segments: clusters.map((cluster, index) => ({
                segment_id: index,
                segment_name: segmentNames[index],
                customer_count: cluster.points.length,
                centroid: cluster.centroid
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard analytics
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const { start_date, end_date } = req.query;

        // Total customers
        const totalCustomers = (await query(`SELECT COUNT(*) as count FROM customers`))[0];

        // Customer stats by status
        const customerStats = (await query(`
      SELECT
        COUNT(*) as total_customers,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_customers,
        COUNT(CASE WHEN status = 'VIP' THEN 1 END) as vip_customers,
        COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_customers
      FROM customers
    `))[0];

        // Purchase stats
        let purchaseQuery = `
      SELECT
        COUNT(*) as total_purchases,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as avg_purchase
      FROM purchases
      WHERE 1=1
    `;
        const params: any[] = [];

        if (start_date) {
            purchaseQuery += ' AND purchase_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            purchaseQuery += ' AND purchase_date <= ?';
            params.push(end_date);
        }

        const purchaseStats = (await query(purchaseQuery, params))[0];

        // Recent purchases with customer info
        const recentPurchases = await query(`
      SELECT p.*, c.name as customer_name, c.phone as customer_phone
      FROM purchases p
      LEFT JOIN customers c ON p.customer_id = c.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

        res.json({
            customers: totalCustomers,
            customerStats,
            purchases: purchaseStats,
            recentPurchases
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Purchase trends over time
router.get('/trends/sales', async (req: Request, res: Response) => {
    try {
        const { period = 'month', limit = '12' } = req.query;

        let groupBy = '';
        if (period === 'day') {
            groupBy = "TO_CHAR(purchase_date, 'YYYY-MM-DD')";
        } else if (period === 'week') {
            groupBy = `TO_CHAR(purchase_date, 'IYYY-"W"IW')`;
        } else {
            groupBy = "TO_CHAR(purchase_date, 'YYYY-MM')";
        }

        const trends = await query(`
      SELECT
        ${groupBy} as period,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM purchases
      WHERE purchase_date IS NOT NULL
      GROUP BY period
      ORDER BY period DESC
      LIMIT ?
    `, [Number(limit)]);

        res.json({ trends: trends.reverse() });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to assign meaningful names to segments
function assignSegmentNames(clusters: any[], customerData: any[]): string[] {
    const names: string[] = [];

    clusters.forEach((cluster, index) => {
        const clusterCustomers = cluster.points.map((i: number) => customerData[i]);
        const avgValue = clusterCustomers.reduce((sum: number, c: any) => sum + c.total_value, 0) / clusterCustomers.length;
        const avgFrequency = clusterCustomers.reduce((sum: number, c: any) => sum + c.purchase_count, 0) / clusterCustomers.length;
        const avgRecency = clusterCustomers.reduce((sum: number, c: any) => sum + c.days_since_last_purchase, 0) / clusterCustomers.length;

        // RFM-based naming
        if (avgValue > 5000 && avgFrequency > 5 && avgRecency < 90) {
            names.push('Champions');
        } else if (avgValue > 3000 && avgRecency < 180) {
            names.push('Loyal Customers');
        } else if (avgFrequency > 3 && avgRecency > 180) {
            names.push('At Risk');
        } else if (avgRecency < 90 && avgFrequency < 3) {
            names.push('New Customers');
        } else if (avgRecency > 365) {
            names.push('Lost Customers');
        } else {
            names.push(`Segment ${index + 1}`);
        }
    });

    return names;
}

// ─── RFM Analysis (Recency, Frequency, Monetary) ─────────────────────────
router.get('/rfm-analysis', async (req: Request, res: Response) => {
    try {
        const rfmData = await query(`
            SELECT
                c.id, c.name, c.phone, c.email,
                EXTRACT(EPOCH FROM (NOW() - MAX(p.purchase_date)))::int / 86400 as recency_days,
                COUNT(DISTINCT p.id) as frequency,
                COALESCE(SUM(p.total_amount), 0) as monetary,
                DATE(MAX(p.purchase_date)) as last_purchase
            FROM customers c
            LEFT JOIN purchases p ON c.id = p.customer_id
            WHERE c.status IN ('Active', 'VIP')
            GROUP BY c.id, c.name, c.phone, c.email
            ORDER BY monetary DESC
            LIMIT 100
        `);

        // Score each dimension 1-5
        const scored = rfmData.map((row: any) => {
            const recencyScore = row.recency_days < 30 ? 5 : row.recency_days < 90 ? 4 : row.recency_days < 180 ? 3 : row.recency_days < 365 ? 2 : 1;
            const frequencyScore = row.frequency >= 10 ? 5 : row.frequency >= 5 ? 4 : row.frequency >= 3 ? 3 : row.frequency >= 2 ? 2 : 1;
            const monetaryScore = row.monetary >= 10000 ? 5 : row.monetary >= 5000 ? 4 : row.monetary >= 2000 ? 3 : row.monetary >= 500 ? 2 : 1;
            const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;

            return {
                id: row.id,
                name: row.name,
                phone: row.phone,
                recency_days: row.recency_days,
                frequency: row.frequency,
                monetary: Number(row.monetary || 0),
                rfm_score: rfmScore,
                segment: rfmScore === '555' || rfmScore.startsWith('55') ? 'VIP' :
                         rfmScore.startsWith('1') ? 'Inactive' :
                         rfmScore.startsWith('5') ? 'Active' : 'Medium'
            };
        });

        res.json({ rfm_analysis: scored, total_customers: rfmData.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Churn Prediction ────────────────────────────────────────────────────
router.get('/churn-risk', async (req: Request, res: Response) => {
    try {
        const churnRiskData = await query(`
            SELECT
                c.id, c.name, c.phone, c.email, c.status,
                EXTRACT(EPOCH FROM (NOW() - MAX(p.purchase_date)))::int / 86400 as days_inactive,
                COUNT(DISTINCT p.id) as total_purchases,
                COALESCE(SUM(p.total_amount), 0) as total_spent,
                DATE(MAX(p.purchase_date)) as last_purchase_date
            FROM customers c
            LEFT JOIN purchases p ON c.id = p.customer_id
            WHERE c.status != 'Churned'
            GROUP BY c.id, c.name, c.phone, c.email, c.status
            HAVING EXTRACT(EPOCH FROM (NOW() - COALESCE(MAX(p.purchase_date), c.created_at)))::int / 86400 > 90
            ORDER BY days_inactive DESC
            LIMIT 50
        `);

        const withRisk = churnRiskData.map((row: any) => {
            const daysInactive = row.days_inactive || 0;
            const churnRiskScore = Math.min(100, Math.round((daysInactive / 365) * 100));
            const riskLevel = churnRiskScore >= 80 ? 'Critical' : churnRiskScore >= 60 ? 'High' : churnRiskScore >= 40 ? 'Medium' : 'Low';

            return {
                id: row.id,
                name: row.name,
                phone: row.phone,
                email: row.email,
                days_inactive: daysInactive,
                total_purchases: Number(row.total_purchases || 0),
                total_spent: Number(row.total_spent || 0),
                last_purchase: row.last_purchase_date,
                churn_risk_score: churnRiskScore,
                risk_level: riskLevel,
                recommendation: riskLevel === 'Critical' ? 'Send win-back campaign' : riskLevel === 'High' ? 'Offer incentive' : 'Monitor'
            };
        });

        res.json({ at_risk_customers: withRisk, total_at_risk: withRisk.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Customer Lifetime Value (CLV) Prediction ────────────────────────────
router.get('/customer-ltv', async (req: Request, res: Response) => {
    try {
        const clvData = await query(`
            SELECT
                c.id, c.name, c.phone, c.email,
                EXTRACT(EPOCH FROM (NOW() - c.created_at))::int / 86400 as customer_age_days,
                COUNT(DISTINCT p.id) as total_purchases,
                COALESCE(SUM(p.total_amount), 0) as total_spent,
                COALESCE(AVG(p.total_amount), 0) as avg_order_value,
                EXTRACT(EPOCH FROM (MAX(p.purchase_date) - MIN(p.purchase_date)))::int / 86400 as purchase_span_days
            FROM customers c
            LEFT JOIN purchases p ON c.id = p.customer_id
            GROUP BY c.id, c.name, c.phone, c.email, c.created_at
            HAVING COUNT(DISTINCT p.id) > 0
            ORDER BY total_spent DESC
            LIMIT 100
        `);

        const withLTV = clvData.map((row: any) => {
            const totalSpent = Number(row.total_spent || 0);
            const avgOrderValue = Number(row.avg_order_value || 0);
            const purchaseFrequency = row.total_purchases > 0 ? row.purchase_span_days > 0 ? (row.total_purchases / (row.purchase_span_days / 365)) : row.total_purchases : 0;

            // Simplified CLV: (Average Order Value × Purchase Frequency × Customer Lifespan in years)
            const estimatedLTVMonths = 36; // 3 year horizon
            const predictedLTV = avgOrderValue * purchaseFrequency * (estimatedLTVMonths / 12);

            return {
                id: row.id,
                name: row.name,
                phone: row.phone,
                email: row.email,
                current_value: totalSpent,
                predicted_3yr_ltv: Math.round(predictedLTV),
                avg_order_value: Math.round(avgOrderValue),
                purchase_frequency_annual: Number(purchaseFrequency.toFixed(2)),
                total_purchases: Number(row.total_purchases || 0),
                customer_age_months: Math.round(row.customer_age_days / 30),
                value_tier: predictedLTV >= 50000 ? 'Premium' : predictedLTV >= 20000 ? 'High' : predictedLTV >= 5000 ? 'Medium' : 'Low'
            };
        });

        res.json({ customer_ltv: withLTV, total_analyzed: withLTV.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Product Affinity Analysis (Which products are bought together) ──────
router.get('/product-affinity', async (req: Request, res: Response) => {
    try {
        const affinityData = await query(`
            WITH purchase_items AS (
                SELECT
                    p.id as purchase_id,
                    jsonb_array_elements(p.items) -> 'name' as product_name
                FROM purchases p
                WHERE p.items IS NOT NULL AND jsonb_array_length(p.items) > 0
            )
            SELECT
                product_name::text as product,
                COUNT(DISTINCT purchase_id) as times_purchased,
                (SELECT string_agg(DISTINCT (jsonb_array_elements(items) ->> 'name'), ', ')
                 FROM purchases p2
                 WHERE p2.id IN (
                    SELECT purchase_id FROM purchase_items WHERE product_name::text = (
                        SELECT product_name::text FROM purchase_items LIMIT 1
                    )
                 )) as frequently_bought_with
            FROM purchase_items
            GROUP BY product_name
            ORDER BY COUNT(DISTINCT purchase_id) DESC
            LIMIT 20
        `);

        res.json({ product_affinity: affinityData });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Revenue Forecasting (trend + moving average) ────────────────────────
router.get('/revenue-forecast', async (req: Request, res: Response) => {
    try {
        const dailyRevenue: any[] = await query(`
            SELECT
                purchase_date::date as date,
                SUM(total_amount) as revenue,
                COUNT(*) as orders
            FROM purchases
            WHERE purchase_date >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY purchase_date::date
            ORDER BY date ASC
        `) as any[];

        // Calculate 7-day moving average
        const withMovingAvg = dailyRevenue.map((day: any, idx: number) => {
            const window = dailyRevenue.slice(Math.max(0, idx - 6), idx + 1);
            const movingAvg = window.reduce((s: number, d: any) => s + Number(d.revenue), 0) / window.length;
            return {
                date: day.date,
                revenue: Number(day.revenue),
                orders: Number(day.orders),
                moving_avg_7d: Math.round(movingAvg),
            };
        });

        // Simple linear projection for next 30 days
        const last30 = dailyRevenue.slice(-30);
        const totalLast30 = last30.reduce((s: number, d: any) => s + Number(d.revenue), 0);
        const avgDaily = last30.length > 0 ? totalLast30 / last30.length : 0;

        const first15Avg = last30.slice(0, 15).reduce((s: number, d: any) => s + Number(d.revenue), 0) / Math.max(last30.slice(0, 15).length, 1);
        const last15Avg = last30.slice(-15).reduce((s: number, d: any) => s + Number(d.revenue), 0) / Math.max(last30.slice(-15).length, 1);
        const trend = first15Avg > 0 ? ((last15Avg - first15Avg) / first15Avg) * 100 : 0;

        res.json({
            daily_revenue: withMovingAvg,
            summary: {
                avg_daily_revenue: Math.round(avgDaily),
                projected_30d: Math.round(avgDaily * 30),
                projected_90d: Math.round(avgDaily * 90),
                trend_percentage: Number(trend.toFixed(1)),
                trend_direction: trend > 2 ? 'up' : trend < -2 ? 'down' : 'stable',
                data_points: dailyRevenue.length,
            },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Cohort Analysis (customer acquisition cohorts) ──────────────────────
router.get('/cohort-analysis', async (req: Request, res: Response) => {
    try {
        const cohorts: any[] = await query(`
            SELECT
                TO_CHAR(c.created_at, 'YYYY-MM') as cohort_month,
                COUNT(DISTINCT c.id) as cohort_size,
                COUNT(DISTINCT p.id) as total_purchases,
                COALESCE(SUM(p.total_amount), 0) as total_revenue,
                COALESCE(AVG(p.total_amount), 0) as avg_order_value,
                COUNT(DISTINCT CASE WHEN p.purchase_date >= CURRENT_DATE - INTERVAL '30 days' THEN c.id END) as active_last_30d
            FROM customers c
            LEFT JOIN purchases p ON c.id = p.customer_id
            WHERE c.created_at IS NOT NULL
            GROUP BY TO_CHAR(c.created_at, 'YYYY-MM')
            ORDER BY cohort_month DESC
            LIMIT 12
        `) as any[];

        const withRetention = cohorts.map((c: any) => ({
            cohort_month: c.cohort_month,
            cohort_size: Number(c.cohort_size),
            total_purchases: Number(c.total_purchases),
            total_revenue: Number(c.total_revenue),
            avg_order_value: Math.round(Number(c.avg_order_value)),
            active_last_30d: Number(c.active_last_30d),
            retention_rate: c.cohort_size > 0 ? Math.round((Number(c.active_last_30d) / Number(c.cohort_size)) * 100) : 0,
            revenue_per_customer: c.cohort_size > 0 ? Math.round(Number(c.total_revenue) / Number(c.cohort_size)) : 0,
        }));

        res.json({ cohorts: withRetention.reverse(), total_cohorts: withRetention.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
