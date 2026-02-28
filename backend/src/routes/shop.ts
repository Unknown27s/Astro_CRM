import { Router, Request, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/db';

const router = Router();

// ── PUBLIC ENDPOINTS (no auth required) ──────────────────────────────────────

// GET store front data (settings + visible products)
router.get('/storefront', (req: Request, res: Response) => {
    try {
        const settings = query('SELECT * FROM store_settings LIMIT 1')[0] || {};
        const products = query(
            'SELECT * FROM products WHERE is_visible = 1 ORDER BY created_at DESC'
        );
        res.json({ settings, products });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST validate a coupon code (public)
router.post('/validate-coupon', (req: Request, res: Response) => {
    try {
        const { code, cart_total } = req.body;
        if (!code?.trim()) return res.status(400).json({ error: 'Coupon code is required' });

        const coupon = queryOne<any>('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code.trim().toUpperCase()]);
        if (!coupon) return res.status(400).json({ error: 'Invalid or expired coupon code' });

        // Check expiry
        if (coupon.expires_at) {
            const expiry = new Date(coupon.expires_at);
            if (expiry < new Date()) return res.status(400).json({ error: 'This coupon has expired' });
        }

        // Check usage limit
        if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
            return res.status(400).json({ error: 'This coupon has reached its usage limit' });
        }

        // Check minimum order amount
        const total = Number(cart_total) || 0;
        if (coupon.min_order_amount > 0 && total < coupon.min_order_amount) {
            return res.status(400).json({ error: `Minimum order amount is ₹${coupon.min_order_amount}` });
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discount_type === 'percentage') {
            discount = total * (coupon.discount_value / 100);
            if (coupon.max_discount > 0) discount = Math.min(discount, coupon.max_discount);
        } else {
            discount = coupon.discount_value;
        }
        discount = Math.min(discount, total);

        res.json({
            valid: true,
            coupon_code: coupon.code,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            discount_amount: Math.round(discount * 100) / 100,
            max_discount: coupon.max_discount,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST place an order (public)
// Also: auto-creates or links a CRM customer, creates a purchase record, deducts product stock
router.post('/order', (req: Request, res: Response) => {
    try {
        const {
            customer_name, customer_phone, customer_email,
            customer_address, items, total_amount, notes,
            coupon_code, discount_amount
        } = req.body;

        if (!customer_name?.trim()) return res.status(400).json({ error: 'Name is required' });
        if (!customer_phone?.trim()) return res.status(400).json({ error: 'Phone is required' });
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        const orderNumber = 'ORD' + Date.now();
        const amount = Number(total_amount);
        const phone = customer_phone.trim();
        const name = customer_name.trim();
        const today = new Date().toISOString().split('T')[0];

        transaction(() => {
            // 1. Insert online order
            execute(
                `INSERT INTO online_orders
                 (order_number, customer_name, customer_phone, customer_email, customer_address, items, total_amount, notes, coupon_code, discount_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderNumber, name, phone,
                    customer_email || '', customer_address || '',
                    JSON.stringify(items), amount, notes || '',
                    coupon_code || '', Number(discount_amount) || 0
                ]
            );

            // 1b. Increment coupon used_count if a coupon was applied
            if (coupon_code) {
                execute('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?', [coupon_code.toUpperCase()]);
            }

            // 2. Find or create CRM customer by phone
            let customer = queryOne<any>('SELECT * FROM customers WHERE phone = ?', [phone]);
            if (!customer) {
                execute(
                    `INSERT INTO customers (name, phone, email, location, notes, status, total_spent, total_purchases, last_purchase_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [name, phone, customer_email || '', customer_address || '', 'Online customer', 'Active', amount, 1, today]
                );
                customer = queryOne<any>('SELECT * FROM customers WHERE phone = ?', [phone]);
            } else {
                // Update existing customer stats
                execute(
                    `UPDATE customers SET
                        total_spent = COALESCE(total_spent, 0) + ?,
                        total_purchases = COALESCE(total_purchases, 0) + 1,
                        last_purchase_date = ?,
                        status = CASE WHEN COALESCE(total_spent, 0) + ? >= 10000 THEN 'VIP' ELSE COALESCE(status, 'Active') END
                     WHERE id = ?`,
                    [amount, today, amount, customer.id]
                );
            }

            // 3. Create purchase record linked to customer
            if (customer) {
                execute(
                    `INSERT INTO purchases (customer_id, items, total_amount, payment_method, purchase_date, notes)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [customer.id, JSON.stringify(items), amount, 'Online', today, `Online Order: ${orderNumber}`]
                );
            }

            // 4. Deduct product stock for items that match by name
            for (const item of items) {
                if (item.name && item.qty) {
                    execute(
                        `UPDATE products SET stock_qty = MAX(0, stock_qty - ?) WHERE name = ? AND stock_qty > 0`,
                        [Number(item.qty), item.name]
                    );
                }
            }
        });

        res.json({ success: true, order_number: orderNumber });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ── ADMIN ENDPOINTS (auth required via global middleware) ─────────────────────

// GET store settings
router.get('/settings', (req: Request, res: Response) => {
    try {
        const settings = query('SELECT * FROM store_settings LIMIT 1')[0] || {};
        res.json({ settings });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update store settings
router.put('/settings', (req: Request, res: Response) => {
    try {
        const {
            store_name, store_tagline, primary_color, banner_text,
            contact_phone, contact_email, currency, whatsapp_number, is_active
        } = req.body;

        execute(
            `UPDATE store_settings SET
                store_name=?, store_tagline=?, primary_color=?, banner_text=?,
                contact_phone=?, contact_email=?, currency=?, whatsapp_number=?,
                is_active=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=1`,
            [
                store_name || 'My Online Store',
                store_tagline || '',
                primary_color || '#4F46E5',
                banner_text || '',
                contact_phone || '',
                contact_email || '',
                currency || '₹',
                whatsapp_number || '',
                is_active ? 1 : 0
            ]
        );

        const settings = query('SELECT * FROM store_settings LIMIT 1')[0];
        res.json({ settings });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET all online orders (admin)
router.get('/orders', (req: Request, res: Response) => {
    try {
        const orders = query('SELECT * FROM online_orders ORDER BY created_at DESC');
        res.json({ orders });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH update order status (admin)
router.patch('/orders/:id', (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        execute('UPDATE online_orders SET status = ? WHERE id = ?', [status, req.params.id]);
        const order = query('SELECT * FROM online_orders WHERE id = ?', [req.params.id])[0];
        res.json({ order });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE order (admin)
router.delete('/orders/:id', (req: Request, res: Response) => {
    try {
        execute('DELETE FROM online_orders WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
