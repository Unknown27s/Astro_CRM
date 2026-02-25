import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Get all deals
router.get('/', (req: Request, res: Response) => {
    try {
        const { stage, limit = '100', offset = '0' } = req.query;

        let sql = `
      SELECT d.*, c.first_name, c.last_name, c.company
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (stage) {
            sql += ' AND d.stage = ?';
            params.push(stage);
        }

        sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const deals = query(sql, params);
        res.json({ deals });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single deal
router.get('/:id', (req: Request, res: Response) => {
    try {
        const deal = queryOne(`
      SELECT d.*, c.first_name, c.last_name, c.company
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE d.id = ?
    `, [req.params.id]);

        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        res.json(deal);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create deal
router.post('/', (req: Request, res: Response) => {
    try {
        const {
            title, contact_id, value, currency, stage, probability,
            expected_close_date, description
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const result = execute(
            `INSERT INTO deals (
        title, contact_id, value, currency, stage, probability,
        expected_close_date, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, contact_id, value || 0, currency || 'USD',
                stage || 'Prospecting', probability || 0, expected_close_date, description]
        );

        const deal = queryOne('SELECT * FROM deals WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(deal);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update deal
router.put('/:id', (req: Request, res: Response) => {
    try {
        const {
            title, contact_id, value, currency, stage, probability,
            expected_close_date, description
        } = req.body;

        execute(
            `UPDATE deals SET
        title = ?, contact_id = ?, value = ?, currency = ?, stage = ?,
        probability = ?, expected_close_date = ?, description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
            [title, contact_id, value, currency, stage, probability,
                expected_close_date, description, req.params.id]
        );

        const deal = queryOne('SELECT * FROM deals WHERE id = ?', [req.params.id]);
        res.json(deal);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete deal
router.delete('/:id', (req: Request, res: Response) => {
    try {
        execute('DELETE FROM deals WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deal deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get pipeline summary
router.get('/stats/pipeline', (req: Request, res: Response) => {
    try {
        const stats = query(`
      SELECT 
        stage,
        COUNT(*) as count,
        SUM(value) as total_value,
        AVG(probability) as avg_probability
      FROM deals
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'Prospecting' THEN 1
          WHEN 'Qualification' THEN 2
          WHEN 'Proposal' THEN 3
          WHEN 'Negotiation' THEN 4
          WHEN 'Closed Won' THEN 5
          WHEN 'Closed Lost' THEN 6
        END
    `);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
