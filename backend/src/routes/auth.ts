import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query, queryOne, execute } from '../database/db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Simple hash function (for demo - use bcrypt in production)
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Register
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existing = queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = hashPassword(password);

        // Create user
        const result = execute(
            'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
            [email, passwordHash, fullName]
        );

        const token = jwt.sign({ userId: result.lastInsertRowid, email }, JWT_SECRET, {
            expiresIn: '7d',
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: result.lastInsertRowid, email, fullName },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = queryOne<any>('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = hashPassword(password) === user.password_hash;
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
            expiresIn: '7d',
        });

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, fullName: user.full_name },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
