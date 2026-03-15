import { Router, Request, Response } from 'express';
import { query, queryOne, execute, parseJsonField } from '../database/db';

const router = Router();

// Get all purchases (with optional customer filter)
router.get('/', async (req: Request, res: Response) => {
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

        const purchases = await query(sql, params);

        // Parse items JSON
        const formattedPurchases = purchases.map((p: any) => ({
            ...p,
            items: parseJsonField(p.items)
        }));

        res.json({ purchases: formattedPurchases });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent purchases
router.get('/recent', async (req: Request, res: Response) => {
    try {
        const { limit = '10' } = req.query;

        const purchases = await query(
            `SELECT p.*, c.name as customer_name, c.phone as customer_phone
             FROM purchases p
             LEFT JOIN customers c ON p.customer_id = c.id
             ORDER BY p.purchase_date DESC, p.created_at DESC
             LIMIT ?`,
            [Math.min(Number(limit) || 10, 50)]
        );

        const formattedPurchases = purchases.map((p: any) => ({
            ...p,
            items: parseJsonField(p.items)
        }));

        res.json({ purchases: formattedPurchases });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create purchase
router.post('/', async (req: Request, res: Response) => {
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
        const customer = await queryOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const purchaseDateValue = purchase_date || new Date().toISOString().split('T')[0];

        try {
            const result = await execute(
                `INSERT INTO purchases (customer_id, items, total_amount, payment_method, purchase_date, notes)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [customer_id, JSON.stringify(items), total_amount, payment_method || null, purchaseDateValue, notes || null]
            );

            // Update customer aggregates - wrap in try-catch to prevent cascading failures
            try {
                await updateCustomerAggregates(customer_id);
            } catch (aggregateError: any) {
                console.warn('Warning updating aggregates:', aggregateError.message);
                // Don't fail the purchase if aggregates fail
            }

            const purchase = await queryOne('SELECT * FROM purchases WHERE id = ?', [result.lastInsertRowid]);
            if (!purchase) {
                return res.status(500).json({ error: 'Failed to retrieve created purchase' });
            }

            res.status(201).json({
                ...purchase,
                items: parseJsonField((purchase as any).items)
            });
        } catch (dbError: any) {
            console.error('Database error creating purchase:', dbError);
            return res.status(500).json({ error: 'Failed to create purchase: ' + dbError.message });
        }
    } catch (error: any) {
        console.error('Purchase creation error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Update purchase
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { items, total_amount, payment_method, purchase_date, notes } = req.body;

        const purchase = await queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        // Validate items if provided
        if (items && Array.isArray(items)) {
            for (const item of items) {
                if (!item.name || item.qty === undefined || item.price === undefined) {
                    return res.status(400).json({
                        error: 'Each item must have name, qty, and price'
                    });
                }
            }
        }

        const itemsJson = items ? JSON.stringify(items) : (purchase as any).items;

        try {
            await execute(
                `UPDATE purchases
                 SET items = ?,
                     total_amount = COALESCE(?, total_amount),
                     payment_method = COALESCE(?, payment_method),
                     purchase_date = COALESCE(?, purchase_date),
                     notes = COALESCE(?, notes)
                 WHERE id = ?`,
                [itemsJson, total_amount, payment_method || null, purchase_date, notes || null, req.params.id]
            );

            // Update customer aggregates - wrap in try-catch to prevent cascading failures
            try {
                await updateCustomerAggregates((purchase as any).customer_id);
            } catch (aggregateError: any) {
                console.warn('Warning updating aggregates:', aggregateError.message);
                // Don't fail the update if aggregates fail
            }

            const updated = await queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
            if (!updated) {
                return res.status(500).json({ error: 'Failed to retrieve updated purchase' });
            }

            res.json({
                ...updated,
                items: parseJsonField((updated as any).items)
            });
        } catch (dbError: any) {
            console.error('Database error updating purchase:', dbError);
            return res.status(500).json({ error: 'Failed to update purchase: ' + dbError.message });
        }
    } catch (error: any) {
        console.error('Purchase update error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Delete purchase
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const purchase = await queryOne('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
        if (!purchase) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        const customerId = (purchase as any).customer_id;

        await execute('DELETE FROM purchases WHERE id = ?', [req.params.id]);

        // Update customer aggregates
        await updateCustomerAggregates(customerId);

        res.json({ message: 'Purchase deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to update customer aggregates
async function updateCustomerAggregates(customerId: number) {
    try {
        const purchases = await query('SELECT * FROM purchases WHERE customer_id = ?', [customerId]);

        if (purchases.length > 0) {
            const totalSpent = purchases.reduce((sum, p: any) => sum + (p.total_amount || 0), 0);
            const totalPurchases = purchases.length;
            const purchaseDates = purchases
                .map((p: any) => p.purchase_date)
                .filter(Boolean)
                .sort();

            const firstPurchase = purchaseDates[0] || null;
            const lastPurchase = purchaseDates[purchaseDates.length - 1] || null;

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

            await execute(
                `UPDATE customers
                 SET total_spent = ?, total_purchases = ?,
                     first_purchase_date = ?, last_purchase_date = ?, status = ?
                 WHERE id = ?`,
                [totalSpent, totalPurchases, firstPurchase, lastPurchase, status, customerId]
            );
        } else {
            // No purchases, reset aggregates
            await execute(
                `UPDATE customers
                 SET total_spent = 0, total_purchases = 0,
                     first_purchase_date = NULL, last_purchase_date = NULL
                 WHERE id = ?`,
                [customerId]
            );
        }
    } catch (error: any) {
        console.error('Error updating customer aggregates:', error);
        throw error;
    }
}

export default router;
