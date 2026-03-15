import { execute, query } from './db';

export async function migrateShop() {
    // Check if products table already has the new inventory schema
    const tables = await query(`SELECT tablename as name FROM pg_tables WHERE schemaname = 'public'`);
    const tableNames = tables.map((t: any) => t.name);

    let hasProductsTable = tableNames.includes('products');

    if (hasProductsTable) {
        // Check if products table has barcode column (indicating new schema)
        const columns = await query(
            `SELECT column_name as name FROM information_schema.columns WHERE table_name = 'products'`
        );
        const hasBarcode = columns.some((col: any) => col.name === 'barcode');

        if (!hasBarcode) {
            // Old schema - migrate to new schema
            console.log('Upgrading products table schema...');
            await execute(`ALTER TABLE products RENAME TO products_old`);
            await execute(`CREATE TABLE products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                sku TEXT UNIQUE,
                barcode TEXT UNIQUE,
                category TEXT,
                description TEXT,
                cost_price REAL,
                selling_price REAL NOT NULL,
                current_stock INTEGER DEFAULT 0,
                min_stock_level INTEGER DEFAULT 10,
                max_stock_level INTEGER DEFAULT 100,
                supplier TEXT,
                last_restock_date TEXT,
                is_online_store_product BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                user_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`);
            // Migrate data from old schema
            await execute(`INSERT INTO products (
                id, name, description, selling_price, category, current_stock,
                is_online_store_product, created_at
            )
            SELECT id, name, description, price, category, stock_qty,
                   CASE WHEN in_stock = 1 THEN TRUE ELSE FALSE END, created_at
            FROM products_old`);

            // Reset the serial sequence after inserting explicit IDs
            await query(
                `SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 0))`
            );

            await execute(`DROP TABLE products_old`);
            console.log('Products table upgraded');
        }
    } else {
        // Create new products table with full inventory schema
        await execute(`CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            sku TEXT UNIQUE,
            barcode TEXT UNIQUE,
            category TEXT,
            description TEXT,
            cost_price REAL,
            selling_price REAL NOT NULL,
            current_stock INTEGER DEFAULT 0,
            min_stock_level INTEGER DEFAULT 10,
            max_stock_level INTEGER DEFAULT 100,
            supplier TEXT,
            last_restock_date TEXT,
            is_online_store_product BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            user_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
    }

    // Store settings (single row)
    // Check if store_settings has correct columns (may have old schema from schema-pg.sql)
    const storeSettingsCols = await query(
        `SELECT column_name as name FROM information_schema.columns WHERE table_name = 'store_settings'`
    );
    const storeColNames = storeSettingsCols.map((c: any) => c.name);

    if (storeColNames.includes('is_store_active') && !storeColNames.includes('is_active')) {
        // Old schema detected - drop and recreate with correct columns
        console.log('Fixing store_settings schema (old column names)...');
        await execute(`DROP TABLE store_settings`);
        await execute(`
            CREATE TABLE store_settings (
                id SERIAL PRIMARY KEY,
                store_name TEXT DEFAULT 'My Online Store',
                store_tagline TEXT DEFAULT 'Quality products at great prices',
                primary_color TEXT DEFAULT '#4F46E5',
                banner_text TEXT DEFAULT 'Welcome to our store!',
                contact_phone TEXT DEFAULT '',
                contact_email TEXT DEFAULT '',
                currency TEXT DEFAULT '₹',
                whatsapp_number TEXT DEFAULT '',
                is_active BOOLEAN DEFAULT TRUE,
                asi_api_key TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await execute(`INSERT INTO store_settings (store_name, store_tagline, primary_color, banner_text, currency)
                 VALUES ('My Online Store', 'Quality products at great prices', '#4F46E5', 'Welcome to our store!', '₹')`);
        console.log('store_settings schema fixed');
    } else if (!tableNames.includes('store_settings')) {
        await execute(`
            CREATE TABLE IF NOT EXISTS store_settings (
                id SERIAL PRIMARY KEY,
                store_name TEXT DEFAULT 'My Online Store',
                store_tagline TEXT DEFAULT 'Quality products at great prices',
                primary_color TEXT DEFAULT '#4F46E5',
                banner_text TEXT DEFAULT 'Welcome to our store!',
                contact_phone TEXT DEFAULT '',
                contact_email TEXT DEFAULT '',
                currency TEXT DEFAULT '₹',
                whatsapp_number TEXT DEFAULT '',
                is_active BOOLEAN DEFAULT TRUE,
                asi_api_key TEXT DEFAULT '',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } else {
        // Table exists with correct schema - just ensure all columns exist
        try {
            await execute(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_tagline TEXT DEFAULT ''`);
            await execute(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#4F46E5'`);
            await execute(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS banner_text TEXT DEFAULT ''`);
            await execute(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT ''`);
            await execute(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT ''`);
            await execute(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT ''`);
            await execute(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
            await execute(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS asi_api_key TEXT DEFAULT ''`);
        } catch (_) { /* columns already exist */ }
    }

    // Online orders table
    await execute(`
        CREATE TABLE IF NOT EXISTS online_orders (
            id SERIAL PRIMARY KEY,
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Coupons table
    await execute(`
        CREATE TABLE IF NOT EXISTS coupons (
            id SERIAL PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            discount_type TEXT NOT NULL DEFAULT 'percentage',
            discount_value REAL NOT NULL DEFAULT 0,
            min_order_amount REAL DEFAULT 0,
            max_discount REAL DEFAULT 0,
            max_uses INTEGER DEFAULT 0,
            used_count INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            expires_at TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Seed default store settings if none exist
    const existing = await query('SELECT id FROM store_settings LIMIT 1');
    if (existing.length === 0) {
        await execute(`INSERT INTO store_settings (store_name, store_tagline, primary_color, banner_text, currency)
                 VALUES ('My Online Store', 'Quality products at great prices', '#4F46E5', 'Welcome to our store!', '₹')`);
    }

    // Add coupon columns to online_orders if they don't exist yet (PostgreSQL supports IF NOT EXISTS)
    try {
        await execute(`ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS coupon_code TEXT DEFAULT ''`);
    } catch (_) { /* column already exists */ }
    try {
        await execute(`ALTER TABLE online_orders ADD COLUMN IF NOT EXISTS discount_amount REAL DEFAULT 0`);
    } catch (_) { /* column already exists */ }

    console.log('Shop migration complete');
}
