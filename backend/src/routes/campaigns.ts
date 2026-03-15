import { Router, Request, Response } from 'express';
import { query, queryOne, execute, transaction, parseJsonField } from '../database/db';

const router = Router();

// Get all campaigns
router.get('/', async (req: Request, res: Response) => {
    try {
        const campaigns = await query(
            'SELECT * FROM campaigns ORDER BY created_at DESC'
        );
        res.json({ campaigns });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single campaign with sends
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const sends = await query(
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
router.get('/:id/sends', async (req: Request, res: Response) => {
    try {
        const sends = await query(
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
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, message, email_subject, campaign_type = 'SMS', target_audience, audience_filter } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ error: 'Campaign name is required' });
        }

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Campaign message is required' });
        }

        if (campaign_type === 'Email' && !email_subject?.trim()) {
            return res.status(400).json({ error: 'Email subject is required for email campaigns' });
        }

        if (!target_audience) {
            return res.status(400).json({ error: 'Target audience is required' });
        }

        if (!['SMS', 'Email', 'Both'].includes(campaign_type)) {
            return res.status(400).json({ error: 'Campaign type must be SMS, Email, or Both' });
        }

        const filterJson = audience_filter ? JSON.stringify(audience_filter) : null;

        const result = await execute(
            `INSERT INTO campaigns (name, message, email_subject, campaign_type, target_audience, audience_filter, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, message, email_subject || null, campaign_type, target_audience, filterJson, 'Draft']
        );

        const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Preview campaign audience
router.post('/:id/preview', async (req: Request, res: Response) => {
    try {
        const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const { target_audience, audience_filter } = campaign as any;
        const recipients = await getAudienceCustomers(target_audience, audience_filter);

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
router.post('/:id/send', async (req: Request, res: Response) => {
    try {
        const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);

        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        if ((campaign as any).status === 'Sent') {
            return res.status(400).json({ error: 'Campaign already sent' });
        }

        const { target_audience, audience_filter, message, email_subject, campaign_type = 'SMS' } = campaign as any;
        const recipients = await getAudienceCustomers(target_audience, audience_filter);

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'No recipients found for this audience' });
        }

        let sentCount = 0;
        await transaction(async (client) => {
            for (const customer of recipients) {
                // Send SMS
                if ((campaign_type === 'SMS' || campaign_type === 'Both') && customer.phone) {
                    const personalizedMessage = replacePlaceholders(message, customer);

                    await execute(
                        `INSERT INTO campaign_sends (campaign_id, customer_id, phone, message, campaign_type, status)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [req.params.id, customer.id, customer.phone, personalizedMessage, 'SMS', 'Sent']
                    );
                    sentCount++;
                }

                // Send Email
                if ((campaign_type === 'Email' || campaign_type === 'Both') && customer.email) {
                    const personalizedMessage = replacePlaceholders(message, customer);

                    await execute(
                        `INSERT INTO campaign_sends (campaign_id, customer_id, email, message, campaign_type, status)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [req.params.id, customer.id, customer.email, personalizedMessage, 'Email', 'Sent']
                    );
                    sentCount++;
                }
            }

            // Update campaign status
            await execute(
                `UPDATE campaigns SET status = ?, sent_count = ? WHERE id = ?`,
                ['Sent', sentCount, req.params.id]
            );
        });

        res.json({
            message: `Campaign sent via ${campaign_type} to ${sentCount} recipients`,
            sent_count: sentCount,
            campaign_type
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete campaign
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const campaign = await queryOne('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        await transaction(async (client) => {
            await execute('DELETE FROM campaign_sends WHERE campaign_id = ?', [req.params.id]);
            await execute('DELETE FROM campaigns WHERE id = ?', [req.params.id]);
        });

        res.json({ message: 'Campaign deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Helper: Get customers based on audience criteria
async function getAudienceCustomers(targetAudience: string, audienceFilterJson: string | null): Promise<any[]> {
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    const filter = parseJsonField(audienceFilterJson, {});

    switch (targetAudience) {
        case 'inactive':
            // Customers with no purchase in X days (default 60)
            const daysInactive = filter.days_since_purchase || 60;
            sql += ` AND (last_purchase_date IS NULL OR EXTRACT(EPOCH FROM (NOW() - last_purchase_date)) / 86400 > ?)`;
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

    return await query(sql, params);
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
