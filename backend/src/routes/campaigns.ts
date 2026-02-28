import { Router, Request, Response } from 'express';
import { query, queryOne, execute, transaction } from '../database/db';

const router = Router();

// Get all campaigns
router.get('/', (req: Request, res: Response) => {
    try {
        const campaigns = query(
            'SELECT * FROM campaigns ORDER BY created_at DESC'
        );
        res.json({ campaigns });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single campaign with sends
router.get('/:id', (req: Request, res: Response) => {
    try {
        const campaign = queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
        
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const sends = query(
            `SELECT cs.*, c.name as customer_name
             FROM campaign_sends cs
             LEFT JOIN customers c ON cs.customer_id = c.id
             WHERE cs.campaign_id = ?
             ORDER BY cs.sent_at DESC`,
            [req.params.id]
        );

        res.json({ ...campaign, sends });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get campaign sends
router.get('/:id/sends', (req: Request, res: Response) => {
    try {
        const sends = query(
            `SELECT cs.*, c.name as customer_name
             FROM campaign_sends cs
             LEFT JOIN customers c ON cs.customer_id = c.id
             WHERE cs.campaign_id = ?
             ORDER BY cs.sent_at DESC`,
            [req.params.id]
        );

        res.json({ sends });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create campaign
router.post('/', (req: Request, res: Response) => {
    try {
        const { name, message, target_audience, audience_filter } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Campaign name is required' });
        }

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Campaign message is required' });
        }

        if (!target_audience) {
            return res.status(400).json({ error: 'Target audience is required' });
        }

        const filterJson = audience_filter ? JSON.stringify(audience_filter) : null;

        const result = execute(
            `INSERT INTO campaigns (name, message, target_audience, audience_filter, status)
             VALUES (?, ?, ?, ?, ?)`,
            [name, message, target_audience, filterJson, 'Draft']
        );

        const campaign = queryOne('SELECT * FROM campaigns WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Preview campaign audience
router.post('/:id/preview', (req: Request, res: Response) => {
    try {
        const campaign = queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
        
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const { target_audience, audience_filter } = campaign as any;
        const recipients = getAudienceCustomers(target_audience, audience_filter);

        res.json({ 
            count: recipients.length,
            recipients: recipients.slice(0, 10), // Preview first 10
            message_preview: replacePlaceholders((campaign as any).message, recipients[0] || {})
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Send campaign
router.post('/:id/send', (req: Request, res: Response) => {
    try {
        const campaign = queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
        
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if ((campaign as any).status === 'Sent') {
            return res.status(400).json({ error: 'Campaign already sent' });
        }

        const { target_audience, audience_filter, message } = campaign as any;
        const recipients = getAudienceCustomers(target_audience, audience_filter);

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'No recipients found for this audience' });
        }

        let sentCount = 0;
        transaction(() => {
            recipients.forEach((customer: any) => {
                if (customer.phone) {
                    const personalizedMessage = replacePlaceholders(message, customer);
                    
                    execute(
                        `INSERT INTO campaign_sends (campaign_id, customer_id, phone, message, status)
                         VALUES (?, ?, ?, ?, ?)`,
                        [req.params.id, customer.id, customer.phone, personalizedMessage, 'Sent']
                    );
                    sentCount++;
                }
            });

            // Update campaign status
            execute(
                `UPDATE campaigns SET status = ?, sent_count = ? WHERE id = ?`,
                ['Sent', sentCount, req.params.id]
            );
        });

        res.json({ 
            message: `Campaign sent to ${sentCount} customers`,
            sent_count: sentCount
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete campaign
router.delete('/:id', (req: Request, res: Response) => {
    try {
        const campaign = queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        transaction(() => {
            execute('DELETE FROM campaign_sends WHERE campaign_id = ?', [req.params.id]);
            execute('DELETE FROM campaigns WHERE id = ?', [req.params.id]);
        });

        res.json({ message: 'Campaign deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Helper: Get customers based on audience criteria
function getAudienceCustomers(targetAudience: string, audienceFilterJson: string | null): any[] {
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    const filter = audienceFilterJson ? JSON.parse(audienceFilterJson) : {};

    switch (targetAudience) {
        case 'inactive':
            // Customers with no purchase in X days (default 60)
            const daysInactive = filter.days_since_purchase || 60;
            sql += ` AND (last_purchase_date IS NULL OR julianday('now') - julianday(last_purchase_date) > ?)`;
            params.push(daysInactive);
            break;

        case 'vip':
            // VIP customers
            sql += ` AND status = 'VIP'`;
            break;

        case 'active':
            // Active customers only
            sql += ` AND status = 'Active'`;
            break;

        case 'low_spenders':
            // Customers who spent less than X
            const maxSpent = filter.max_spent || 5000;
            sql += ` AND total_spent < ?`;
            params.push(maxSpent);
            break;

        case 'high_spenders':
            // Customers who spent more than X
            const minSpent = filter.min_spent || 20000;
            sql += ` AND total_spent >= ?`;
            params.push(minSpent);
            break;

        case 'all':
            // All customers (no additional filter)
            break;

        case 'custom':
            // Custom filter - apply all provided filters
            if (filter.min_spent !== undefined) {
                sql += ` AND total_spent >= ?`;
                params.push(filter.min_spent);
            }
            if (filter.max_spent !== undefined) {
                sql += ` AND total_spent <= ?`;
                params.push(filter.max_spent);
            }
            if (filter.status) {
                sql += ` AND status = ?`;
                params.push(filter.status);
            }
            if (filter.location) {
                sql += ` AND location LIKE ?`;
                params.push(`%${filter.location}%`);
            }
            break;
    }

    // Only customers with phone numbers
    sql += ` AND phone IS NOT NULL AND phone != ''`;

    return query(sql, params);
}

// Helper: Replace placeholders in message
function replacePlaceholders(message: string, customer: any): string {
    return message
        .replace(/\{\{name\}\}/g, customer.name || 'Customer')
        .replace(/\{\{total_spent\}\}/g, customer.total_spent?.toFixed(2) || '0')
        .replace(/\{\{location\}\}/g, customer.location || '')
        .replace(/\{\{phone\}\}/g, customer.phone || '');
}

export default router;
