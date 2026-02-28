import { execute, query } from './db';

export async function migrateShop() {
    // Products table
    execute(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            price REAL NOT NULL DEFAULT 0,
            original_price REAL,
            image_url TEXT DEFAULT '',
            category TEXT DEFAULT '',
            stock_qty INTEGER DEFAULT 0,
            in_stock INTEGER DEFAULT 1,
            is_visible INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Store settings (single row)
    execute(`
        CREATE TABLE IF NOT EXISTS store_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT DEFAULT 'My Online Store',
            store_tagline TEXT DEFAULT 'Quality products at great prices',
            primary_color TEXT DEFAULT '#4F46E5',
            banner_text TEXT DEFAULT 'Welcome to our store!',
            contact_phone TEXT DEFAULT '',
            contact_email TEXT DEFAULT '',
            currency TEXT DEFAULT '₹',
            whatsapp_number TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Online orders table
    execute(`
        CREATE TABLE IF NOT EXISTS online_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT NOT NULL UNIQUE,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT DEFAULT '',
            customer_address TEXT DEFAULT '',
            items TEXT NOT NULL DEFAULT '[]',
            total_amount REAL NOT NULL DEFAULT 0,
            status TEXT DEFAULT 'Pending',
            notes TEXT DEFAULT '',
            coupon_code TEXT DEFAULT '',
            discount_amount REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Coupons table
    execute(`
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            discount_type TEXT NOT NULL DEFAULT 'percentage',
            discount_value REAL NOT NULL DEFAULT 0,
            min_order_amount REAL DEFAULT 0,
            max_discount REAL DEFAULT 0,
            max_uses INTEGER DEFAULT 0,
            used_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            expires_at TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Seed default store settings if none exist
    const existing = query('SELECT id FROM store_settings LIMIT 1');
    if (existing.length === 0) {
        execute(`INSERT INTO store_settings (store_name, store_tagline, primary_color, banner_text, currency)
                 VALUES ('My Online Store', 'Quality products at great prices', '#4F46E5', 'Welcome to our store!', '₹')`);
    }

    // Add coupon columns to online_orders if they don't exist yet
    try {
        execute(`ALTER TABLE online_orders ADD COLUMN coupon_code TEXT DEFAULT ''`);
    } catch (_) { /* column already exists */ }
    try {
        execute(`ALTER TABLE online_orders ADD COLUMN discount_amount REAL DEFAULT 0`);
    } catch (_) { /* column already exists */ }

    console.log('Shop migration complete');
}
