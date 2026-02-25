import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Input validation helper
function validateCustomerInput(data: any, isUpdate = false): { valid: boolean; error?: string } {
    if (!isUpdate && !data.name?.trim()) {
        return { valid: false, error: 'Name is required' };
    }

    if (data.name && data.name.length > 200) {
        return { valid: false, error: 'Name must be less than 200 characters' };
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return { valid: false, error: 'Invalid email format' };
    }

    if (data.phone && data.phone.length > 20) {
        return { valid: false, error: 'Phone must be less than 20 characters' };
    }

    if (data.location && data.location.length > 200) {
        return { valid: false, error: 'Location must be less than 200 characters' };
    }

    return { valid: true };
}

// Get all customers
router.get('/', (req: Request, res: Response) => {
    try {
        const { search, status, location, limit = '100', offset = '0' } = req.query;

        const safeLimitNum = Math.min(Number(limit) || 100, 500);
        const safeOffsetNum = Math.max(Number(offset) || 0, 0);

        let sql = 'SELECT * FROM customers WHERE 1=1';
        const params: any[] = [];
        let countSql = 'SELECT COUNT(*) as count FROM customers WHERE 1=1';
        const countParams: any[] = [];

        if (search) {
            sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR location LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            countSql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR location LIKE ?)';
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
            countSql += ' AND status = ?';
            countParams.push(status);
        }

        if (location) {
            sql += ' AND location LIKE ?';
            params.push(`%${location}%`);
            countSql += ' AND location LIKE ?';
            countParams.push(`%${location}%`);
        }

        sql += ' ORDER BY last_purchase_date DESC, created_at DESC LIMIT ? OFFSET ?';
        params.push(safeLimitNum, safeOffsetNum);

        const customers = query(sql, params);
        const totalResult = queryOne(countSql, countParams);
        const total = totalResult ? (totalResult as any).count : 0;

        res.json({ customers, total });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single customer with purchase history
router.get('/:id', (req: Request, res: Response) => {
    try {
        const customer = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const purchases = query(
            'SELECT * FROM purchases WHERE customer_id = ? ORDER BY purchase_date DESC',
            [req.params.id]
        );

        res.json({ ...customer, purchases });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create customer
router.post('/', (req: Request, res: Response) => {
    try {
        const { name, phone, email, location, notes } = req.body;

        const validation = validateCustomerInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Check for duplicate phone number or email
        if (phone) {
            const existingByPhone = queryOne('SELECT id, name FROM customers WHERE phone = ?', [phone]);
            if (existingByPhone) {
                return res.status(409).json({ 
                    error: 'Duplicate customer',
                    message: `Customer with phone ${phone} already exists: ${(existingByPhone as any).name}`,
                    existingCustomerId: (existingByPhone as any).id
                });
            }
        }

        if (email) {
            const existingByEmail = queryOne('SELECT id, name FROM customers WHERE email = ?', [email]);
            if (existingByEmail) {
                return res.status(409).json({ 
                    error: 'Duplicate customer',
                    message: `Customer with email ${email} already exists: ${(existingByEmail as any).name}`,
                    existingCustomerId: (existingByEmail as any).id
                });
            }
        }

        const result = execute(
            `INSERT INTO customers (name, phone, email, location, notes, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, phone, email, location, notes, 'Active']
        );

        const customer = queryOne('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(customer);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update customer
router.put('/:id', (req: Request, res: Response) => {
    try {
        const { name, phone, email, location, notes, status } = req.body;

        const validation = validateCustomerInput(req.body, true);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const customer = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        execute(
            `UPDATE customers 
             SET name = COALESCE(?, name),
                 phone = COALESCE(?, phone),
                 email = COALESCE(?, email),
                 location = COALESCE(?, location),
                 notes = COALESCE(?, notes),
                 status = COALESCE(?, status)
             WHERE id = ?`,
            [name, phone, email, location, notes, status, req.params.id]
        );

        const updated = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete customer
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const customer = queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        execute('DELETE FROM customers WHERE id = ?', [req.params.id]);
        res.json({ message: 'Customer deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get customer statistics
router.get('/stats/overview', (req: Request, res: Response) => {
    try {
        const stats = queryOne(`
            SELECT 
                COUNT(*) as total_customers,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_customers,
                COUNT(CASE WHEN status = 'VIP' THEN 1 END) as vip_customers,
                COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_customers,
                COALESCE(SUM(total_spent), 0) as total_revenue,
                COALESCE(AVG(total_spent), 0) as avg_customer_value
            FROM customers
        `);

        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Remove duplicate customers by phone number
router.post('/cleanup/duplicates', (req: Request, res: Response) => {
    try {
        // Find all phone numbers that have duplicates
        const duplicates = query(`
            SELECT phone, COUNT(*) as count
            FROM customers
            WHERE phone IS NOT NULL AND phone != ''
            GROUP BY phone
            HAVING COUNT(*) > 1
        `);

        if (duplicates.length === 0) {
            return res.json({
                message: 'No duplicates found',
                removed: 0,
                kept: 0
            });
        }

        let removed = 0;
        let kept = 0;

        // For each duplicate phone, keep the oldest one and delete the rest
        duplicates.forEach((dup: any) => {
            const customers = query(
                `SELECT id, created_at FROM customers WHERE phone = ? ORDER BY created_at ASC`,
                [dup.phone]
            );

            // Keep the first one (oldest)
            kept++;
            
            // Delete the rest
            for (let i = 1; i < customers.length; i++) {
                execute('DELETE FROM customers WHERE id = ?', [(customers[i] as any).id]);
                removed++;
            }
        });

        res.json({
            message: 'Duplicates removed successfully',
            removed,
            kept,
            duplicatePhones: duplicates.length
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
