// Database Migration Script: v2.0.0 → v3.0.0
// Migrates from generic CRM to retail purchase tracking system
// Updated for PostgreSQL — schema-pg.sql creates all tables via initializeDatabase()

import { query, execute } from './db';

export async function migrateToV3() {
    console.log('Starting migration to v3.0.0 (PostgreSQL)...');

    try {
        // Step 0: Drop any old backup tables
        const allTables = await query(`SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'`);
        const allTableNames = allTables.map((t: any) => t.name);

        const backupTables = allTableNames.filter((name: string) => name.endsWith('_v2_backup'));
        if (backupTables.length > 0) {
            console.log('Removing old backup tables...');
            for (const tableName of backupTables) {
                await execute(`DROP TABLE IF EXISTS "${tableName}"`);
            }
        }

        // Step 1: Schema is now created by schema-pg.sql via initializeDatabase()
        // No need to load schema-v3.sql separately
        console.log('Schema already created by initializeDatabase(), skipping schema-v3.sql...');

        // Step 1.5: Fix customer_segments if it still has the old contact_id column
        const segmentCols = await query(
            `SELECT column_name as name FROM information_schema.columns WHERE table_name = 'customer_segments'`
        );
        const hasContactId = segmentCols.some((col: any) => col.name === 'contact_id');
        const hasCustomerId = segmentCols.some((col: any) => col.name === 'customer_id');

        if (hasContactId && !hasCustomerId) {
            console.log('Renaming contact_id to customer_id in customer_segments...');
            await execute(`ALTER TABLE customer_segments RENAME COLUMN contact_id TO customer_id`);
            console.log('customer_segments column fix complete');
        }

        // Step 2: Check if old tables exist
        const tables = await query(`SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'`);
        const tableNames = tables.map((t: any) => t.name);

        const hasOldSchema = tableNames.includes('contacts') || tableNames.includes('sales');

        if (hasOldSchema) {
            console.log('Migrating existing data...');

            // Step 3: Migrate contacts → customers
            if (tableNames.includes('contacts')) {
                const contacts = await query(`SELECT * FROM contacts`);
                console.log(`   Migrating ${contacts.length} contacts to customers...`);

                for (const contact of contacts) {
                    const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';
                    const location = [contact.city, contact.state, contact.country]
                        .filter(Boolean)
                        .join(', ') || null;

                    await execute(
                        `INSERT INTO customers (id, name, phone, email, location, notes, status, created_at, user_id)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                             ON CONFLICT (id) DO NOTHING`,
                        [
                            contact.id,
                            name,
                            contact.phone,
                            contact.email,
                            location,
                            contact.notes,
                            contact.status || 'Active',
                            contact.created_at,
                            contact.user_id
                        ]
                    );
                }

                // Reset the serial sequence after inserting explicit IDs
                await query(
                    `SELECT setval(pg_get_serial_sequence('customers', 'id'), COALESCE((SELECT MAX(id) FROM customers), 0))`
                );
            }

            // Step 4: Migrate sales → purchases
            if (tableNames.includes('sales')) {
                const sales = await query(`SELECT * FROM sales`);
                console.log(`   Migrating ${sales.length} sales to purchases...`);

                // Group sales by contact_id and sale_date to create single purchase records
                const purchaseMap = new Map<string, any[]>();

                for (const sale of sales) {
                    const key = `${sale.contact_id}_${sale.sale_date}`;
                    if (!purchaseMap.has(key)) {
                        purchaseMap.set(key, []);
                    }
                    purchaseMap.get(key)!.push(sale);
                }

                for (const [_key, salesGroup] of purchaseMap) {
                    const firstSale = salesGroup[0];

                    // Convert sales to items array
                    const items = salesGroup.map((sale: any) => ({
                        name: sale.product_name || 'Unknown Product',
                        qty: sale.quantity || 1,
                        price: sale.unit_price || 0
                    }));

                    const totalAmount = salesGroup.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);

                    await execute(
                        `INSERT INTO purchases (customer_id, items, total_amount, purchase_date, created_at)
                             VALUES (?, ?, ?, ?, ?)`,
                        [
                            firstSale.contact_id,
                            JSON.stringify(items),
                            totalAmount,
                            firstSale.sale_date,
                            firstSale.created_at
                        ]
                    );
                }
            }

            // Step 5: Calculate customer aggregates
            console.log('Calculating customer statistics...');
            const customers = await query(`SELECT id FROM customers`);

            for (const customer of customers) {
                const purchases = await query(
                    `SELECT * FROM purchases WHERE customer_id = ?`,
                    [customer.id]
                );

                if (purchases.length > 0) {
                    const totalSpent = purchases.reduce((sum: number, p: any) => sum + p.total_amount, 0);
                    const totalPurchases = purchases.length;
                    const purchaseDates = purchases
                        .map((p: any) => p.purchase_date)
                        .filter(Boolean)
                        .sort();

                    const firstPurchase = purchaseDates[0];
                    const lastPurchase = purchaseDates[purchaseDates.length - 1];

                    // Determine status
                    let status = 'Active';
                    if (lastPurchase) {
                        const daysSinceLastPurchase = Math.floor(
                            (Date.now() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24)
                        );
                        if (daysSinceLastPurchase > 90) {
                            status = 'Inactive';
                        }
                    }
                    if (totalSpent >= 50000) {
                        status = 'VIP';
                    }

                    await execute(
                        `UPDATE customers
                             SET total_spent = ?, total_purchases = ?,
                                 first_purchase_date = ?, last_purchase_date = ?, status = ?
                             WHERE id = ?`,
                        [totalSpent, totalPurchases, firstPurchase, lastPurchase, status, customer.id]
                    );
                }
            }

            // Step 6: Drop old tables
            console.log('Removing old tables...');
            if (tableNames.includes('contacts')) {
                await execute(`DROP TABLE IF EXISTS contacts`);
            }
            if (tableNames.includes('sales')) {
                await execute(`DROP TABLE IF EXISTS sales`);
            }
            if (tableNames.includes('deals')) {
                await execute(`DROP TABLE IF EXISTS deals`);
            }
            if (tableNames.includes('activities')) {
                await execute(`DROP TABLE IF EXISTS activities`);
            }
            if (tableNames.includes('reports')) {
                await execute(`DROP TABLE IF EXISTS reports`);
            }
        } else {
            console.log('Fresh installation - no data to migrate');
        }

        // Step 7: Add missing columns for online store compatibility
        // PostgreSQL supports ADD COLUMN IF NOT EXISTS (9.6+)
        console.log('Adding online store columns to products...');
        try {
            await execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS price REAL`);
            await execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS original_price REAL`);
            await execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT`);
            await execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_qty INTEGER DEFAULT 0`);
            await execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE`);
            await execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE`);
            await execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id INTEGER`);
            console.log('Online store columns added');
        } catch (error: any) {
            console.warn(`Warning adding columns: ${error.message}`);
        }

        // Step 8: Add customer_type to customers table
        console.log('Adding customer type tracking...');
        try {
            await execute(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'buyer'`);
            console.log('Customer type column added');
        } catch (error: any) {
            console.warn(`Warning adding columns: ${error.message}`);
        }

        console.log('Migration to v3.0.0 completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    import('./db').then(({ initializeDatabase }) => {
        initializeDatabase().then(() => {
            migrateToV3().then(() => {
                console.log('All done!');
                process.exit(0);
            });
        });
    });
}
