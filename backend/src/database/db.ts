import { Pool, PoolClient, types } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Fix PostgreSQL returning NUMERIC/DECIMAL/BIGINT as strings
// Parse them as JavaScript numbers so frontend gets proper numbers
types.setTypeParser(20, parseFloat);   // INT8 (bigint)
types.setTypeParser(21, parseInt);     // INT2 (smallint)
types.setTypeParser(23, parseInt);     // INT4 (integer)
types.setTypeParser(700, parseFloat);  // FLOAT4
types.setTypeParser(701, parseFloat);  // FLOAT8
types.setTypeParser(1700, parseFloat); // NUMERIC/DECIMAL

const pool = new Pool({
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'astrocrm',
});

// Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(sql: string): string {
    let idx = 0;
    return sql.replace(/\?/g, () => `$${++idx}`);
}

// Initialize database with schema
export async function initializeDatabase() {
    const client = await pool.connect();
    try {
        // Run the PostgreSQL schema
        const schema = readFileSync(join(__dirname, 'schema-pg.sql'), 'utf-8');
        await client.query(schema);
        console.log('Database initialized successfully (PostgreSQL)');
    } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message?.includes('already exists')) {
            console.error('Schema initialization warning:', error.message);
        }
    } finally {
        client.release();
    }
}

// Generic query helper
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const pgSql = convertPlaceholders(sql);
    const result = await pool.query(pgSql, params);
    return result.rows as T[];
}

// Get single row
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const results = await query<T>(sql, params);
    return results.length > 0 ? results[0] : undefined;
}

// Insert/Update/Delete
export async function execute(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    const pgSql = convertPlaceholders(sql);

    // If it's an INSERT, add RETURNING id to get the last insert ID
    let finalSql = pgSql;
    const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
    if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
        finalSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
    }

    const result = await pool.query(finalSql, params);

    let lastInsertRowid = 0;
    if (isInsert && result.rows && result.rows.length > 0) {
        lastInsertRowid = result.rows[0].id || 0;
    }

    return {
        lastInsertRowid,
        changes: result.rowCount || 0
    };
}

// Transaction helper (async)
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Get the pool for direct access if needed
export function getPool(): Pool {
    return pool;
}

// Graceful shutdown
export async function closeDatabase() {
    await pool.end();
}

// Helper: safely parse JSONB fields (PostgreSQL returns objects, not strings)
export function parseJsonField(value: any, fallback: any = []): any {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch { return fallback; }
}
