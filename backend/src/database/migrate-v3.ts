// Database Migration Script: v2.0.0 → v3.0.0
// Migrates from generic CRM to retail purchase tracking system

import { readFileSync } from 'fs';
import { join } from 'path';
import { query, execute } from './db';

export async function migrateToV3() {
    console.log('🔄 Starting migration to v3.0.0...');

    try {
        // Step 0: Drop any old backup tables
        const allTables = query(`SELECT name FROM sqlite_master WHERE type='table'`);
        const allTableNames = allTables.map((t: any) => t.name);
        
        const backupTables = allTableNames.filter(name => name.endsWith('_v2_backup'));
        if (backupTables.length > 0) {
            console.log('🗑️  Removing old backup tables...');
            backupTables.forEach(tableName => {
                execute(`DROP TABLE IF EXISTS ${tableName}`);
            });
        }

        // Step 1: Create new tables
        console.log('📋 Creating new tables...');
        const schemaV3 = readFileSync(join(__dirname, 'schema-v3.sql'), 'utf-8');
        const statements = schemaV3.split(';').filter(s => s.trim());

        statements.forEach(stmt => {
            if (stmt.trim()) {
                execute(stmt);
            }
        });

        // Step 1.5: Fix customer_segments if it still has the old contact_id column
        const segmentCols = query(`PRAGMA table_info(customer_segments)`);
        const hasContactId = segmentCols.some((col: any) => col.name === 'contact_id');
        const hasCustomerId = segmentCols.some((col: any) => col.name === 'customer_id');

        if (hasContactId && !hasCustomerId) {
            console.log('🔧 Renaming contact_id → customer_id in customer_segments...');
            execute(`CREATE TABLE customer_segments_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER UNIQUE,
                segment_id INTEGER,
                segment_name TEXT,
                features TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )`);
            execute(`INSERT OR IGNORE INTO customer_segments_new (id, customer_id, segment_id, segment_name, features, created_at, updated_at)
                     SELECT id, contact_id, segment_id, segment_name, features, created_at, updated_at FROM customer_segments`);
            execute(`DROP TABLE customer_segments`);
            execute(`ALTER TABLE customer_segments_new RENAME TO customer_segments`);
            console.log('✅ customer_segments column fix complete');
        }

        // Step 2: Check if old tables exist
        const tables = query(`SELECT name FROM sqlite_master WHERE type='table'`);
        const tableNames = tables.map((t: any) => t.name);
        
        const hasOldSchema = tableNames.includes('contacts') || tableNames.includes('sales');

        if (hasOldSchema) {
            console.log('📦 Migrating existing data...');

            // Step 3: Migrate contacts → customers
            if (tableNames.includes('contacts')) {
                const contacts = query(`SELECT * FROM contacts`);
                console.log(`   → Migrating ${contacts.length} contacts to customers...`);

                    contacts.forEach((contact: any) => {
                        const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';
                        const location = [contact.city, contact.state, contact.country]
                            .filter(Boolean)
                            .join(', ') || null;

                        execute(
                            `INSERT INTO customers (id, name, phone, email, location, notes, status, created_at, user_id)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                    });
                }

                // Step 4: Migrate sales → purchases
                if (tableNames.includes('sales')) {
                    const sales = query(`SELECT * FROM sales`);
                    console.log(`   → Migrating ${sales.length} sales to purchases...`);

                    // Group sales by contact_id and sale_date to create single purchase records
                    const purchaseMap = new Map<string, any[]>();
                    
                    sales.forEach((sale: any) => {
                        const key = `${sale.contact_id}_${sale.sale_date}`;
                        if (!purchaseMap.has(key)) {
                            purchaseMap.set(key, []);
                        }
                        purchaseMap.get(key)!.push(sale);
                    });

                    purchaseMap.forEach((salesGroup, key) => {
                        const firstSale = salesGroup[0];
                        
                        // Convert sales to items array
                        const items = salesGroup.map(sale => ({
                            name: sale.product_name || 'Unknown Product',
                            qty: sale.quantity || 1,
                            price: sale.unit_price || 0
                        }));

                        const totalAmount = salesGroup.reduce((sum, s) => sum + (s.total_amount || 0), 0);

                        execute(
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
                    });
                }

                // Step 5: Calculate customer aggregates
                console.log('🧮 Calculating customer statistics...');
                const customers = query(`SELECT id FROM customers`);
                
                customers.forEach((customer: any) => {
                    const purchases = query(
                        `SELECT * FROM purchases WHERE customer_id = ?`,
                        [customer.id]
                    );

                    if (purchases.length > 0) {
                        const totalSpent = purchases.reduce((sum, p: any) => sum + p.total_amount, 0);
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

                        execute(
                            `UPDATE customers 
                             SET total_spent = ?, total_purchases = ?, 
                                 first_purchase_date = ?, last_purchase_date = ?, status = ?
                             WHERE id = ?`,
                            [totalSpent, totalPurchases, firstPurchase, lastPurchase, status, customer.id]
                        );
                    }
                });

                // Step 6: Drop old tables
                console.log('🗑️  Removing old tables...');
                if (tableNames.includes('contacts')) {
                    execute(`DROP TABLE IF EXISTS contacts`);
                }
                if (tableNames.includes('sales')) {
                    execute(`DROP TABLE IF EXISTS sales`);
                }
                if (tableNames.includes('deals')) {
                    execute(`DROP TABLE IF EXISTS deals`);
                }
                if (tableNames.includes('activities')) {
                    execute(`DROP TABLE IF EXISTS activities`);
                }
                if (tableNames.includes('reports')) {
                    execute(`DROP TABLE IF EXISTS reports`);
                }
            } else {
                console.log('✨ Fresh installation - no data to migrate');
            }

            console.log('✅ Migration to v3.0.0 completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if called directly
if (require.main === module) {
    import('./db').then(({ initializeDatabase }) => {
        initializeDatabase().then(() => {
            migrateToV3().then(() => {
                console.log('🎉 All done!');
                process.exit(0);
            });
        });
    });
}
