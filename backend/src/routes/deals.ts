import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Input validation helper
function validateDealInput(data: any): { valid: boolean; error?: string } {
    const { title, value, probability, description } = data;

    if (!title || title.length > 200) {
        return { valid: false, error: 'Title is required and must be under 200 characters' };
    }
    if (value !== undefined && (Number(value) < 0 || Number(value) > 999999999)) {
        return { valid: false, error: 'Deal value must be between 0 and 999,999,999' };
    }
    if (probability !== undefined && (Number(probability) < 0 || Number(probability) > 100)) {
        return { valid: false, error: 'Probability must be between 0 and 100' };
    }
    if (description && description.length > 5000) {
        return { valid: false, error: 'Description too long (max 5000 chars)' };
    }

    return { valid: true };
}

// Get all deals
router.get('/', (req: Request, res: Response) => {
    try {
        const { stage, limit = '100', offset = '0' } = req.query;

        // Cap limit at 500 for performance
        const safeLimitNum = Math.min(Number(limit) || 100, 500);
        const safeOffsetNum = Math.max(Number(offset) || 0, 0);

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
        params.push(safeLimitNum, safeOffsetNum);

        const deals = query(sql, params);
        res.json({ deals });
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

        const validation = validateDealInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
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

        const validation = validateDealInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

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

export default router;
