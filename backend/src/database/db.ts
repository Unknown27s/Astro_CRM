import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const dbPath = join(__dirname, '../../data/crm.db');
let db: SqlJsDatabase;
let inTransaction = false;

// Initialize SQL.js
async function initDb() {
    const SQL = await initSqlJs();

    // Ensure data directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    // Load existing database or create new one
    if (existsSync(dbPath)) {
        const buffer = readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    return db;
}

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        writeFileSync(dbPath, buffer);
    }
}

// Initialize database with schema
export async function initializeDatabase() {
    await initDb();
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    // Run each statement individually so one failure doesn't block others
    const statements = schema.split(';').filter(s => s.trim());
    for (const stmt of statements) {
        try {
            db.run(stmt);
        } catch (e) {
            // Ignore errors from IF NOT EXISTS statements on existing tables
        }
    }
    saveDatabase();
    console.log('Database initialized successfully');
}

// Generic query helper
export function query<T = any>(sql: string, params: any[] = []): T[] {
    const results = db.exec(sql, params);
    if (results.length === 0) return [];

    const columns = results[0].columns;
    const values = results[0].values;

    return values.map((row: any[]) => {
        const obj: any = {};
        columns.forEach((col: string, idx: number) => {
            obj[col] = row[idx];
        });
        return obj as T;
    });
}

// Get single row
export function queryOne<T = any>(sql: string, params: any[] = []): T | undefined {
    const results = query<T>(sql, params);
    return results.length > 0 ? results[0] : undefined;
}

// Insert/Update/Delete
export function execute(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
    db.run(sql, params);

    // Only save to disk if we're not inside a transaction
    // (the transaction helper will save once at the end)
    if (!inTransaction) {
        saveDatabase();
    }

    // Get last insert ID
    const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
    const lastInsertRowid = lastIdResult.length > 0 ? Number(lastIdResult[0].values[0][0]) : 0;

    return {
        lastInsertRowid,
        changes: 1
    };
}

// Transaction helper (simplified for sql.js)
export function transaction<T>(callback: () => T): T {
    db.run('BEGIN TRANSACTION');
    inTransaction = true;
    try {
        const result = callback();
        db.run('COMMIT');
        saveDatabase();
        return result;
    } catch (error) {
        db.run('ROLLBACK');
        throw error;
    } finally {
        inTransaction = false;
    }
}

