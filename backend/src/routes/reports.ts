import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { query } from '../database/db';

const router = Router();

async function sendExcelFile(
    res: Response,
    sheets: Array<{ name: string; rows: Record<string, any>[] }>,
    fileName: string
) {
    const workbook = new ExcelJS.Workbook();

    sheets.forEach(({ name, rows }) => {
        const sheet = workbook.addWorksheet(name);
        if (rows.length === 0) {
            return;
        }

        const headers = Object.keys(rows[0]);
        sheet.columns = headers.map((header) => ({ header, key: header, width: 20 }));
        sheet.addRows(rows);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(Buffer.from(buffer));
}

// Generate sales report
router.post('/sales', async (req: Request, res: Response) => {
    try {
        const { format = 'pdf', start_date, end_date } = req.body;

        // Fetch purchase data
        let sql = `
      SELECT
        p.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.location as customer_location
      FROM purchases p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (start_date) {
            sql += ' AND p.purchase_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            sql += ' AND p.purchase_date <= ?';
            params.push(end_date);
        }

        sql += ' ORDER BY p.purchase_date DESC';

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
            doc.text(`Total Purchases: ${salesData.length}`);
            doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
            doc.text(`Average Purchase: ₹${avgSale.toFixed(2)}`);
            doc.moveDown();

            // Sales table
            doc.fontSize(14).text('Purchase Details', { underline: true });
            doc.moveDown(0.5);

            // Table headers
            doc.fontSize(10);
            const tableTop = doc.y;
            doc.text('Date', 50, tableTop);
            doc.text('Customer', 120, tableTop);
            doc.text('Payment', 280, tableTop);
            doc.text('Amount', 400, tableTop);
            doc.moveDown();

            // Table rows
            salesData.slice(0, 50).forEach((sale: any) => {
                const y = doc.y;
                doc.text(sale.purchase_date || 'N/A', 50, y);
                doc.text(sale.customer_name || 'N/A', 120, y, { width: 150 });
                doc.text(sale.payment_method || 'Cash', 280, y, { width: 100 });
                doc.text(`₹${(sale.total_amount || 0).toFixed(2)}`, 400, y);
                doc.moveDown(0.5);
            });

            // Properly end the PDF stream
            doc.on('error', (err: Error) => {
                console.error('PDF generation error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'PDF generation failed' });
                }
            });

            doc.end();
        } else if (format === 'excel') {
            const salesRows = salesData.map((s: any) => ({
                Date: s.purchase_date,
                Customer: s.customer_name || 'N/A',
                Phone: s.customer_phone || '',
                Location: s.customer_location || '',
                'Payment Method': s.payment_method || 'Cash',
                'Total Amount': s.total_amount,
                Notes: s.notes || ''
            }));

            const summaryData = [
                { Metric: 'Total Purchases', Value: salesData.length },
                { Metric: 'Total Revenue', Value: totalRevenue.toFixed(2) },
                { Metric: 'Average Purchase', Value: avgSale.toFixed(2) }
            ];

            await sendExcelFile(
                res,
                [
                    { name: 'Sales', rows: salesRows },
                    { name: 'Summary', rows: summaryData }
                ],
                'sales-report.xlsx'
            );
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
        COUNT(DISTINCT p.id) as total_purchases_count,
        COALESCE(SUM(p.total_amount), 0) as total_revenue
      FROM customers c
      LEFT JOIN customer_segments cs ON c.id = cs.customer_id
      LEFT JOIN purchases p ON c.id = p.customer_id
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
            const customerRows = customerData.map((c: any) => ({
                Name: c.name,
                Email: c.email || '',
                Phone: c.phone || '',
                Location: c.location || '',
                Status: c.status || 'Active',
                Segment: c.segment_name || 'N/A',
                'Total Purchases': c.total_purchases_count,
                'Total Revenue': c.total_revenue
            }));

            await sendExcelFile(res, [{ name: 'Customers', rows: customerRows }], 'customer-report.xlsx');
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
        COUNT(DISTINCT cs.customer_id) as customer_count,
        AVG(json_extract(cs.features, '$.total_value')) as avg_customer_value,
        AVG(json_extract(cs.features, '$.purchase_count')) as avg_purchase_frequency,
        AVG(json_extract(cs.features, '$.days_since_last_purchase')) as avg_recency
      FROM customer_segments cs
      GROUP BY cs.segment_id, cs.segment_name
      ORDER BY cs.segment_id
    `);

        if (format === 'excel') {
            const segmentRows = segmentData.map((s: any) => ({
                'Segment ID': s.segment_id,
                'Segment Name': s.segment_name,
                'Customer Count': s.customer_count,
                'Avg Customer Value': parseFloat(s.avg_customer_value || 0).toFixed(2),
                'Avg Purchase Frequency': parseFloat(s.avg_purchase_frequency || 0).toFixed(2),
                'Avg Days Since Purchase': parseFloat(s.avg_recency || 0).toFixed(0)
            }));

            await sendExcelFile(res, [{ name: 'Segments', rows: segmentRows }], 'segment-analysis.xlsx');
        } else {
            res.json({ data: segmentData });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Generate comprehensive monthly report data
router.post('/monthly', async (req: Request, res: Response) => {
    try {
        const { month, year } = req.body;
        const monthStr = String(month).padStart(2, '0');
        const yearStr = String(year);
        const monthPrefix = `${yearStr}-${monthStr}`;

        // Daily revenue for the month
        const dailyRevenue = query(
            `SELECT DATE(purchase_date) as date, COUNT(*) as purchase_count, SUM(total_amount) as revenue
             FROM purchases
             WHERE strftime('%Y-%m', purchase_date) = ?
             GROUP BY DATE(purchase_date)
             ORDER BY date ASC`,
            [monthPrefix]
        );

        // Monthly summary
        const summary = query(
            `SELECT COUNT(*) as total_purchases, SUM(total_amount) as total_revenue, AVG(total_amount) as avg_transaction
             FROM purchases
             WHERE strftime('%Y-%m', purchase_date) = ?`,
            [monthPrefix]
        )[0];

        // Previous month for comparison
        const prevDate = new Date(Number(yearStr), Number(monthStr) - 2, 1);
        const prevMonthStr = String(prevDate.getMonth() + 1).padStart(2, '0');
        const prevYearStr = String(prevDate.getFullYear());
        const prevMonthPrefix = `${prevYearStr}-${prevMonthStr}`;

        const prevSummary = query(
            `SELECT SUM(total_amount) as total_revenue FROM purchases WHERE strftime('%Y-%m', purchase_date) = ?`,
            [prevMonthPrefix]
        )[0];

        const currentRevenue = (summary as any)?.total_revenue || 0;
        const prevRevenue = (prevSummary as any)?.total_revenue || 0;
        const growth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

        // Customer stats
        const customerStats = query(
            `SELECT
                COUNT(*) as total_customers,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_customers,
                COUNT(CASE WHEN status = 'VIP' THEN 1 END) as vip_customers,
                COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_customers
             FROM customers`
        )[0];

        // New customers this month
        const newCustomers = query(
            `SELECT COUNT(*) as count FROM customers WHERE strftime('%Y-%m', created_at) = ?`,
            [monthPrefix]
        )[0];

        // Top customers this month
        const topCustomers = query(
            `SELECT c.name, c.phone, c.location, SUM(p.total_amount) as spent, COUNT(p.id) as purchases
             FROM purchases p
             LEFT JOIN customers c ON p.customer_id = c.id
             WHERE strftime('%Y-%m', p.purchase_date) = ?
             GROUP BY p.customer_id
             ORDER BY spent DESC
             LIMIT 10`,
            [monthPrefix]
        );

        // Purchase by day of week
        const byDayOfWeek = query(
            `SELECT
                CASE CAST(strftime('%w', purchase_date) AS INTEGER)
                    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
                    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
                END as day_name,
                COUNT(*) as purchase_count,
                SUM(total_amount) as revenue
             FROM purchases
             WHERE strftime('%Y-%m', purchase_date) = ?
             GROUP BY strftime('%w', purchase_date)
             ORDER BY CAST(strftime('%w', purchase_date) AS INTEGER)`,
            [monthPrefix]
        );

        // Payment methods
        const byPaymentMethod = query(
            `SELECT COALESCE(payment_method, 'Unknown') as payment_method, COUNT(*) as count, SUM(total_amount) as revenue
             FROM purchases
             WHERE strftime('%Y-%m', purchase_date) = ?
             GROUP BY payment_method
             ORDER BY count DESC`,
            [monthPrefix]
        );

        // Revenue by location
        const byLocation = query(
            `SELECT COALESCE(c.location, 'Unknown') as location, COUNT(p.id) as purchase_count, SUM(p.total_amount) as revenue
             FROM purchases p
             LEFT JOIN customers c ON p.customer_id = c.id
             WHERE strftime('%Y-%m', p.purchase_date) = ?
             GROUP BY c.location
             ORDER BY revenue DESC
             LIMIT 8`,
            [monthPrefix]
        );

        // Top items this month
        const purchasesForItems = query(
            `SELECT items FROM purchases WHERE strftime('%Y-%m', purchase_date) = ?`,
            [monthPrefix]
        );

        const itemCounts: Record<string, { count: number; revenue: number }> = {};
        (purchasesForItems as any[]).forEach((p) => {
            try {
                const items = JSON.parse(p.items || '[]');
                items.forEach((item: any) => {
                    const name = item.name || 'Unknown';
                    if (!itemCounts[name]) itemCounts[name] = { count: 0, revenue: 0 };
                    itemCounts[name].count += item.qty || 1;
                    itemCounts[name].revenue += (item.qty || 1) * (item.price || 0);
                });
            } catch (e) {}
        });

        const topItems = Object.entries(itemCounts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json({
            month: Number(month),
            year: Number(year),
            month_prefix: monthPrefix,
            summary: {
                ...(summary as any),
                growth_percentage: Number(growth.toFixed(2))
            },
            daily_revenue: dailyRevenue,
            customer_stats: customerStats,
            new_customers: (newCustomers as any)?.count || 0,
            top_customers: topCustomers,
            by_day_of_week: byDayOfWeek,
            by_payment_method: byPaymentMethod,
            by_location: byLocation,
            top_items: topItems
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
