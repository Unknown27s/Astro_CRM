import { Router, Request, Response } from 'express';
import { query } from '../database/db';

const router = Router();

// Export database as JSON dump for backup
router.get('/export/database', async (req: Request, res: Response) => {
    try {
        // Get all table names from PostgreSQL
        const tables = await query(`SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'`);

        const dump: Record<string, any[]> = {};
        for (const table of tables) {
            const tableName = (table as any).name;
            const rows = await query(`SELECT * FROM "${tableName}"`);
            dump[tableName] = rows;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=crm-backup-${timestamp}.json`);
        res.json(dump);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to export database: ' + error.message });
    }
});

// Get database stats for admin overview
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const customersCount = ((await query('SELECT COUNT(*) as count FROM customers'))[0] as any)?.count || 0;
        const purchasesCount = ((await query('SELECT COUNT(*) as count FROM purchases'))[0] as any)?.count || 0;
        const productsCount = ((await query('SELECT COUNT(*) as count FROM products'))[0] as any)?.count || 0;
        const campaignsCount = ((await query('SELECT COUNT(*) as count FROM campaigns'))[0] as any)?.count || 0;
        const usersCount = ((await query('SELECT COUNT(*) as count FROM users'))[0] as any)?.count || 0;

        res.json({
            customers: customersCount,
            purchases: purchasesCount,
            products: productsCount,
            campaigns: campaignsCount,
            users: usersCount,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
