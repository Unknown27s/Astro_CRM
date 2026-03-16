import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

function validateDealInput(data: any): { valid: boolean; error?: string } {
    if (!data.title?.trim()) {
        return { valid: false, error: 'Title is required' };
    }
    if (data.title.length > 255) {
        return { valid: false, error: 'Title must be under 255 characters' };
    }
    if (data.value !== undefined && (Number(data.value) < 0 || Number(data.value) > 999999999)) {
        return { valid: false, error: 'Deal value must be between 0 and 999,999,999' };
    }
    if (data.probability !== undefined && (Number(data.probability) < 0 || Number(data.probability) > 100)) {
        return { valid: false, error: 'Probability must be between 0 and 100' };
    }
    if (data.stage && !STAGES.includes(data.stage)) {
        return { valid: false, error: `Stage must be one of: ${STAGES.join(', ')}` };
    }
    if (data.description && data.description.length > 5000) {
        return { valid: false, error: 'Description must be under 5000 characters' };
    }
    return { valid: true };
}

/**
 * Update customer stats when a deal transitions to/from "Closed Won".
 * - Entering "Closed Won": add deal value to customer total_spent, increment total_purchases
 * - Leaving "Closed Won": subtract deal value from customer total_spent, decrement total_purchases
 */
async function syncCustomerOnStageChange(
    customerId: number | null,
    oldStage: string,
    newStage: string,
    dealValue: number
) {
    if (!customerId || oldStage === newStage) return;

    const wasWon = oldStage === 'Closed Won';
    const isNowWon = newStage === 'Closed Won';

    if (isNowWon && !wasWon) {
        // Deal just won → add value to customer
        await execute(
            `UPDATE customers SET
                total_spent = COALESCE(total_spent, 0) + ?,
                total_purchases = COALESCE(total_purchases, 0) + 1,
                last_purchase_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [dealValue, customerId]
        );
    } else if (wasWon && !isNowWon) {
        // Deal was won but moved away → subtract value from customer
        await execute(
            `UPDATE customers SET
                total_spent = GREATEST(COALESCE(total_spent, 0) - ?, 0),
                total_purchases = GREATEST(COALESCE(total_purchases, 0) - 1, 0),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [dealValue, customerId]
        );
    }
}

// Get all deals (with optional stage filter)
router.get('/', async (req: Request, res: Response) => {
    try {
        const { stage, customer_id, limit = '200', offset = '0' } = req.query;

        const safeLimitNum = Math.min(Number(limit) || 200, 500);
        const safeOffsetNum = Math.max(Number(offset) || 0, 0);

        let sql = `
            SELECT d.*, c.name as customer_name, c.phone as customer_phone
            FROM deals d
            LEFT JOIN customers c ON d.customer_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (stage) {
            sql += ' AND d.stage = ?';
            params.push(stage);
        }

        if (customer_id) {
            sql += ' AND d.customer_id = ?';
            params.push(Number(customer_id));
        }

        sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
        params.push(safeLimitNum, safeOffsetNum);

        const deals = await query(sql, params);
        res.json({ deals });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get pipeline summary (counts + values per stage)
router.get('/pipeline', async (req: Request, res: Response) => {
    try {
        const pipeline = await query(`
            SELECT
                stage,
                COUNT(*) as count,
                COALESCE(SUM(value), 0) as total_value,
                COALESCE(AVG(probability), 0) as avg_probability
            FROM deals
            GROUP BY stage
            ORDER BY
                CASE stage
                    WHEN 'Lead' THEN 1
                    WHEN 'Qualified' THEN 2
                    WHEN 'Proposal' THEN 3
                    WHEN 'Negotiation' THEN 4
                    WHEN 'Closed Won' THEN 5
                    WHEN 'Closed Lost' THEN 6
                END
        `);

        const overview = await queryOne(`
            SELECT
                COUNT(*) as total_deals,
                COUNT(CASE WHEN stage NOT IN ('Closed Won', 'Closed Lost') THEN 1 END) as active_deals,
                COUNT(CASE WHEN stage = 'Closed Won' THEN 1 END) as won_deals,
                COUNT(CASE WHEN stage = 'Closed Lost' THEN 1 END) as lost_deals,
                COALESCE(SUM(CASE WHEN stage NOT IN ('Closed Won', 'Closed Lost') THEN value END), 0) as pipeline_value,
                COALESCE(SUM(CASE WHEN stage = 'Closed Won' THEN value END), 0) as won_value
            FROM deals
        `);

        res.json({ pipeline, overview });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single deal
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const deal = await queryOne(
            `SELECT d.*, c.name as customer_name, c.phone as customer_phone
             FROM deals d
             LEFT JOIN customers c ON d.customer_id = c.id
             WHERE d.id = ?`,
            [req.params.id]
        );

        if (!deal) {
            return res.status(404).json({ error: 'Deal not found' });
        }
        res.json(deal);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create deal
router.post('/', async (req: Request, res: Response) => {
    try {
        const { title, customer_id, value, stage, probability, expected_close_date, description } = req.body;

        const validation = validateDealInput(req.body);
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
            `INSERT INTO deals (title, customer_id, value, stage, probability, expected_close_date, description)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title.trim(),
                customer_id || null,
                value || 0,
                stage || 'Lead',
                probability || 0,
                expected_close_date || null,
                description || null
            ]
        );

        const deal = await queryOne(
            `SELECT d.*, c.name as customer_name
             FROM deals d
             LEFT JOIN customers c ON d.customer_id = c.id
             WHERE d.id = ?`,
            [result.lastInsertRowid]
        );

        res.status(201).json(deal);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update deal
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { title, customer_id, value, stage, probability, expected_close_date, description } = req.body;

        const existing = await queryOne('SELECT * FROM deals WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        const validation = validateDealInput({ ...existing, ...req.body });
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Auto-set won/lost dates
        let wonDate = (existing as any).won_date;
        let lostDate = (existing as any).lost_date;
        if (stage === 'Closed Won' && (existing as any).stage !== 'Closed Won') {
            wonDate = new Date().toISOString();
        }
        if (stage === 'Closed Lost' && (existing as any).stage !== 'Closed Lost') {
            lostDate = new Date().toISOString();
        }

        const finalCustomerId = customer_id !== undefined ? (customer_id || null) : (existing as any).customer_id;
        const finalStage = stage || (existing as any).stage;
        const finalValue = value !== undefined ? Number(value) : Number((existing as any).value || 0);

        await execute(
            `UPDATE deals SET
                title = COALESCE(?, title),
                customer_id = ?,
                value = COALESCE(?, value),
                stage = COALESCE(?, stage),
                probability = COALESCE(?, probability),
                expected_close_date = ?,
                description = COALESCE(?, description),
                won_date = ?,
                lost_date = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                title,
                finalCustomerId,
                value,
                stage,
                probability,
                expected_close_date !== undefined ? (expected_close_date || null) : (existing as any).expected_close_date,
                description,
                wonDate,
                lostDate,
                req.params.id
            ]
        );

        // Sync customer total_spent when deal goes to/from Closed Won
        await syncCustomerOnStageChange(
            finalCustomerId,
            (existing as any).stage,
            finalStage,
            finalValue
        );

        const updated = await queryOne(
            `SELECT d.*, c.name as customer_name
             FROM deals d
             LEFT JOIN customers c ON d.customer_id = c.id
             WHERE d.id = ?`,
            [req.params.id]
        );

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update deal stage only (for drag-and-drop)
router.patch('/:id/stage', async (req: Request, res: Response) => {
    try {
        const { stage, lost_reason } = req.body;

        if (!stage || !STAGES.includes(stage)) {
            return res.status(400).json({ error: `Stage must be one of: ${STAGES.join(', ')}` });
        }

        const existing = await queryOne('SELECT * FROM deals WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        let wonDate = (existing as any).won_date;
        let lostDate = (existing as any).lost_date;
        if (stage === 'Closed Won' && (existing as any).stage !== 'Closed Won') {
            wonDate = new Date().toISOString();
        }
        if (stage === 'Closed Lost' && (existing as any).stage !== 'Closed Lost') {
            lostDate = new Date().toISOString();
        }

        await execute(
            `UPDATE deals SET stage = ?, won_date = ?, lost_date = ?, lost_reason = COALESCE(?, lost_reason), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [stage, wonDate, lostDate, lost_reason || null, req.params.id]
        );

        // Sync customer total_spent when deal stage changes
        await syncCustomerOnStageChange(
            (existing as any).customer_id,
            (existing as any).stage,
            stage,
            Number((existing as any).value || 0)
        );

        const updated = await queryOne(
            `SELECT d.*, c.name as customer_name
             FROM deals d
             LEFT JOIN customers c ON d.customer_id = c.id
             WHERE d.id = ?`,
            [req.params.id]
        );

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete deal
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const existing = await queryOne('SELECT * FROM deals WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Deal not found' });
        }

        await execute('DELETE FROM deals WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deal deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
