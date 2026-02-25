import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Input validation helper
function validateContactInput(data: any, isUpdate = false): { valid: boolean; error?: string } {
    const { first_name, last_name, email, phone, company, notes } = data;

    if (!first_name || first_name.length > 100) {
        return { valid: false, error: 'First name is required and must be under 100 characters' };
    }
    if (!last_name || last_name.length > 100) {
        return { valid: false, error: 'Last name is required and must be under 100 characters' };
    }
    if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return { valid: false, error: 'Invalid email format or too long (max 255 chars)' };
    }
    if (phone && phone.length > 30) {
        return { valid: false, error: 'Phone number too long (max 30 chars)' };
    }
    if (company && company.length > 200) {
        return { valid: false, error: 'Company name too long (max 200 chars)' };
    }
    if (notes && notes.length > 5000) {
        return { valid: false, error: 'Notes too long (max 5000 chars)' };
    }

    return { valid: true };
}

// Get all contacts
router.get('/', (req: Request, res: Response) => {
    try {
        const { search, status, limit = '100', offset = '0' } = req.query;

        // Cap limit at 500 for performance (small business scale)
        const safeLimitNum = Math.min(Number(limit) || 100, 500);
        const safeOffsetNum = Math.max(Number(offset) || 0, 0);

        let sql = 'SELECT * FROM contacts WHERE 1=1';
        const params: any[] = [];
        let countSql = 'SELECT COUNT(*) as count FROM contacts WHERE 1=1';
        const countParams: any[] = [];

        if (search) {
            sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)';
            countSql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (status) {
            sql += ' AND status = ?';
            countSql += ' AND status = ?';
            params.push(status);
            countParams.push(status);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(safeLimitNum, safeOffsetNum);

        const contacts = query(sql, params);
        const total = queryOne<{ count: number }>(countSql, countParams);

        res.json({ contacts, total: total?.count || 0 });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single contact
router.get('/:id', (req: Request, res: Response) => {
    try {
        const contact = queryOne('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
        if (!contact) {
            return res.status(404).json({ error: 'Contact not found' });
        }
        res.json(contact);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create contact
router.post('/', (req: Request, res: Response) => {
    try {
        const {
            first_name, last_name, email, phone, company, position,
            address, city, state, country, postal_code, source, status, tags, notes
        } = req.body;

        const validation = validateContactInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const result = execute(
            `INSERT INTO contacts (
        first_name, last_name, email, phone, company, position,
        address, city, state, country, postal_code, source, status, tags, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, phone, company, position,
                address, city, state, country, postal_code, source, status || 'Active',
                tags ? JSON.stringify(tags) : null, notes]
        );

        const contact = queryOne('SELECT * FROM contacts WHERE id = ?', [result.lastInsertRowid]);
        res.status(201).json(contact);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update contact
router.put('/:id', (req: Request, res: Response) => {
    try {
        const {
            first_name, last_name, email, phone, company, position,
            address, city, state, country, postal_code, source, status, tags, notes
        } = req.body;

        const validation = validateContactInput(req.body, true);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        execute(
            `UPDATE contacts SET
        first_name = ?, last_name = ?, email = ?, phone = ?, company = ?, position = ?,
        address = ?, city = ?, state = ?, country = ?, postal_code = ?,
        source = ?, status = ?, tags = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
            [first_name, last_name, email, phone, company, position,
                address, city, state, country, postal_code, source, status,
                tags ? JSON.stringify(tags) : null, notes, req.params.id]
        );

        const contact = queryOne('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
        res.json(contact);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete contact
router.delete('/:id', (req: Request, res: Response) => {
    try {
        execute('DELETE FROM contacts WHERE id = ?', [req.params.id]);
        res.json({ message: 'Contact deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
