import { Router, Request, Response } from 'express';
import { query, queryOne, execute, parseJsonField } from '../database/db';

const router = Router();

// Store for synced data (in production, use Redis or database)
const syncState: Map<string, any> = new Map();

// Create Google Sheets sync configuration
router.post('/setup', async (req: Request, res: Response) => {
    try {
        const { sheet_id, sheet_name, sync_type, sync_interval = 60 } = req.body;

        if (!sheet_id || !sheet_name || !sync_type) {
            return res.status(400).json({ error: 'sheet_id, sheet_name, and sync_type are required' });
        }

        if (!['customers', 'products', 'inventory'].includes(sync_type)) {
            return res.status(400).json({ error: 'sync_type must be: customers, products, or inventory' });
        }

        const syncId = `${sheet_id}_${sheet_name}`;
        await execute(
            `INSERT INTO google_sheets_sync (sheet_id, sheet_name, sync_type, status, last_sync_at, next_sync_at)
             VALUES (?, ?, ?, 'Active', NOW(), NOW() + (? || ' seconds')::interval)
             ON CONFLICT (sheet_id, sheet_name) DO UPDATE SET
               sync_type = EXCLUDED.sync_type,
               status = EXCLUDED.status,
               last_sync_at = EXCLUDED.last_sync_at,
               next_sync_at = EXCLUDED.next_sync_at`,
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
router.get('/syncs', async (req: Request, res: Response) => {
    try {
        const syncs = await query(`SELECT * FROM google_sheets_sync WHERE status = 'Active' ORDER BY created_at DESC`);
        res.json({ syncs });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Stop sync
router.post('/stop-sync/:syncId', async (req: Request, res: Response) => {
    try {
        const { syncId } = req.params;

        await execute(`UPDATE google_sheets_sync SET status = 'Paused' WHERE sheet_id || '_' || sheet_name = ?`, [syncId]);

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
router.post('/sync-now/:syncId', async (req: Request, res: Response) => {
    try {
        const { syncId } = req.params;
        const sync = await queryOne(`SELECT * FROM google_sheets_sync WHERE sheet_id || '_' || sheet_name = ?`, [syncId]);

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
router.post('/import-csv', async (req: Request, res: Response) => {
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
            for (const row of rows) {
                try {
                    if (row.name && row.phone) {
                        const existing = await queryOne('SELECT id FROM customers WHERE phone = ?', [row.phone]);
                        if (existing) {
                            await execute(
                                `UPDATE customers SET name = ?, email = ?, location = ?, updated_at = NOW() WHERE phone = ?`,
                                [row.name, row.email || '', row.location || '', row.phone]
                            );
                        } else {
                            await execute(
                                'INSERT INTO customers (name, phone, email, location) VALUES (?, ?, ?, ?)',
                                [row.name, row.phone, row.email || '', row.location || '']
                            );
                        }
                        imported++;
                    }
                } catch (error: any) {
                    errors.push(`Row error: ${error.message}`);
                }
            }
        } else if (sync_type === 'products') {
            for (const row of rows) {
                try {
                    if (row.name && row.selling_price) {
                        const existing = await queryOne('SELECT id FROM products WHERE barcode = ?', [row.barcode]);
                        if (existing) {
                            await execute(
                                `UPDATE products
                                 SET name = ?, category = ?, selling_price = ?, current_stock = COALESCE(?, current_stock), updated_at = NOW()
                                 WHERE barcode = ?`,
                                [row.name, row.category || '', row.selling_price, row.current_stock, row.barcode]
                            );
                        } else {
                            await execute(
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
            }
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

// Export purchases with customer spending details for Google Sheets
router.get('/export/purchases', async (req: Request, res: Response) => {
    try {
        const purchases = await query(`
            SELECT
                p.id,
                c.name as customer_name,
                c.phone as customer_phone,
                c.email as customer_email,
                p.items,
                p.total_amount,
                p.payment_method,
                p.purchase_date,
                c.total_spent,
                c.total_purchases as customer_total_purchases
            FROM purchases p
            JOIN customers c ON p.customer_id = c.id
            ORDER BY p.purchase_date DESC
            LIMIT 500
        `);

        // Format for Google Sheets
        const formatted = purchases.map((p: any) => {
            const items = parseJsonField(p.items);
            const itemList = items.map((i: any) => `${i.name} (${i.qty})`).join('; ');

            return {
                purchase_id: p.id,
                customer_name: p.customer_name,
                customer_phone: p.customer_phone,
                customer_email: p.customer_email,
                items_purchased: itemList,
                items_count: items.length,
                amount: p.total_amount,
                payment_method: p.payment_method || 'Cash',
                purchase_date: p.purchase_date,
                customer_total_spent: p.total_spent,
                customer_purchase_count: p.customer_total_purchases,
            };
        });

        res.json({
            purchases: formatted,
            total: formatted.length,
            exported_at: new Date().toISOString(),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Export customer spending breakdown for Google Sheets
router.get('/export/customer-spending', async (req: Request, res: Response) => {
    try {
        const customers = await query(`
            SELECT
                c.id,
                c.name,
                c.phone,
                c.email,
                c.location,
                c.total_spent,
                c.total_purchases,
                c.first_purchase_date,
                c.last_purchase_date,
                c.status
            FROM customers c
            WHERE c.total_purchases > 0
            ORDER BY c.total_spent DESC
            LIMIT 500
        `);

        // Get product breakdown per customer
        const formatted: any[] = [];
        for (const c of customers) {
            // Get top products bought by this customer
            const purchases = await query(`
                SELECT p.items FROM purchases p
                WHERE p.customer_id = ?
                ORDER BY p.purchase_date DESC
                LIMIT 10
            `, [c.id]);

            const productMap: any = {};
            purchases.forEach((p: any) => {
                const items = parseJsonField(p.items);
                items.forEach((item: any) => {
                    if (!productMap[item.name]) {
                        productMap[item.name] = { qty: 0, total: 0 };
                    }
                    productMap[item.name].qty += item.qty;
                    productMap[item.name].total += item.qty * item.price;
                });
            });

            const topProducts = Object.entries(productMap)
                .sort((a: any, b: any) => b[1].total - a[1].total)
                .slice(0, 3)
                .map(([name, data]: any) => `${name} (${data.qty}x, ₹${data.total})`)
                .join('; ');

            formatted.push({
                customer_name: c.name,
                customer_phone: c.phone,
                customer_email: c.email,
                customer_location: c.location,
                total_spent: c.total_spent,
                total_purchases: c.total_purchases,
                avg_purchase: (c.total_spent / c.total_purchases).toFixed(2),
                first_purchase: c.first_purchase_date,
                last_purchase: c.last_purchase_date,
                status: c.status,
                top_products: topProducts,
            });
        }

        res.json({
            customers: formatted,
            total: formatted.length,
            exported_at: new Date().toISOString(),
            total_customer_value: formatted.reduce((s, c: any) => s + c.total_spent, 0),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Sync purchases to Google Sheets (mark stock as used)
router.post('/sync-purchases', async (req: Request, res: Response) => {
    try {
        const purchases = await query(`
            SELECT p.id, p.items FROM purchases p
            WHERE p.created_at > NOW() - INTERVAL '1 hour'
            ORDER BY p.created_at DESC
        `);

        let stockUpdated = 0;
        for (const p of purchases) {
            const items = parseJsonField((p as any).items);
            for (const item of items) {
                // Find product by name and reduce stock
                const product = await queryOne('SELECT id FROM products WHERE name = ? LIMIT 1', [item.name]);
                if (product) {
                    await execute(
                        'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
                        [item.qty, (product as any).id]
                    );
                    stockUpdated++;
                }
            }
        }

        res.json({
            message: 'Purchase sync completed',
            purchases_processed: purchases.length,
            stock_items_updated: stockUpdated,
            synced_at: new Date().toISOString(),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get format template for customer spending Google Sheet
router.get('/format/customer-spending', (req: Request, res: Response) => {
    res.json({
        sheet_name: 'Customer Spending Report',
        columns: [
            { name: 'customer_name', description: 'Customer name', example: 'Rajesh Kumar' },
            { name: 'customer_phone', description: 'Customer phone', example: '9876543210' },
            { name: 'customer_email', description: 'Customer email', example: 'rajesh@example.com' },
            { name: 'customer_location', description: 'Customer city/location', example: 'Mumbai' },
            { name: 'total_spent', description: 'Total amount spent', example: '₹15,000' },
            { name: 'total_purchases', description: 'Number of purchases', example: '5' },
            { name: 'avg_purchase', description: 'Average purchase value', example: '₹3,000' },
            { name: 'first_purchase', description: 'First purchase date', example: '2025-01-15' },
            { name: 'last_purchase', description: 'Last purchase date', example: '2026-03-15' },
            { name: 'status', description: 'Customer status', example: 'Active/VIP/Inactive' },
            { name: 'top_products', description: 'Top 3 products purchased', example: 'Shirt (10x, ₹5999); Pants (5x, ₹3995)' },
        ],
        frequency: 'Real-time (auto-updates on purchase)',
        updates_on: 'New purchase, purchase edit/delete, customer status change',
    });
});

// Get format template for purchases Google Sheet
router.get('/format/purchases', (req: Request, res: Response) => {
    res.json({
        sheet_name: 'Purchase Transactions',
        columns: [
            { name: 'purchase_id', description: 'Unique purchase ID', example: '12345' },
            { name: 'customer_name', description: 'Customer name', example: 'Priya Singh' },
            { name: 'customer_phone', description: 'Customer phone', example: '9876543211' },
            { name: 'customer_email', description: 'Customer email', example: 'priya@example.com' },
            { name: 'items_purchased', description: 'Products and quantities', example: 'Shirt (2); Shoe (1)' },
            { name: 'items_count', description: 'Total item types', example: '2' },
            { name: 'amount', description: 'Total purchase amount', example: '₹3,697' },
            { name: 'payment_method', description: 'Payment type', example: 'Cash/Card/Online' },
            { name: 'purchase_date', description: 'Purchase date', example: '2026-03-15' },
            { name: 'customer_total_spent', description: 'Customer lifetime spending', example: '₹15,000' },
            { name: 'customer_purchase_count', description: 'Customer total purchases', example: '5' },
        ],
        frequency: 'Real-time (auto-updates on purchase)',
        updates_on: 'New purchase, purchase edit/delete',
    });
});

// Get sync stats
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const stats = await query(`
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
async function performSync(syncId: string, sheetId: string, sheetName: string, syncType: string) {
    try {
        // In production, fetch from Google Sheets API here
        // Update sync timestamp
        await execute(
            `UPDATE google_sheets_sync SET last_sync_at = NOW(), next_sync_at = NOW() + INTERVAL '60 seconds' WHERE sheet_id = ? AND sheet_name = ?`,
            [sheetId, sheetName]
        );

        console.log(`Synced ${syncType} from ${sheetName}`);
    } catch (error) {
        console.error(`Error syncing ${sheetName}:`, error);
    }
}

export default router;
