import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { query } from '../database/db';
import { generateInsights } from './aihelper';

const router = Router();

interface AiReportItem {
    section: string;
    title: string;
    details: string;
}

function cleanJsonMarkdown(text: string): string {
    if (!text) return text;
    if (text.includes('```')) {
        const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (match) {
            return match[1].trim();
        }
        return text.replace(/```(?:json)?\n/g, '').replace(/```/g, '').trim();
    }
    return text.trim();
}

function summarizeRows<T>(rows: T[], limit = 6): T[] {
    return rows.slice(0, limit);
}

async function generateMonthlyAiReport(payload: {
    month: number;
    year: number;
    summary: any;
    customerStats: any;
    newCustomers: number;
    topCustomers: any[];
    byDayOfWeek: any[];
    byPaymentMethod: any[];
    byLocation: any[];
    topItems: any[];
}): Promise<AiReportItem[] | null> {
    const compactPayload = {
        month: payload.month,
        year: payload.year,
        summary: {
            total_purchases: payload.summary?.total_purchases || 0,
            total_revenue: payload.summary?.total_revenue || 0,
            avg_transaction: payload.summary?.avg_transaction || 0,
            growth_percentage: payload.summary?.growth_percentage || 0
        },
        customer_stats: payload.customerStats,
        new_customers: payload.newCustomers,
        top_customers: summarizeRows(payload.topCustomers, 5),
        by_day_of_week: payload.byDayOfWeek,
        by_payment_method: payload.byPaymentMethod,
        by_location: summarizeRows(payload.byLocation, 5),
        top_items: summarizeRows(payload.topItems, 5)
    };

    const prompt = `
You are an expert retail analyst. Analyze the monthly CRM dataset and create an executive report.

DATA:
${JSON.stringify(compactPayload)}

Return ONLY a JSON array with exactly 5 objects.
Each object must have keys: "section", "title", "details".
Sections must be one of: "Executive Summary", "Sales Trend", "Customer Behavior", "Risk", "Action".
Keep details concise and practical (2-3 sentences each).
No markdown, no extra text.
`;

    const response = await generateInsights(prompt, 3);
    const cleaned = cleanJsonMarkdown(response);
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
        return null;
    }

    return parsed
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
            section: String(item.section || 'Executive Summary'),
            title: String(item.title || 'Insight'),
            details: String(item.details || '')
        }))
        .slice(0, 5);
}

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
        const { month, year, include_ai = true } = req.body;
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

        let ai_report: AiReportItem[] | null = null;
        let ai_report_error: string | null = null;
        if (include_ai) {
            try {
                ai_report = await generateMonthlyAiReport({
                    month: Number(month),
                    year: Number(year),
                    summary: {
                        ...(summary as any),
                        growth_percentage: Number(growth.toFixed(2))
                    },
                    customerStats,
                    newCustomers: (newCustomers as any)?.count || 0,
                    topCustomers: topCustomers as any[],
                    byDayOfWeek: byDayOfWeek as any[],
                    byPaymentMethod: byPaymentMethod as any[],
                    byLocation: byLocation as any[],
                    topItems
                });
            } catch (error: any) {
                ai_report_error = error?.message || 'AI monthly report generation failed';
                console.warn('AI monthly report generation skipped:', ai_report_error);
            }
        }

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
            top_items: topItems,
            ai_report,
            ai_report_error
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Download monthly business report (PDF/Excel) with AI insights
router.post('/monthly/download', async (req: Request, res: Response) => {
    try {
        const { month, year, format = 'pdf', include_ai = true } = req.body;
        const monthStr = String(month).padStart(2, '0');
        const yearStr = String(year);
        const monthPrefix = `${yearStr}-${monthStr}`;

        const dailyRevenue = query(
            `SELECT DATE(purchase_date) as date, COUNT(*) as purchase_count, SUM(total_amount) as revenue
             FROM purchases
             WHERE strftime('%Y-%m', purchase_date) = ?
             GROUP BY DATE(purchase_date)
             ORDER BY date ASC`,
            [monthPrefix]
        );

        const summary = query(
            `SELECT COUNT(*) as total_purchases, SUM(total_amount) as total_revenue, AVG(total_amount) as avg_transaction
             FROM purchases
             WHERE strftime('%Y-%m', purchase_date) = ?`,
            [monthPrefix]
        )[0];

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

        const customerStats = query(
            `SELECT
                COUNT(*) as total_customers,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_customers,
                COUNT(CASE WHEN status = 'VIP' THEN 1 END) as vip_customers,
                COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_customers
             FROM customers`
        )[0];

        const newCustomers = query(
            `SELECT COUNT(*) as count FROM customers WHERE strftime('%Y-%m', created_at) = ?`,
            [monthPrefix]
        )[0];

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

        const byPaymentMethod = query(
            `SELECT COALESCE(payment_method, 'Unknown') as payment_method, COUNT(*) as count, SUM(total_amount) as revenue
             FROM purchases
             WHERE strftime('%Y-%m', purchase_date) = ?
             GROUP BY payment_method
             ORDER BY count DESC`,
            [monthPrefix]
        );

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

        let ai_report: AiReportItem[] | null = null;
        if (include_ai) {
            try {
                ai_report = await generateMonthlyAiReport({
                    month: Number(month),
                    year: Number(year),
                    summary: {
                        ...(summary as any),
                        growth_percentage: Number(growth.toFixed(2))
                    },
                    customerStats,
                    newCustomers: (newCustomers as any)?.count || 0,
                    topCustomers: topCustomers as any[],
                    byDayOfWeek: [],
                    byPaymentMethod: byPaymentMethod as any[],
                    byLocation: byLocation as any[],
                    topItems
                });
            } catch (error: any) {
                console.warn('AI monthly report for download skipped:', error?.message || error);
            }
        }

        if (format === 'excel') {
            const summaryRows = [
                { Metric: 'Month', Value: `${monthStr}/${yearStr}` },
                { Metric: 'Total Purchases', Value: (summary as any)?.total_purchases || 0 },
                { Metric: 'Total Revenue', Value: (summary as any)?.total_revenue || 0 },
                { Metric: 'Average Transaction', Value: (summary as any)?.avg_transaction || 0 },
                { Metric: 'Growth %', Value: Number(growth.toFixed(2)) },
                { Metric: 'New Customers', Value: (newCustomers as any)?.count || 0 },
            ];

            const aiRows = (ai_report || []).map((item) => ({
                Section: item.section,
                Title: item.title,
                Details: item.details
            }));

            await sendExcelFile(
                res,
                [
                    { name: 'Summary', rows: summaryRows },
                    { name: 'Daily Revenue', rows: dailyRevenue as Record<string, any>[] },
                    { name: 'Top Customers', rows: topCustomers as Record<string, any>[] },
                    { name: 'Payment Methods', rows: byPaymentMethod as Record<string, any>[] },
                    { name: 'Locations', rows: byLocation as Record<string, any>[] },
                    { name: 'Top Items', rows: topItems as Record<string, any>[] },
                    { name: 'AI Report', rows: aiRows }
                ],
                `monthly-business-report-${yearStr}-${monthStr}.xlsx`
            );
            return;
        }

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=monthly-business-report-${yearStr}-${monthStr}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text('Monthly Business Report', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).text(`Period: ${monthStr}/${yearStr}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(14).text('Business Summary', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(11);
        doc.text(`Total Purchases: ${(summary as any)?.total_purchases || 0}`);
        doc.text(`Total Revenue: ₹${Number((summary as any)?.total_revenue || 0).toFixed(2)}`);
        doc.text(`Average Transaction: ₹${Number((summary as any)?.avg_transaction || 0).toFixed(2)}`);
        doc.text(`Growth vs Previous Month: ${Number(growth.toFixed(2))}%`);
        doc.text(`New Customers: ${(newCustomers as any)?.count || 0}`);
        doc.moveDown();

        doc.fontSize(14).text('Top Customers', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10);
        (topCustomers as any[]).slice(0, 5).forEach((customer, index) => {
            doc.text(`${index + 1}. ${customer.name || 'Unknown'} - ₹${Number(customer.spent || 0).toFixed(2)} (${customer.purchases || 0} purchases)`);
        });
        doc.moveDown();

        if (ai_report && ai_report.length > 0) {
            doc.fontSize(14).text('AI Executive Insights', { underline: true });
            doc.moveDown(0.3);
            ai_report.forEach((item) => {
                doc.fontSize(11).text(`${item.section}: ${item.title}`, { continued: false });
                doc.fontSize(10).text(item.details);
                doc.moveDown(0.3);
            });
        }

        doc.end();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
