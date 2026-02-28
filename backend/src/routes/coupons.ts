import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// GET all coupons (admin)
router.get('/', (_req: Request, res: Response) => {
    try {
        const coupons = query('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json({ coupons });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST create coupon (admin)
router.post('/', (req: Request, res: Response) => {
    try {
        const { code, discount_type, discount_value, min_order_amount, max_discount, max_uses, is_active, expires_at } = req.body;

        if (!code?.trim()) return res.status(400).json({ error: 'Coupon code is required' });
        if (!discount_value || discount_value <= 0) return res.status(400).json({ error: 'Discount value must be greater than 0' });
        if (discount_type === 'percentage' && discount_value > 100) return res.status(400).json({ error: 'Percentage cannot exceed 100' });

        const upperCode = code.trim().toUpperCase();
        const existing = queryOne('SELECT id FROM coupons WHERE code = ?', [upperCode]);
        if (existing) return res.status(400).json({ error: 'Coupon code already exists' });

        const result = execute(
            `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, max_uses, is_active, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                upperCode,
                discount_type || 'percentage',
                Number(discount_value),
                Number(min_order_amount) || 0,
                Number(max_discount) || 0,
                Number(max_uses) || 0,
                is_active !== undefined ? (is_active ? 1 : 0) : 1,
                expires_at || ''
            ]
        );

        const coupon = queryOne('SELECT * FROM coupons WHERE id = ?', [result.lastInsertRowid]);
        res.json({ coupon });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update coupon (admin)
router.put('/:id', (req: Request, res: Response) => {
    try {
        const { code, discount_type, discount_value, min_order_amount, max_discount, max_uses, is_active, expires_at } = req.body;
        const id = req.params.id;

        if (!code?.trim()) return res.status(400).json({ error: 'Coupon code is required' });

        const upperCode = code.trim().toUpperCase();
        const dup = queryOne('SELECT id FROM coupons WHERE code = ? AND id != ?', [upperCode, id]);
        if (dup) return res.status(400).json({ error: 'Coupon code already exists' });

        execute(
            `UPDATE coupons SET code = ?, discount_type = ?, discount_value = ?, min_order_amount = ?,
             max_discount = ?, max_uses = ?, is_active = ?, expires_at = ? WHERE id = ?`,
            [
                upperCode,
                discount_type || 'percentage',
                Number(discount_value) || 0,
                Number(min_order_amount) || 0,
                Number(max_discount) || 0,
                Number(max_uses) || 0,
                is_active ? 1 : 0,
                expires_at || '',
                id
            ]
        );

        const coupon = queryOne('SELECT * FROM coupons WHERE id = ?', [id]);
        res.json({ coupon });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE coupon (admin)
router.delete('/:id', (req: Request, res: Response) => {
    try {
        execute('DELETE FROM coupons WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH toggle active status (admin)
router.patch('/:id/toggle', (req: Request, res: Response) => {
    try {
        execute('UPDATE coupons SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?', [req.params.id]);
        const coupon = queryOne('SELECT * FROM coupons WHERE id = ?', [req.params.id]);
        res.json({ coupon });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
