import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Allowed activity types and priorities
const ACTIVITY_TYPES = ['call', 'meeting', 'email', 'task', 'follow_up', 'note'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// Input validation
function validateActivityInput(data: any): { valid: boolean; error?: string } {
    if (!data.subject?.trim()) {
        return { valid: false, error: 'Subject is required' };
    }
    if (data.subject.length > 255) {
        return { valid: false, error: 'Subject must be under 255 characters' };
    }
    if (data.type && !ACTIVITY_TYPES.includes(data.type)) {
        return { valid: false, error: `Type must be one of: ${ACTIVITY_TYPES.join(', ')}` };
    }
    if (data.priority && !PRIORITIES.includes(data.priority)) {
        return { valid: false, error: `Priority must be one of: ${PRIORITIES.join(', ')}` };
    }
    if (data.description && data.description.length > 5000) {
        return { valid: false, error: 'Description must be under 5000 characters' };
    }
    return { valid: true };
}

// Get all activities (with filters)
router.get('/', async (req: Request, res: Response) => {
    try {
        const { type, customer_id, completed, priority, limit = '50', offset = '0' } = req.query;

        const safeLimitNum = Math.min(Number(limit) || 50, 200);
        const safeOffsetNum = Math.max(Number(offset) || 0, 0);

        let sql = `
            SELECT a.*, c.name as customer_name, c.phone as customer_phone
            FROM activities a
            LEFT JOIN customers c ON a.customer_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let countSql = `SELECT COUNT(*) as count FROM activities WHERE 1=1`;
        const countParams: any[] = [];

        if (type) {
            sql += ' AND a.type = ?';
            params.push(type);
            countSql += ' AND type = ?';
            countParams.push(type);
        }

        if (customer_id) {
            sql += ' AND a.customer_id = ?';
            params.push(Number(customer_id));
            countSql += ' AND customer_id = ?';
            countParams.push(Number(customer_id));
        }

        if (completed !== undefined && completed !== '') {
            const isCompleted = completed === 'true' || completed === '1';
            sql += ' AND a.completed = ?';
            params.push(isCompleted);
            countSql += ' AND completed = ?';
            countParams.push(isCompleted);
        }

        if (priority) {
            sql += ' AND a.priority = ?';
            params.push(priority);
            countSql += ' AND priority = ?';
            countParams.push(priority);
        }

        sql += ' ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC LIMIT ? OFFSET ?';
        params.push(safeLimitNum, safeOffsetNum);

        const activities = await query(sql, params);
        const totalResult = await queryOne(countSql, countParams);
        const total = totalResult ? (totalResult as any).count : 0;

        res.json({ activities, total });
    } catch (error: any) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get activities for a specific customer
router.get('/customer/:customerId', async (req: Request, res: Response) => {
    try {
        const { customerId } = req.params;

        const activities = await query(
            `SELECT a.*, c.name as customer_name
             FROM activities a
             LEFT JOIN customers c ON a.customer_id = c.id
             WHERE a.customer_id = ?
             ORDER BY a.created_at DESC
             LIMIT 100`,
            [Number(customerId)]
        );

        res.json({ activities });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get upcoming tasks (due within next 7 days, not completed)
router.get('/upcoming', async (req: Request, res: Response) => {
    try {
        const activities = await query(
            `SELECT a.*, c.name as customer_name, c.phone as customer_phone
             FROM activities a
             LEFT JOIN customers c ON a.customer_id = c.id
             WHERE a.completed = false
               AND a.due_date IS NOT NULL
               AND a.due_date <= CURRENT_TIMESTAMP + INTERVAL '7 days'
             ORDER BY a.due_date ASC
             LIMIT 20`
        );

        res.json({ activities });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get activity stats (counts by type)
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await query(`
            SELECT
                type,
                COUNT(*) as total,
                COUNT(CASE WHEN completed = true THEN 1 END) as completed_count,
                COUNT(CASE WHEN completed = false THEN 1 END) as pending_count
            FROM activities
            GROUP BY type
            ORDER BY total DESC
        `);

        const overview = await queryOne(`
            SELECT
                COUNT(*) as total_activities,
                COUNT(CASE WHEN completed = true THEN 1 END) as completed,
                COUNT(CASE WHEN completed = false THEN 1 END) as pending,
                COUNT(CASE WHEN due_date < CURRENT_TIMESTAMP AND completed = false THEN 1 END) as overdue
            FROM activities
        `);

        res.json({ stats, overview });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create activity
router.post('/', async (req: Request, res: Response) => {
    try {
        const { customer_id, type, subject, description, due_date, priority } = req.body;

        const validation = validateActivityInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Verify customer exists if provided
        if (customer_id) {
            const customer = await queryOne('SELECT id FROM customers WHERE id = ?', [customer_id]);
            if (!customer) {
                return res.status(404).json({ error: 'Customer not found' });
            }
        }

        const result = await execute(
            `INSERT INTO activities (customer_id, type, subject, description, due_date, priority)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                customer_id || null,
                type || 'note',
                subject.trim(),
                description || null,
                due_date || null,
                priority || 'medium'
            ]
        );

        const activity = await queryOne(
            `SELECT a.*, c.name as customer_name
             FROM activities a
             LEFT JOIN customers c ON a.customer_id = c.id
             WHERE a.id = ?`,
            [result.lastInsertRowid]
        );

        res.status(201).json(activity);
    } catch (error: any) {
        console.error('Error creating activity:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update activity
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { customer_id, type, subject, description, due_date, priority, completed } = req.body;

        const existing = await queryOne('SELECT * FROM activities WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        const validation = validateActivityInput({ ...existing, ...req.body });
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Calculate completed_at
        let completedAt = (existing as any).completed_at;
        if (completed === true && !(existing as any).completed) {
            completedAt = new Date().toISOString();
        } else if (completed === false) {
            completedAt = null;
        }

        await execute(
            `UPDATE activities SET
                customer_id = COALESCE(?, customer_id),
                type = COALESCE(?, type),
                subject = COALESCE(?, subject),
                description = COALESCE(?, description),
                due_date = ?,
                priority = COALESCE(?, priority),
                completed = COALESCE(?, completed),
                completed_at = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                customer_id ?? (existing as any).customer_id,
                type,
                subject,
                description,
                due_date !== undefined ? due_date : (existing as any).due_date,
                priority,
                completed !== undefined ? completed : (existing as any).completed,
                completedAt,
                req.params.id
            ]
        );

        const updated = await queryOne(
            `SELECT a.*, c.name as customer_name
             FROM activities a
             LEFT JOIN customers c ON a.customer_id = c.id
             WHERE a.id = ?`,
            [req.params.id]
        );

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle complete status
router.patch('/:id/complete', async (req: Request, res: Response) => {
    try {
        const existing = await queryOne('SELECT * FROM activities WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        const wasCompleted = (existing as any).completed;
        const newCompleted = !wasCompleted;
        const completedAt = newCompleted ? new Date().toISOString() : null;

        await execute(
            `UPDATE activities SET completed = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [newCompleted, completedAt, req.params.id]
        );

        const updated = await queryOne(
            `SELECT a.*, c.name as customer_name
             FROM activities a
             LEFT JOIN customers c ON a.customer_id = c.id
             WHERE a.id = ?`,
            [req.params.id]
        );

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete activity
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const existing = await queryOne('SELECT * FROM activities WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        await execute('DELETE FROM activities WHERE id = ?', [req.params.id]);
        res.json({ message: 'Activity deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
