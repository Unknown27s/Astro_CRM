import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query, queryOne, execute } from '../database/db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const VALID_ROLES = ['admin', 'manager', 'staff', 'viewer'];

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
        const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = hashPassword(password);

        // First user gets admin role, subsequent users get staff role
        const userCount = await queryOne<any>('SELECT COUNT(*) as count FROM users');
        const role = (userCount?.count || 0) === 0 ? 'admin' : 'staff';

        // Create user
        const result = await execute(
            'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [email, passwordHash, fullName, role]
        );

        const token = jwt.sign({ userId: result.lastInsertRowid, email, role }, JWT_SECRET, {
            expiresIn: '7d',
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: result.lastInsertRowid, email, fullName, role },
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

        const user = await queryOne<any>('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = hashPassword(password) === user.password_hash;
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const role = user.role || 'admin';

        const token = jwt.sign({ userId: user.id, email: user.email, role }, JWT_SECRET, {
            expiresIn: '7d',
        });

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, fullName: user.full_name, role },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user profile
router.get('/me', async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const token = authHeader.substring('Bearer '.length);
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        const user = await queryOne<any>('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?', [decoded.userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role || 'admin', createdAt: user.created_at } });
    } catch (error: any) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Get all users (admin only)
router.get('/users', async (req: Request, res: Response) => {
    try {
        const users = await query('SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ users });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update user role (admin only)
router.patch('/users/:id/role', async (req: Request, res: Response) => {
    try {
        const { role } = req.body;

        if (!role || !VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
        }

        const user = await queryOne('SELECT id FROM users WHERE id = ?', [req.params.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

        const updated = await queryOne<any>('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
