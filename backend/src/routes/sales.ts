import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Get all sales
router.get('/', (req: Request, res: Response) => {
    try {
        const { start_date, end_date, region, category, limit = '1000' } = req.query;

        let sql = `
      SELECT s.*, c.first_name, c.last_name, c.company
      FROM sales s
      LEFT JOIN contacts c ON s.contact_id = c.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (start_date) {
            sql += ' AND s.sale_date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND s.sale_date <= ?';
            params.push(end_date);
        }

        if (region) {
            sql += ' AND s.region = ?';
            params.push(region);
        }

        if (category) {
            sql += ' AND s.category = ?';
            params.push(category);
        }

        sql += ' ORDER BY s.sale_date DESC LIMIT ?';
        params.push(Number(limit));

        const sales = query(sql, params);
        res.json({ sales });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create sale
router.post('/', (req: Request, res: Response) => {
    try {
        const {
            contact_id, deal_id, product_name, quantity, unit_price,
            total_amount, sale_date, region, category
        } = req.body;

        if (!product_name) {
            return res.status(400).json({ error: 'Product name is required' });
        }

        const quantityNumber = Math.max(1, Number(quantity) || 1);
        const unitPriceNumber = Math.max(0, Number(unit_price) || 0);
        const providedTotal = Number(total_amount);
        const totalAmountNumber = Number.isFinite(providedTotal) && providedTotal > 0
            ? providedTotal
            : quantityNumber * unitPriceNumber;
        const saleDateValue = sale_date || new Date().toISOString().split('T')[0];

        const result = execute(
            `INSERT INTO sales (
        contact_id, deal_id, product_name, quantity, unit_price,
        total_amount, sale_date, region, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [contact_id, deal_id, product_name, quantityNumber, unitPriceNumber,
                totalAmountNumber, saleDateValue, region, category]
        );

        const sale = queryOne('SELECT * FROM sales WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(sale);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get sales statistics
router.get('/stats/summary', (req: Request, res: Response) => {
    try {
        const { start_date, end_date } = req.query;

        let sql = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_sale_value,
        COUNT(DISTINCT contact_id) as unique_customers
      FROM sales
      WHERE 1=1
    `;
        const params: any[] = [];

        if (start_date) {
            sql += ' AND sale_date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND sale_date <= ?';
            params.push(end_date);
        }

        const stats = queryOne(sql, params);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get sales by region
router.get('/stats/by-region', (req: Request, res: Response) => {
    try {
        const stats = query(`
      SELECT 
        region,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM sales
      WHERE region IS NOT NULL
      GROUP BY region
      ORDER BY revenue DESC
    `);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get sales by category
router.get('/stats/by-category', (req: Request, res: Response) => {
    try {
        const stats = query(`
      SELECT 
        category,
        COUNT(*) as count,
        SUM(total_amount) as revenue
      FROM sales
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY revenue DESC
    `);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
