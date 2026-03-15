import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Get all products with current stock
router.get('/products', (req: Request, res: Response) => {
    try {
        const { category, low_stock, search } = req.query;

        let sql = `
            SELECT * FROM products
            WHERE 1=1
        `;
        const params: any[] = [];

        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }

        if (low_stock === 'true') {
            sql += ' AND current_stock <= min_stock_level';
        }

        if (search) {
            sql += ' AND (name LIKE ? OR barcode LIKE ? OR sku LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        sql += ' ORDER BY current_stock ASC, name ASC';

        const products = query(sql, params);
        res.json({ products });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single product by barcode
router.get('/products/barcode/:barcode', (req: Request, res: Response) => {
    try {
        const product = queryOne('SELECT * FROM products WHERE barcode = ?', [req.params.barcode]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Add new product
router.post('/products', (req: Request, res: Response) => {
    try {
        const { name, sku, barcode, category, description, cost_price, selling_price, min_stock_level, max_stock_level, supplier, current_stock } = req.body;

        if (!name?.trim() || !selling_price) {
            return res.status(400).json({ error: 'Product name and selling price are required' });
        }

        if (barcode) {
            const existing = queryOne('SELECT id FROM products WHERE barcode = ?', [barcode]);
            if (existing) {
                return res.status(409).json({ error: 'Barcode already exists' });
            }
        }

        const result = execute(
            `INSERT INTO products (name, sku, barcode, category, description, cost_price, selling_price, min_stock_level, max_stock_level, supplier, current_stock)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, sku, barcode, category, description, cost_price, selling_price, min_stock_level || 10, max_stock_level || 100, supplier, current_stock || 0]
        );

        const product = queryOne('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(product);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update product stock
router.put('/products/:id', (req: Request, res: Response) => {
    try {
        const { name, category, description, cost_price, selling_price, min_stock_level, max_stock_level, supplier } = req.body;

        const product = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        execute(
            `UPDATE products
             SET name = COALESCE(?, name),
                 category = COALESCE(?, category),
                 description = COALESCE(?, description),
                 cost_price = COALESCE(?, cost_price),
                 selling_price = COALESCE(?, selling_price),
                 min_stock_level = COALESCE(?, min_stock_level),
                 max_stock_level = COALESCE(?, max_stock_level),
                 supplier = COALESCE(?, supplier),
                 updated_at = datetime('now')
             WHERE id = ?`,
            [name, category, description, cost_price, selling_price, min_stock_level, max_stock_level, supplier, req.params.id]
        );

        const updated = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Record barcode scan (stock adjustment)
router.post('/scan-barcode', (req: Request, res: Response) => {
    try {
        const { barcode, quantity, transaction_type, reason, notes } = req.body;

        if (!barcode || !quantity) {
            return res.status(400).json({ error: 'Barcode and quantity are required' });
        }

        const product = queryOne('SELECT * FROM products WHERE barcode = ?', [barcode]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const quantityChange = transaction_type === 'sale' ? -quantity : quantity;
        const newQuantity = (product as any).current_stock + quantityChange;

        if (newQuantity < 0) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        // Update product stock
        execute('UPDATE products SET current_stock = ?, last_restock_date = datetime("now"), updated_at = datetime("now") WHERE id = ?', [newQuantity, (product as any).id]);

        // Log transaction
        const result = execute(
            `INSERT INTO inventory_transactions (product_id, transaction_type, quantity_change, previous_quantity, new_quantity, reason, barcode_scanned, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [(product as any).id, transaction_type || 'adjustment', quantityChange, (product as any).current_stock, newQuantity, reason, barcode, notes]
        );

        const transaction = queryOne('SELECT * FROM inventory_transactions WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json({
            transaction,
            product: { id: (product as any).id, name: (product as any).name, current_stock: newQuantity }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get inventory transaction history
router.get('/transactions', (req: Request, res: Response) => {
    try {
        const { product_id, type, limit = '50' } = req.query;

        let sql = `
            SELECT t.*, p.name as product_name, p.barcode
            FROM inventory_transactions t
            LEFT JOIN products p ON t.product_id = p.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (product_id) {
            sql += ' AND t.product_id = ?';
            params.push(product_id);
        }

        if (type) {
            sql += ' AND t.transaction_type = ?';
            params.push(type);
        }

        sql += ' ORDER BY t.created_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 50, 500));

        const transactions = query(sql, params);
        res.json({ transactions });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get low stock products
router.get('/low-stock', (req: Request, res: Response) => {
    try {
        const products = query(
            `SELECT * FROM products
             WHERE current_stock <= min_stock_level
             ORDER BY current_stock ASC`
        );
        res.json({ products });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get inventory dashboard stats
router.get('/dashboard-stats', (req: Request, res: Response) => {
    try {
        const totalProducts = queryOne('SELECT COUNT(*) as count FROM products');
        const lowStockProducts = queryOne('SELECT COUNT(*) as count FROM products WHERE current_stock <= min_stock_level');
        const totalStockValue = queryOne('SELECT SUM(current_stock * selling_price) as value FROM products');
        const recentTransactions = query(
            `SELECT * FROM inventory_transactions
             ORDER BY created_at DESC LIMIT 5`
        );

        res.json({
            total_products: (totalProducts as any)?.count || 0,
            low_stock_count: (lowStockProducts as any)?.count || 0,
            total_stock_value: (totalStockValue as any)?.value || 0,
            recent_transactions: recentTransactions
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
