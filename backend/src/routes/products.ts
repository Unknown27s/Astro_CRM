import { Router, Request, Response } from 'express';
import { query, execute } from '../database/db';

const router = Router();

// GET all products (admin)
router.get('/', (req: Request, res: Response) => {
    try {
        const products = query('SELECT * FROM products ORDER BY created_at DESC');
        res.json({
            products,
            total: products.length,
            message: 'Products retrieved successfully'
        });
    } catch (error: any) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch products' });
    }
});

// GET single product
router.get('/:id', (req: Request, res: Response) => {
    try {
        const product = query('SELECT * FROM products WHERE id = ?', [req.params.id])[0];
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ product });
    } catch (error: any) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST create product
router.post('/', (req: Request, res: Response) => {
    try {
        const {
            name, description, price, original_price, selling_price,
            image_url, category, stock_qty, current_stock, in_stock, is_visible,
            sku, barcode, cost_price, min_stock_level, max_stock_level, supplier
        } = req.body;

        if (!name?.trim()) return res.status(400).json({ error: 'Product name is required' });

        // Accept either 'price' or 'selling_price'
        const finalPrice = price || selling_price;
        if (finalPrice === undefined || finalPrice === null) {
            return res.status(400).json({ error: 'Price or selling_price is required' });
        }

        try {
            const result = execute(
                `INSERT INTO products (
                    name, description, price, original_price, image_url, category,
                    stock_qty, in_stock, is_visible, sku, barcode, cost_price,
                    selling_price, current_stock, min_stock_level, max_stock_level, supplier
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    name.trim(),
                    description || '',
                    Number(price) || null,
                    original_price ? Number(original_price) : null,
                    image_url || '',
                    category || '',
                    Number(stock_qty) || Number(current_stock) || 0,
                    in_stock !== false ? 1 : 0,
                    is_visible !== false ? 1 : 0,
                    sku || '',
                    barcode || '',
                    cost_price ? Number(cost_price) : null,
                    Number(finalPrice),
                    Number(current_stock) || Number(stock_qty) || 0,
                    min_stock_level ? Number(min_stock_level) : 10,
                    max_stock_level ? Number(max_stock_level) : 100,
                    supplier || ''
                ]
            );

            const product = query('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid])[0];
            res.status(201).json({ product, message: 'Product created successfully' });
        } catch (dbError: any) {
            console.error('Database error creating product:', dbError);
            return res.status(500).json({
                error: `Failed to create product: ${dbError.message}`,
                details: dbError.message
            });
        }
    } catch (error: any) {
        console.error('Product creation error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// PUT update product
router.put('/:id', (req: Request, res: Response) => {
    try {
        const {
            name, description, price, original_price,
            image_url, category, stock_qty, in_stock, is_visible
        } = req.body;

        execute(
            `UPDATE products SET name=?, description=?, price=?, original_price=?, image_url=?,
             category=?, stock_qty=?, in_stock=?, is_visible=? WHERE id=?`,
            [
                name?.trim() || '',
                description || '',
                Number(price),
                original_price ? Number(original_price) : null,
                image_url || '',
                category || '',
                Number(stock_qty) || 0,
                in_stock ? 1 : 0,
                is_visible ? 1 : 0,
                req.params.id
            ]
        );

        const product = query('SELECT * FROM products WHERE id = ?', [req.params.id])[0];
        res.json({ product });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH toggle visibility
router.patch('/:id/toggle-visibility', (req: Request, res: Response) => {
    try {
        execute(
            'UPDATE products SET is_visible = CASE WHEN is_visible = 1 THEN 0 ELSE 1 END WHERE id = ?',
            [req.params.id]
        );
        const product = query('SELECT * FROM products WHERE id = ?', [req.params.id])[0];
        res.json({ product });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH toggle stock
router.patch('/:id/toggle-stock', (req: Request, res: Response) => {
    try {
        execute(
            'UPDATE products SET in_stock = CASE WHEN in_stock = 1 THEN 0 ELSE 1 END WHERE id = ?',
            [req.params.id]
        );
        const product = query('SELECT * FROM products WHERE id = ?', [req.params.id])[0];
        res.json({ product });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE product
router.delete('/:id', (req: Request, res: Response) => {
    try {
        execute('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
