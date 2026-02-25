import { Router, Request, Response } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import ExcelJS from 'exceljs';
import { createReadStream } from 'fs';
import { execute, queryOne } from '../database/db';
import { parseImportData, mapFieldsToSchema } from '../utils/fileParser';

const router = Router();

function normalizeExcelCellValue(value: any): any {
    if (value === null || value === undefined) {
        return '';
    }

    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }

    if (typeof value === 'object') {
        if ('text' in value) {
            return (value as any).text;
        }
        if ('result' in value) {
            return (value as any).result;
        }
        return String(value);
    }

    return value;
}

async function parseXlsxFile(filePath: string): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
        return [];
    }

    const headerRowValues = (worksheet.getRow(1).values as any[]).slice(1);
    const headers = headerRowValues.map((header) => String(header ?? '').trim());

    const rows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            return;
        }

        const rowValues = (row.values as any[]).slice(1);
        const hasContent = rowValues.some((cell) => {
            const value = normalizeExcelCellValue(cell);
            return value !== '' && value !== null && value !== undefined;
        });

        if (!hasContent) {
            return;
        }

        const rowObject: Record<string, any> = {};
        headers.forEach((header, index) => {
            if (!header) {
                return;
            }
            rowObject[header] = normalizeExcelCellValue(rowValues[index]);
        });

        rows.push(rowObject);
    });

    return rows;
}

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

        const { importType = 'customers' } = req.body; // 'customers' only
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
        else if (fileExt === 'xlsx') {
            data = await parseXlsxFile(filePath);
        } else if (fileExt === 'xls') {
            return res.status(400).json({
                error: 'Legacy .xls format is not supported. Please re-save as .xlsx or .csv and upload again.'
            });
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

        const { importType = 'customers', fieldMapping } = req.body;
        
        if (!fieldMapping) {
            return res.status(400).json({ error: 'Field mapping is required' });
        }
        
        let mapping: Record<string, string>;
        try {
            mapping = JSON.parse(fieldMapping);
        } catch (parseError) {
            return res.status(400).json({ error: 'Invalid field mapping format' });
        }
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
        } else if (fileExt === 'xlsx') {
            data = await parseXlsxFile(filePath);
        } else if (fileExt === 'xls') {
            return res.status(400).json({
                error: 'Legacy .xls format is not supported. Please re-save as .xlsx or .csv and upload again.'
            });
        }

        // Import data
        let imported = 0;
        let skipped = 0;
        let errors: any[] = [];

        if (importType === 'customers') {
            data.forEach((row, index) => {
                try {
                    const mappedData: any = {};
                    Object.keys(mapping).forEach(key => {
                        const sourceField = mapping[key];
                        if (sourceField && row[sourceField]) {
                            mappedData[key] = row[sourceField];
                        }
                    });

                    // Validate required field
                    if (!mappedData.name || mappedData.name.trim() === '') {
                        throw new Error('Name is required');
                    }

                    // Check for duplicate phone number or email
                    let isDuplicate = false;
                    
                    if (mappedData.phone) {
                        const existingByPhone = queryOne('SELECT id FROM customers WHERE phone = ?', [mappedData.phone]);
                        if (existingByPhone) {
                            isDuplicate = true;
                        }
                    }
                    
                    if (!isDuplicate && mappedData.email) {
                        const existingByEmail = queryOne('SELECT id FROM customers WHERE email = ?', [mappedData.email]);
                        if (existingByEmail) {
                            isDuplicate = true;
                        }
                    }
                    
                    if (isDuplicate) {
                        skipped++;
                        return; // Skip this row
                    }

                    execute(
                        `INSERT INTO customers (
                name, phone, email, location, notes, status
              ) VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            mappedData.name.trim(),
                            mappedData.phone || null,
                            mappedData.email || null,
                            mappedData.location || null,
                            mappedData.notes || null,
                            'Active'
                        ]
                    );
                    imported++;
                } catch (err: any) {
                    errors.push({ row: index + 1, error: err.message });
                }
            });
        }

        res.json({
            message: 'Import completed',
            imported,
            skipped,
            total: data.length,
            errors: errors.length > 0 ? errors.slice(0, 10) : []
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
