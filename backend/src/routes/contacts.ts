import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../database/db';

const router = Router();

// Get all contacts
router.get('/', (req: Request, res: Response) => {
    try {
        const { search, status, limit = '100', offset = '0' } = req.query;

        let sql = 'SELECT * FROM contacts WHERE 1=1';
        const params: any[] = [];

        if (search) {
            sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR company LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));

        const contacts = query(sql, params);
        const total = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM contacts WHERE 1=1');

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

        if (!first_name || !last_name) {
            return res.status(400).json({ error: 'First name and last name are required' });
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
