import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeDatabase } from './database/db';
import { migrateToV3 } from './database/migrate-v3';
import { migrateShop } from './database/migrate-shop';
import customersRouter from './routes/customers';
import purchasesRouter from './routes/purchases';
import campaignsRouter from './routes/campaigns';
import insightsRouter from './routes/insights';
import importRouter from './routes/import';
import analyticsRouter from './routes/analytics';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import reportsRouter from './routes/reports';
import productsRouter from './routes/products';
import shopRouter from './routes/shop';
import couponsRouter from './routes/coupons';

dotenv.config();

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const VERSION = packageJson.version;

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Basic auth middleware for protected API routes
app.use((req: Request, res: Response, next: NextFunction) => {
    const isPublicRoute =
        req.path.startsWith('/api/auth') ||
        req.path === '/api/health' ||
        req.path === '/api/shop/storefront' ||
        req.path === '/api/shop/order' ||
        req.path === '/api/shop/validate-coupon';
    if (isPublicRoute || req.method === 'OPTIONS') {
        return next();
    }

    if (!req.path.startsWith('/api')) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring('Bearer '.length);
    try {
        jwt.verify(token, JWT_SECRET);
        return next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// Routes - v3.0.0 Retail Edition
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/import', importRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/products', productsRouter);
app.use('/api/shop', shopRouter);
app.use('/api/coupons', couponsRouter);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', version: VERSION, timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
    try {
        await initializeDatabase();
        
        // Run v3.0.0 migration
        console.log('🔄 Running v3.0.0 migration...');
        await migrateToV3();
        await migrateShop();
        
        app.listen(PORT, () => {
            console.log(`🚀 CRM API Server v${VERSION} - Retail Edition`);
            console.log(`🛍️  Phase 3: Customer Purchase Tracking + SMS Campaigns`);
            console.log(`📡 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;
