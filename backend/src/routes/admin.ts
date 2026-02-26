import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

// Export database file for backup
router.get('/export/database', (req: Request, res: Response) => {
    try {
        const dbPath = join(__dirname, '../../data/crm.db');
        const dbBuffer = readFileSync(dbPath);
        
        const timestamp = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=crm-backup-${timestamp}.db`);
        res.send(dbBuffer);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to export database: ' + error.message });
    }
});

// Get database stats for admin overview
router.get('/stats', (req: Request, res: Response) => {
    try {
        const { query } = require('../database/db');
        
        const contactsCount = query('SELECT COUNT(*) as count FROM contacts')[0]?.count || 0;
        const dealsCount = query('SELECT COUNT(*) as count FROM deals')[0]?.count || 0;
        const salesCount = query('SELECT COUNT(*) as count FROM sales')[0]?.count || 0;
        const activitiesCount = query('SELECT COUNT(*) as count FROM activities')[0]?.count || 0;
        const usersCount = query('SELECT COUNT(*) as count FROM users')[0]?.count || 0;
        
        res.json({
            contacts: contactsCount,
            deals: dealsCount,
            sales: salesCount,
            activities: activitiesCount,
            users: usersCount,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
