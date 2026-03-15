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

export default router;
