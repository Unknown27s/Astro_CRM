import { Router, Request, Response } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import XLSX from 'xlsx';
import { createReadStream } from 'fs';
import { execute, transaction } from '../database/db';
import { parseImportData, mapFieldsToSchema } from '../utils/fileParser';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
        }
    }
});

// Upload and parse file
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { importType = 'contacts' } = req.body; // 'contacts' or 'sales'
        const filePath = req.file.path;
        const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();

        let data: any[] = [];

        // Parse CSV
        if (fileExt === 'csv') {
            data = await new Promise((resolve, reject) => {
                const results: any[] = [];
                createReadStream(filePath)
                    .pipe(csvParser())
                    .on('data', (row) => results.push(row))
                    .on('end', () => resolve(results))
                    .on('error', reject);
            });
        }
        // Parse Excel
        else if (fileExt === 'xlsx' || fileExt === 'xls') {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(worksheet);
        }

        // Return preview and field mapping suggestions
        const preview = data.slice(0, 10);
        const fields = data.length > 0 ? Object.keys(data[0]) : [];
        const suggestedMapping = mapFieldsToSchema(fields, importType);

        res.json({
            message: 'File parsed successfully',
            totalRows: data.length,
            preview,
            fields,
            suggestedMapping,
            fileId: req.file.filename // Store for later import
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Import data with field mapping
router.post('/execute', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { importType = 'contacts', fieldMapping } = req.body;
        const mapping = JSON.parse(fieldMapping);
        const filePath = req.file.path;
        const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();

        let data: any[] = [];

        // Parse file
        if (fileExt === 'csv') {
            data = await new Promise((resolve, reject) => {
                const results: any[] = [];
                createReadStream(filePath)
                    .pipe(csvParser())
                    .on('data', (row) => results.push(row))
                    .on('end', () => resolve(results))
                    .on('error', reject);
            });
        } else if (fileExt === 'xlsx' || fileExt === 'xls') {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(worksheet);
        }

        // Import data based on type
        let imported = 0;
        let errors: any[] = [];

        if (importType === 'contacts') {
            transaction(() => {
                data.forEach((row, index) => {
                    try {
                        const mappedData: any = {};
                        Object.keys(mapping).forEach(key => {
                            const sourceField = mapping[key];
                            if (sourceField && row[sourceField]) {
                                mappedData[key] = row[sourceField];
                            }
                        });

                        execute(
                            `INSERT INTO contacts (
                first_name, last_name, email, phone, company, position,
                address, city, state, country, postal_code, source, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                mappedData.first_name || '',
                                mappedData.last_name || '',
                                mappedData.email || null,
                                mappedData.phone || null,
                                mappedData.company || null,
                                mappedData.position || null,
                                mappedData.address || null,
                                mappedData.city || null,
                                mappedData.state || null,
                                mappedData.country || null,
                                mappedData.postal_code || null,
                                'Import',
                                'Active'
                            ]
                        );
                        imported++;
                    } catch (err: any) {
                        errors.push({ row: index + 1, error: err.message });
                    }
                });
            });
        } else if (importType === 'sales') {
            transaction(() => {
                data.forEach((row, index) => {
                    try {
                        const mappedData: any = {};
                        Object.keys(mapping).forEach(key => {
                            const sourceField = mapping[key];
                            if (sourceField && row[sourceField]) {
                                mappedData[key] = row[sourceField];
                            }
                        });

                        execute(
                            `INSERT INTO sales (
                product_name, quantity, unit_price, total_amount,
                sale_date, region, category
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [
                                mappedData.product_name || '',
                                mappedData.quantity || 1,
                                mappedData.unit_price || 0,
                                mappedData.total_amount || 0,
                                mappedData.sale_date || new Date().toISOString().split('T')[0],
                                mappedData.region || null,
                                mappedData.category || null
                            ]
                        );
                        imported++;
                    } catch (err: any) {
                        errors.push({ row: index + 1, error: err.message });
                    }
                });
            });
        }

        res.json({
            message: 'Import completed',
            imported,
            total: data.length,
            errors: errors.length > 0 ? errors.slice(0, 10) : []
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
