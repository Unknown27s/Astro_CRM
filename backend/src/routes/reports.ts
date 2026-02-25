import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import XLSX from 'xlsx';
import { query } from '../database/db';

const router = Router();

// Generate sales report
router.post('/sales', async (req: Request, res: Response) => {
    try {
        const { format = 'pdf', start_date, end_date, region, category } = req.body;

        // Fetch sales data
        let sql = `
      SELECT 
        s.*,
        c.first_name,
        c.last_name,
        c.company
      FROM sales s
      LEFT JOIN contacts c ON s.contact_id = c.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (start_date) {
            sql += ' AND s.sale_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            sql += ' AND s.sale_date <= ?';
            params.push(end_date);
        }
        if (region) {
            sql += ' AND s.region = ?';
            params.push(region);
        }
        if (category) {
            sql += ' AND s.category = ?';
            params.push(category);
        }

        sql += ' ORDER BY s.sale_date DESC';

        const salesData = query(sql, params);

        // Calculate summary statistics
        const totalRevenue = salesData.reduce((sum, s: any) => sum + (s.total_amount || 0), 0);
        const avgSale = salesData.length > 0 ? totalRevenue / salesData.length : 0;

        if (format === 'pdf') {
            // Generate PDF report
            const doc = new PDFDocument({ margin: 50 });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

            doc.pipe(res);

            // Title
            doc.fontSize(20).text('Sales Report', { align: 'center' });
            doc.moveDown();

            // Date range
            doc.fontSize(12).text(`Period: ${start_date || 'All'} to ${end_date || 'All'}`, { align: 'center' });
            doc.moveDown();

            // Summary
            doc.fontSize(14).text('Summary', { underline: true });
            doc.fontSize(12);
            doc.text(`Total Sales: ${salesData.length}`);
            doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`);
            doc.text(`Average Sale: $${avgSale.toFixed(2)}`);
            doc.moveDown();

            // Sales table
            doc.fontSize(14).text('Sales Details', { underline: true });
            doc.moveDown(0.5);

            // Table headers
            doc.fontSize(10);
            const tableTop = doc.y;
            doc.text('Date', 50, tableTop);
            doc.text('Customer', 120, tableTop);
            doc.text('Product', 250, tableTop);
            doc.text('Amount', 400, tableTop);
            doc.moveDown();

            // Table rows
            salesData.slice(0, 50).forEach((sale: any, index: number) => {
                const y = doc.y;
                doc.text(sale.sale_date || 'N/A', 50, y);
                doc.text(sale.company || `${sale.first_name} ${sale.last_name}` || 'N/A', 120, y, { width: 120 });
                doc.text(sale.product_name || 'N/A', 250, y, { width: 140 });
                doc.text(`$${(sale.total_amount || 0).toFixed(2)}`, 400, y);
                doc.moveDown(0.5);
            });

            doc.end();
        } else if (format === 'excel') {
            // Generate Excel report
            const worksheet = XLSX.utils.json_to_sheet(
                salesData.map((s: any) => ({
                    Date: s.sale_date,
                    Customer: s.company || `${s.first_name} ${s.last_name}`,
                    Product: s.product_name,
                    Quantity: s.quantity,
                    'Unit Price': s.unit_price,
                    'Total Amount': s.total_amount,
                    Region: s.region,
                    Category: s.category
                }))
            );

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');

            // Add summary sheet
            const summaryData = [
                { Metric: 'Total Sales', Value: salesData.length },
                { Metric: 'Total Revenue', Value: totalRevenue.toFixed(2) },
                { Metric: 'Average Sale', Value: avgSale.toFixed(2) }
            ];
            const summarySheet = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
            res.send(buffer);
        } else {
            // Return JSON
            res.json({
                summary: {
                    totalSales: salesData.length,
                    totalRevenue,
                    avgSale
                },
                data: salesData
            });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Generate customer report
router.post('/customers', async (req: Request, res: Response) => {
    try {
        const { format = 'pdf', status, segment_id } = req.body;

        let sql = `
      SELECT 
        c.*,
        cs.segment_name,
        COUNT(DISTINCT s.id) as total_sales,
        COALESCE(SUM(s.total_amount), 0) as total_revenue
      FROM contacts c
      LEFT JOIN customer_segments cs ON c.id = cs.contact_id
      LEFT JOIN sales s ON c.id = s.contact_id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (status) {
            sql += ' AND c.status = ?';
            params.push(status);
        }
        if (segment_id !== undefined) {
            sql += ' AND cs.segment_id = ?';
            params.push(segment_id);
        }

        sql += ' GROUP BY c.id ORDER BY total_revenue DESC';

        const customerData = query(sql, params);

        if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(
                customerData.map((c: any) => ({
                    'First Name': c.first_name,
                    'Last Name': c.last_name,
                    Email: c.email,
                    Phone: c.phone,
                    Company: c.company,
                    Position: c.position,
                    Segment: c.segment_name || 'N/A',
                    'Total Sales': c.total_sales,
                    'Total Revenue': c.total_revenue
                }))
            );

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=customer-report.xlsx');
            res.send(buffer);
        } else {
            res.json({ data: customerData });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Generate segment analysis report
router.post('/segments', async (req: Request, res: Response) => {
    try {
        const { format = 'json' } = req.body;

        const segmentData = query(`
      SELECT 
        cs.segment_id,
        cs.segment_name,
        COUNT(DISTINCT cs.contact_id) as customer_count,
        AVG(json_extract(cs.features, '$.total_value')) as avg_customer_value,
        AVG(json_extract(cs.features, '$.purchase_count')) as avg_purchase_frequency,
        AVG(json_extract(cs.features, '$.days_since_last_purchase')) as avg_recency
      FROM customer_segments cs
      GROUP BY cs.segment_id, cs.segment_name
      ORDER BY cs.segment_id
    `);

        if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(
                segmentData.map((s: any) => ({
                    'Segment ID': s.segment_id,
                    'Segment Name': s.segment_name,
                    'Customer Count': s.customer_count,
                    'Avg Customer Value': parseFloat(s.avg_customer_value || 0).toFixed(2),
                    'Avg Purchase Frequency': parseFloat(s.avg_purchase_frequency || 0).toFixed(2),
                    'Avg Days Since Purchase': parseFloat(s.avg_recency || 0).toFixed(0)
                }))
            );

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Segments');

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=segment-analysis.xlsx');
            res.send(buffer);
        } else {
            res.json({ data: segmentData });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
