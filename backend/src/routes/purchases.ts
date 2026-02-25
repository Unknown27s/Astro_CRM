import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Get all purchases (with optional customer filter)
router.get('/', (req: Request, res: Response) => {
    try {
        const { customer_id, start_date, end_date, limit = '100' } = req.query;

        let sql = `
            SELECT p.*, c.name as customer_name, c.phone as customer_phone
            FROM purchases p
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (customer_id) {
            sql += ' AND p.customer_id = ?';
            params.push(customer_id);
        }

        if (start_date) {
            sql += ' AND p.purchase_date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            sql += ' AND p.purchase_date <= ?';
            params.push(end_date);
        }

        sql += ' ORDER BY p.purchase_date DESC, p.created_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 100, 1000));

        const purchases = query(sql, params);
        
        // Parse items JSON
        const formattedPurchases = purchases.map((p: any) => ({
            ...p,
            items: JSON.parse(p.items || '[]')
        }));

        res.json({ purchases: formattedPurchases });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent purchases
router.get('/recent', (req: Request, res: Response) => {
    try {
        const { limit = '10' } = req.query;
        
        const purchases = query(
            `SELECT p.*, c.name as customer_name, c.phone as customer_phone
             FROM purchases p
             LEFT JOIN customers c ON p.customer_id = c.id
             ORDER BY p.purchase_date DESC, p.created_at DESC
             LIMIT ?`,
            [Math.min(Number(limit) || 10, 50)]
        );

        const formattedPurchases = purchases.map((p: any) => ({
            ...p,
            items: JSON.parse(p.items || '[]')
        }));

        res.json({ purchases: formattedPurchases });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create purchase
router.post('/', (req: Request, res: Response) => {
    try {
        const { customer_id, items, total_amount, payment_method, purchase_date, notes } = req.body;

        if (!customer_id) {
            return res.status(400).json({ error: 'Customer ID is required' });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items array is required' });
        }

        // Validate items structure
        for (const item of items) {
            if (!item.name || item.qty === undefined || item.price === undefined) {
                return res.status(400).json({ 
                    error: 'Each item must have name, qty, and price' 
                });
            }
        }

        if (!total_amount || total_amount <= 0) {
            return res.status(400).json({ error: 'Valid total amount is required' });
        }

        // Check if customer exists
        const customer = queryOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const purchaseDateValue = purchase_date || new Date().toISOString().split('T')[0];

        const result = execute(
            `INSERT INTO purchases (customer_id, items, total_amount, payment_method, purchase_date, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [customer_id, JSON.stringify(items), total_amount, payment_method, purchaseDateValue, notes]
        );

        // Update customer aggregates
        updateCustomerAggregates(customer_id);

        const purchase = queryOne('SELECT * FROM purchases WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json({
            ...purchase,
            items: JSON.parse((purchase as any).items || '[]')
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update purchase
router.put('/:id', (req: Request, res: Response) => {
    try {
        const { items, total_amount, payment_method, purchase_date, notes } = req.body;

        const purchase = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        const itemsJson = items ? JSON.stringify(items) : (purchase as any).items;

        execute(
            `UPDATE purchases 
             SET items = ?,
                 total_amount = COALESCE(?, total_amount),
                 payment_method = COALESCE(?, payment_method),
                 purchase_date = COALESCE(?, purchase_date),
                 notes = COALESCE(?, notes)
             WHERE id = ?`,
            [itemsJson, total_amount, payment_method, purchase_date, notes, req.params.id]
        );

        // Update customer aggregates
        updateCustomerAggregates((purchase as any).customer_id);

        const updated = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
        res.json({
            ...updated,
            items: JSON.parse((updated as any).items || '[]')
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete purchase
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const purchase = queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        const customerId = (purchase as any).customer_id;
        
        execute('DELETE FROM purchases WHERE id = ?', [req.params.id]);
        
        // Update customer aggregates
        updateCustomerAggregates(customerId);

        res.json({ message: 'Purchase deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to update customer aggregates
function updateCustomerAggregates(customerId: number) {
    const purchases = query('SELECT * FROM purchases WHERE customer_id = ?', [customerId]);

    if (purchases.length > 0) {
        const totalSpent = purchases.reduce((sum, p: any) => sum + p.total_amount, 0);
        const totalPurchases = purchases.length;
        const purchaseDates = purchases
            .map((p: any) => p.purchase_date)
            .filter(Boolean)
            .sort();
        
        const firstPurchase = purchaseDates[0];
        const lastPurchase = purchaseDates[purchaseDates.length - 1];

        // Determine status
        let status = 'Active';
        if (lastPurchase) {
            const daysSinceLastPurchase = Math.floor(
                (Date.now() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastPurchase > 90) {
                status = 'Inactive';
            }
        }
        if (totalSpent >= 50000) {
            status = 'VIP';
        }

        execute(
            `UPDATE customers 
             SET total_spent = ?, total_purchases = ?, 
                 first_purchase_date = ?, last_purchase_date = ?, status = ?
             WHERE id = ?`,
            [totalSpent, totalPurchases, firstPurchase, lastPurchase, status, customerId]
        );
    } else {
        // No purchases, reset aggregates
        execute(
            `UPDATE customers 
             SET total_spent = 0, total_purchases = 0, 
                 first_purchase_date = NULL, last_purchase_date = NULL
             WHERE id = ?`,
            [customerId]
        );
    }
}

export default router;
