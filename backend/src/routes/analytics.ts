import { Router, Request, Response } from 'express';
import { query, execute, transaction } from '../database/db';
import { performKMeansClustering, prepareCustomerFeatures } from '../services/mlService';

const router = Router();

// Get customer segmentation
router.get('/segments', (req: Request, res: Response) => {
    try {
        const segments = query(`
      SELECT 
        cs.segment_id,
        cs.segment_name,
        COUNT(*) as customer_count,
        AVG(json_extract(cs.features, '$.total_value')) as avg_value,
        AVG(json_extract(cs.features, '$.purchase_frequency')) as avg_frequency
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
router.get('/segments/:segmentId/customers', (req: Request, res: Response) => {
    try {
        const customers = query(`
      SELECT 
        c.*,
        cs.segment_name,
        cs.features
      FROM customer_segments cs
      JOIN contacts c ON cs.contact_id = c.id
      WHERE cs.segment_id = ?
      ORDER BY c.company
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

        // Get customer data with sales metrics
        const customerData = query(`
      SELECT 
        c.id as contact_id,
        c.first_name,
        c.last_name,
        c.company,
        COUNT(DISTINCT s.id) as purchase_count,
        COALESCE(SUM(s.total_amount), 0) as total_value,
        COALESCE(AVG(s.total_amount), 0) as avg_order_value,
        COALESCE(MAX(s.sale_date), c.created_at) as last_purchase_date,
        julianday('now') - julianday(COALESCE(MAX(s.sale_date), c.created_at)) as days_since_last_purchase
      FROM contacts c
      LEFT JOIN sales s ON c.id = s.contact_id
      WHERE c.status = 'Active'
      GROUP BY c.id
      HAVING purchase_count > 0 OR c.id IN (SELECT DISTINCT contact_id FROM deals)
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
        transaction(() => {
            // Clear existing segments
            execute('DELETE FROM customer_segments');

            // Insert new segments
            clusters.forEach((cluster, index) => {
                cluster.points.forEach((pointIndex: number) => {
                    const customer = customerData[pointIndex];
                    const featureData = {
                        total_value: customer.total_value,
                        purchase_count: customer.purchase_count,
                        avg_order_value: customer.avg_order_value,
                        days_since_last_purchase: customer.days_since_last_purchase
                    };

                    execute(
                        `INSERT INTO customer_segments (contact_id, segment_id, segment_name, features)
             VALUES (?, ?, ?, ?)`,
                        [customer.contact_id, index, segmentNames[index], JSON.stringify(featureData)]
                    );
                });
            });
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
router.get('/dashboard', (req: Request, res: Response) => {
    try {
        const { start_date, end_date } = req.query;

        // Total contacts
        const totalContacts = query(`SELECT COUNT(*) as count FROM contacts`)[0];

        // Total deals and value
        const dealStats = query(`
      SELECT 
        COUNT(*) as total_deals,
        SUM(CASE WHEN stage = 'Closed Won' THEN value ELSE 0 END) as won_value,
        SUM(CASE WHEN stage NOT IN ('Closed Won', 'Closed Lost') THEN value ELSE 0 END) as pipeline_value
      FROM deals
    `)[0];

        // Sales stats
        let salesQuery = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_sale
      FROM sales
      WHERE 1=1
    `;
        const params: any[] = [];

        if (start_date) {
            salesQuery += ' AND sale_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            salesQuery += ' AND sale_date <= ?';
            params.push(end_date);
        }

        const salesStats = query(salesQuery, params)[0];

        // Recent activities
        const recentActivities = query(`
      SELECT a.*, c.first_name, c.last_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

        res.json({
            contacts: totalContacts,
            deals: dealStats,
            sales: salesStats,
            recentActivities
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Sales trends over time
router.get('/trends/sales', (req: Request, res: Response) => {
    try {
        const { period = 'month', limit = '12' } = req.query;

        let groupBy = '';
        if (period === 'day') {
            groupBy = "strftime('%Y-%m-%d', sale_date)";
        } else if (period === 'week') {
            groupBy = "strftime('%Y-W%W', sale_date)";
        } else {
            groupBy = "strftime('%Y-%m', sale_date)";
        }

        const trends = query(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM sales
      WHERE sale_date IS NOT NULL
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
        const customers = cluster.points.map((i: number) => customerData[i]);
        const avgValue = customers.reduce((sum: number, c: any) => sum + c.total_value, 0) / customers.length;
        const avgFrequency = customers.reduce((sum: number, c: any) => sum + c.purchase_count, 0) / customers.length;
        const avgRecency = customers.reduce((sum: number, c: any) => sum + c.days_since_last_purchase, 0) / customers.length;

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
