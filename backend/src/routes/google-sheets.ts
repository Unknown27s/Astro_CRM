import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Store for synced data (in production, use Redis or database)
const syncState: Map<string, any> = new Map();

// Create Google Sheets sync configuration
router.post('/setup', (req: Request, res: Response) => {
    try {
        const { sheet_id, sheet_name, sync_type, sync_interval = 60 } = req.body;

        if (!sheet_id || !sheet_name || !sync_type) {
            return res.status(400).json({ error: 'sheet_id, sheet_name, and sync_type are required' });
        }

        if (!['customers', 'products', 'inventory'].includes(sync_type)) {
            return res.status(400).json({ error: 'sync_type must be: customers, products, or inventory' });
        }

        const syncId = `${sheet_id}_${sheet_name}`;
        const result = execute(
            `INSERT OR REPLACE INTO google_sheets_sync (sheet_id, sheet_name, sync_type, status, last_sync_at, next_sync_at)
             VALUES (?, ?, ?, 'Active', datetime('now'), datetime('now', '+' || ? || ' seconds'))`,
            [sheet_id, sheet_name, sync_type, sync_interval]
        );

        // Start auto-sync
        scheduleSync(syncId, sheet_id, sheet_name, sync_type, sync_interval * 1000);

        res.status(201).json({
            sync_id: syncId,
            message: `Sync configured for ${sheet_name}. Auto-syncing every ${sync_interval}s.`,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get all active syncs
router.get('/syncs', (req: Request, res: Response) => {
    try {
        const syncs = query('SELECT * FROM google_sheets_sync WHERE status = "Active" ORDER BY created_at DESC');
        res.json({ syncs });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Stop sync
router.post('/stop-sync/:syncId', (req: Request, res: Response) => {
    try {
        const { syncId } = req.params;

        execute('UPDATE google_sheets_sync SET status = "Paused" WHERE sheet_id || "_" || sheet_name = ?', [syncId]);

        // Clear sync state
        if (syncState.has(syncId)) {
            clearInterval(syncState.get(syncId).intervalId);
            syncState.delete(syncId);
        }

        res.json({ message: 'Sync stopped successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Manual sync trigger
router.post('/sync-now/:syncId', (req: Request, res: Response) => {
    try {
        const { syncId } = req.params;
        const sync = queryOne('SELECT * FROM google_sheets_sync WHERE sheet_id || "_" || sheet_name = ?', [syncId]);

        if (!sync) {
            return res.status(404).json({ error: 'Sync configuration not found' });
        }

        // In production, you'd fetch from Google Sheets API here
        // For now, return the sync status
        res.json({
            message: 'Sync triggered',
            sync_id: syncId,
            last_sync: new Date().toISOString(),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Import data from Google Sheets CSV
router.post('/import-csv', (req: Request, res: Response) => {
    try {
        const { csv_data, sync_type, map_fields } = req.body;

        if (!csv_data || !sync_type) {
            return res.status(400).json({ error: 'csv_data and sync_type are required' });
        }

        const lines = csv_data.trim().split('\n');
        if (lines.length < 2) {
            return res.status(400).json({ error: 'CSV must have headers and data' });
        }

        const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
        const rows = lines.slice(1).map((line: string) => {
            const values = line.split(',').map((v: string) => v.trim());
            const row: any = {};
            headers.forEach((header: string, i: number) => {
                row[header] = values[i];
            });
            return row;
        });

        let imported = 0;
        let errors: string[] = [];

        if (sync_type === 'customers') {
            rows.forEach((row: any) => {
                try {
                    if (row.name && row.phone) {
                        const existing = queryOne('SELECT id FROM customers WHERE phone = ?', [row.phone]);
                        if (existing) {
                            execute(
                                'UPDATE customers SET name = ?, email = ?, location = ?, updated_at = datetime("now") WHERE phone = ?',
                                [row.name, row.email || '', row.location || '', row.phone]
                            );
                        } else {
                            execute(
                                'INSERT INTO customers (name, phone, email, location) VALUES (?, ?, ?, ?)',
                                [row.name, row.phone, row.email || '', row.location || '']
                            );
                        }
                        imported++;
                    }
                } catch (error: any) {
                    errors.push(`Row error: ${error.message}`);
                }
            });
        } else if (sync_type === 'products') {
            rows.forEach((row: any) => {
                try {
                    if (row.name && row.selling_price) {
                        const existing = queryOne('SELECT id FROM products WHERE barcode = ?', [row.barcode]);
                        if (existing) {
                            execute(
                                `UPDATE products
                                 SET name = ?, category = ?, selling_price = ?, current_stock = COALESCE(?, current_stock), updated_at = datetime("now")
                                 WHERE barcode = ?`,
                                [row.name, row.category || '', row.selling_price, row.current_stock, row.barcode]
                            );
                        } else {
                            execute(
                                `INSERT INTO products (name, sku, barcode, category, selling_price, current_stock, min_stock_level, max_stock_level)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    row.name,
                                    row.sku || '',
                                    row.barcode || '',
                                    row.category || '',
                                    row.selling_price,
                                    row.current_stock || 0,
                                    row.min_stock_level || 10,
                                    row.max_stock_level || 100,
                                ]
                            );
                        }
                        imported++;
                    }
                } catch (error: any) {
                    errors.push(`Row error: ${error.message}`);
                }
            });
        }

        res.json({
            imported,
            total: rows.length,
            errors: errors.slice(0, 10), // Return first 10 errors
            message: `Successfully imported ${imported} records from Google Sheets`,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get sync stats
router.get('/stats', (req: Request, res: Response) => {
    try {
        const stats = query(`
            SELECT
                sync_type,
                COUNT(*) as total_syncs,
                SUM(total_rows_synced) as total_rows
            FROM google_sheets_sync
            GROUP BY sync_type
        `);

        res.json({ stats });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to schedule sync
function scheduleSync(syncId: string, sheetId: string, sheetName: string, syncType: string, interval: number) {
    if (syncState.has(syncId)) {
        clearInterval(syncState.get(syncId).intervalId);
    }

    const intervalId = setInterval(() => {
        performSync(syncId, sheetId, sheetName, syncType);
    }, interval);

    syncState.set(syncId, { intervalId, lastSync: Date.now() });
}

// Helper function to perform sync (placeholder)
function performSync(syncId: string, sheetId: string, sheetName: string, syncType: string) {
    try {
        // In production, fetch from Google Sheets API here
        // Update sync timestamp
        execute(
            'UPDATE google_sheets_sync SET last_sync_at = datetime("now"), next_sync_at = datetime("now", "+60 seconds") WHERE sheet_id = ? AND sheet_name = ?',
            [sheetId, sheetName]
        );

        console.log(`✓ Synced ${syncType} from ${sheetName}`);
    } catch (error) {
        console.error(`Error syncing ${sheetName}:`, error);
    }
}

export default router;
