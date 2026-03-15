import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

const NOTE_TYPES = ['general', 'call_log', 'meeting_notes', 'complaint', 'feedback', 'internal'];

// Get all notes for a customer
router.get('/customer/:customerId', async (req: Request, res: Response) => {
    try {
        const { customerId } = req.params;
        const { note_type, limit = '50' } = req.query;

        let sql = `
            SELECT cn.*, u.full_name as author_name
            FROM customer_notes cn
            LEFT JOIN users u ON cn.user_id = u.id
            WHERE cn.customer_id = ?
        `;
        const params: any[] = [Number(customerId)];

        if (note_type) {
            sql += ' AND cn.note_type = ?';
            params.push(note_type);
        }

        sql += ' ORDER BY cn.is_pinned DESC, cn.created_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 50, 200));

        const notes = await query(sql, params);
        res.json({ notes });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get a single note
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const note = await queryOne(
            `SELECT cn.*, u.full_name as author_name
             FROM customer_notes cn
             LEFT JOIN users u ON cn.user_id = u.id
             WHERE cn.id = ?`,
            [req.params.id]
        );
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(note);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create a note
router.post('/', async (req: Request, res: Response) => {
    try {
        const { customer_id, note_type, content } = req.body;

        if (!customer_id) {
            return res.status(400).json({ error: 'Customer ID is required' });
        }
        if (!content?.trim()) {
            return res.status(400).json({ error: 'Note content is required' });
        }
        if (content.length > 10000) {
            return res.status(400).json({ error: 'Note content must be under 10,000 characters' });
        }
        if (note_type && !NOTE_TYPES.includes(note_type)) {
            return res.status(400).json({ error: `Note type must be one of: ${NOTE_TYPES.join(', ')}` });
        }

        // Verify customer exists
        const customer = await queryOne('SELECT id FROM customers WHERE id = ?', [customer_id]);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const result = await execute(
            `INSERT INTO customer_notes (customer_id, note_type, content)
             VALUES (?, ?, ?)`,
            [customer_id, note_type || 'general', content.trim()]
        );

        const note = await queryOne(
            `SELECT cn.*, u.full_name as author_name
             FROM customer_notes cn
             LEFT JOIN users u ON cn.user_id = u.id
             WHERE cn.id = ?`,
            [result.lastInsertRowid]
        );

        res.status(201).json(note);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update a note
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { note_type, content } = req.body;

        const existing = await queryOne('SELECT * FROM customer_notes WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Note not found' });
        }

        if (content !== undefined && !content?.trim()) {
            return res.status(400).json({ error: 'Note content cannot be empty' });
        }
        if (content && content.length > 10000) {
            return res.status(400).json({ error: 'Note content must be under 10,000 characters' });
        }

        await execute(
            `UPDATE customer_notes SET
                note_type = COALESCE(?, note_type),
                content = COALESCE(?, content),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [note_type, content?.trim(), req.params.id]
        );

        const updated = await queryOne(
            `SELECT cn.*, u.full_name as author_name
             FROM customer_notes cn
             LEFT JOIN users u ON cn.user_id = u.id
             WHERE cn.id = ?`,
            [req.params.id]
        );

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle pin status
router.patch('/:id/pin', async (req: Request, res: Response) => {
    try {
        const existing = await queryOne('SELECT * FROM customer_notes WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Note not found' });
        }

        const newPinned = !(existing as any).is_pinned;
        await execute(
            'UPDATE customer_notes SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newPinned, req.params.id]
        );

        const updated = await queryOne(
            `SELECT cn.*, u.full_name as author_name
             FROM customer_notes cn
             LEFT JOIN users u ON cn.user_id = u.id
             WHERE cn.id = ?`,
            [req.params.id]
        );

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a note
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const existing = await queryOne('SELECT * FROM customer_notes WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Note not found' });
        }

        await execute('DELETE FROM customer_notes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Note deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get note counts per customer (for list display)
router.get('/stats/counts', async (req: Request, res: Response) => {
    try {
        const counts = await query(`
            SELECT customer_id, COUNT(*) as note_count
            FROM customer_notes
            GROUP BY customer_id
        `);
        res.json({ counts });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
