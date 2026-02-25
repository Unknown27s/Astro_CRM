import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Get all activities
router.get('/', (req: Request, res: Response) => {
    try {
        const { contact_id, deal_id, type, limit = '100' } = req.query;

        let sql = `
      SELECT a.*, c.first_name, c.last_name, d.title as deal_title
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN deals d ON a.deal_id = d.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (contact_id) {
            sql += ' AND a.contact_id = ?';
            params.push(contact_id);
        }

        if (deal_id) {
            sql += ' AND a.deal_id = ?';
            params.push(deal_id);
        }

        if (type) {
            sql += ' AND a.type = ?';
            params.push(type);
        }

        sql += ' ORDER BY a.created_at DESC LIMIT ?';
        params.push(Number(limit));

        const activities = query(sql, params);
        res.json({ activities });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create activity
router.post('/', (req: Request, res: Response) => {
    try {
        const { type, subject, description, contact_id, deal_id, due_date } = req.body;

        if (!type || !subject) {
            return res.status(400).json({ error: 'Type and subject are required' });
        }

        const result = execute(
            `INSERT INTO activities (type, subject, description, contact_id, deal_id, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [type, subject, description, contact_id, deal_id, due_date]
        );

        const activity = queryOne('SELECT * FROM activities WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(activity);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update activity
router.put('/:id', (req: Request, res: Response) => {
    try {
        const { type, subject, description, contact_id, deal_id, due_date, completed } = req.body;

        execute(
            `UPDATE activities SET
        type = ?, subject = ?, description = ?, contact_id = ?,
        deal_id = ?, due_date = ?, completed = ?
      WHERE id = ?`,
            [type, subject, description, contact_id, deal_id, due_date, completed ? 1 : 0, req.params.id]
        );

        const activity = queryOne('SELECT * FROM activities WHERE id = ?', [req.params.id]);
        res.json(activity);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete activity
router.delete('/:id', (req: Request, res: Response) => {
    try {
        execute('DELETE FROM activities WHERE id = ?', [req.params.id]);
        res.json({ message: 'Activity deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
