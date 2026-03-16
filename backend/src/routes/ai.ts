// src/routes/ai.ts — Unified AI Feature Routes

import { Router, Request, Response } from 'express';
import { query, parseJsonField } from '../database/db';
import {
  generateDashboardSummary,
  explainAnalytics,
  generateCampaignMessage,
  assessCustomerRisk,
  generateSalesForecast,
  generateReportSummary,
  generateSmartChatResponse,
  generateAutocomplete,
} from './aihelper';

const router = Router();

// ─── POST /api/ai/chat (DB-aware) ─────────────────────────────────────────────
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Valid messages array is required' });
    }
    const reply = await generateSmartChatResponse(messages);
    res.json({ reply });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Chat failed' });
  }
});

// ─── POST /api/ai/autocomplete ────────────────────────────────────────────────
router.post('/autocomplete', async (req: Request, res: Response) => {
  try {
    const { context, partialText, entityType } = req.body;
    if (!context) {
      return res.status(400).json({ error: 'Context is required' });
    }
    const suggestion = await generateAutocomplete({ context, partialText: partialText || '', entityType });
    res.json({ suggestion });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Autocomplete failed' });
  }
});

// ─── POST /api/ai/dashboard-summary ──────────────────────────────────────────
router.post('/dashboard-summary', async (req: Request, res: Response) => {
  try {
    // Pull live data from DB
    const customerStats: any = (await query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status='Active' THEN 1 END) as active,
        COUNT(CASE WHEN status='VIP' THEN 1 END) as vip,
        COUNT(CASE WHEN status='Inactive' THEN 1 END) as inactive,
        SUM(total_spent) as total_revenue
       FROM customers`
    ))[0];

    const recentRevenue: any = (await query(
      `SELECT COALESCE(SUM(total_amount),0) as revenue FROM purchases WHERE purchase_date >= CURRENT_DATE - INTERVAL '30 days'`
    ))[0];

    const previousRevenue: any = (await query(
      `SELECT COALESCE(SUM(total_amount),0) as revenue FROM purchases
       WHERE purchase_date >= CURRENT_DATE - INTERVAL '60 days' AND purchase_date < CURRENT_DATE - INTERVAL '30 days'`
    ))[0];

    const topItems: any[] = await query(
      `SELECT items FROM purchases WHERE purchase_date >= CURRENT_DATE - INTERVAL '30 days'`
    ) as any[];

    // Extract top product names
    const itemCounts: Record<string, number> = {};
    topItems.forEach((p: any) => {
      try {
        parseJsonField(p.items).forEach((item: any) => {
          const name = item.name || 'Unknown';
          itemCounts[name] = (itemCounts[name] || 0) + (item.qty || 1);
        });
      } catch { }
    });
    const topProducts = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const prev = Number(previousRevenue?.revenue || 0);
    const curr = Number(recentRevenue?.revenue || 0);
    const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;

    const summary = await generateDashboardSummary({
      totalCustomers: Number(customerStats?.total || 0),
      activeCustomers: Number(customerStats?.active || 0),
      vipCustomers: Number(customerStats?.vip || 0),
      inactiveCustomers: Number(customerStats?.inactive || 0),
      totalRevenue: Number(customerStats?.total_revenue || 0),
      recentRevenue: curr,
      growth,
      topProducts,
    });

    res.json({ summary, growth, recentRevenue: curr });
  } catch (error: any) {
    console.error('[AI Dashboard Summary]', error.message);
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

// ─── POST /api/ai/explain-analytics ──────────────────────────────────────────
router.post('/explain-analytics', async (req: Request, res: Response) => {
  try {
    const segmentRows: any[] = await query(
      `SELECT segment_name as name,
              COUNT(*) as count,
              AVG((features::jsonb->>'total_value')::float) as avgValue,
              AVG((features::jsonb->>'purchase_count')::float) as avgFrequency
       FROM customer_segments
       WHERE segment_name IS NOT NULL
       GROUP BY segment_name`
    ) as any[];

    if (!segmentRows.length) {
      return res.json({ explanation: 'No segments found yet. Run customer segmentation first from the Analytics page.' });
    }

    const explanation = await explainAnalytics({
      segments: segmentRows.map((s) => ({
        name: s.name,
        count: Number(s.count || 0),
        avgValue: Number(s.avgvalue || 0),
        avgFrequency: Number(s.avgfrequency || 0),
      })),
    });

    res.json({ explanation });
  } catch (error: any) {
    console.error('[AI Explain Analytics]', error.message);
    res.status(500).json({ error: error.message || 'Failed to explain analytics' });
  }
});

// ─── POST /api/ai/generate-campaign ──────────────────────────────────────────
router.post('/generate-campaign', async (req: Request, res: Response) => {
  try {
    const { audience, storeName, goal, tone } = req.body;

    if (!audience) {
      return res.status(400).json({ error: 'audience is required' });
    }

    const result = await generateCampaignMessage({ audience, storeName, goal, tone });
    res.json(result);
  } catch (error: any) {
    console.error('[AI Campaign Generator]', error.message);
    res.status(500).json({ error: error.message || 'Failed to generate campaign' });
  }
});

// ─── POST /api/ai/customer-risk ───────────────────────────────────────────────
router.post('/customer-risk', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const customerRows: any[] = await query(
      `SELECT c.name, c.total_spent, c.total_purchases, c.status,
              EXTRACT(EPOCH FROM (NOW() - c.last_purchase_date)) / 86400 as days_since,
              CASE WHEN c.total_purchases > 0 THEN c.total_spent / c.total_purchases ELSE 0 END as avg_order
       FROM customers c WHERE c.id = ?`,
      [customerId]
    ) as any[];

    if (!customerRows.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const c = customerRows[0];
    const risk = await assessCustomerRisk({
      name: c.name,
      totalSpent: Number(c.total_spent || 0),
      totalPurchases: Number(c.total_purchases || 0),
      daysSinceLastPurchase: Number(c.days_since || 999),
      status: c.status,
      avgOrderValue: Number(c.avg_order || 0),
    });

    res.json(risk);
  } catch (error: any) {
    console.error('[AI Customer Risk]', error.message);
    res.status(500).json({ error: error.message || 'Failed to assess risk' });
  }
});

// ─── POST /api/ai/sales-forecast ─────────────────────────────────────────────
router.post('/sales-forecast', async (req: Request, res: Response) => {
  try {
    const trends: any[] = await query(
      `SELECT purchase_date::date as date,
              SUM(total_amount) as revenue,
              COUNT(*) as purchase_count
       FROM purchases
       WHERE purchase_date >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY purchase_date::date
       ORDER BY date ASC`
    ) as any[];

    const totalLast30: any = (await query(
      `SELECT COALESCE(SUM(total_amount),0) as revenue FROM purchases WHERE purchase_date >= CURRENT_DATE - INTERVAL '30 days'`
    ))[0];

    const totalPrev30: any = (await query(
      `SELECT COALESCE(SUM(total_amount),0) as revenue FROM purchases
       WHERE purchase_date >= CURRENT_DATE - INTERVAL '60 days' AND purchase_date < CURRENT_DATE - INTERVAL '30 days'`
    ))[0];

    const curr = Number(totalLast30?.revenue || 0);
    const prev = Number(totalPrev30?.revenue || 0);
    const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    const days = trends.length || 1;

    const forecast = await generateSalesForecast({
      recentTrends: trends.map((t) => ({
        date: t.date,
        revenue: Number(t.revenue),
        purchase_count: Number(t.purchase_count),
      })),
      totalRevenueLast30: curr,
      avgDailyRevenue: curr / days,
      growthRate: growth,
    });

    res.json(forecast);
  } catch (error: any) {
    console.error('[AI Sales Forecast]', error.message);
    res.status(500).json({ error: error.message || 'Failed to generate forecast' });
  }
});

// ─── POST /api/ai/report-summary ─────────────────────────────────────────────
router.post('/report-summary', async (req: Request, res: Response) => {
  try {
    const { month, year } = req.body;

    const pad = (n: number) => String(n).padStart(2, '0');
    const period = month && year ? `${pad(month)}/${year}` : 'Last 30 Days';
    const dateFilter = month && year
      ? `purchase_date >= '${year}-${pad(month)}-01' AND purchase_date < '${year}-${pad(Number(month) + 1)}-01'`
      : `purchase_date >= CURRENT_DATE - INTERVAL '30 days'`;

    const stats: any = (await query(
      `SELECT COALESCE(SUM(total_amount),0) as revenue,
              COUNT(*) as orders,
              CASE WHEN COUNT(*)>0 THEN SUM(total_amount)/COUNT(*) ELSE 0 END as avg_order
       FROM purchases WHERE ${dateFilter}`
    ))[0];

    const newCustomers: any = (await query(
      `SELECT COUNT(*) as count FROM customers WHERE ${month && year
        ? `created_at >= '${year}-${pad(month)}-01' AND created_at < '${year}-${pad(Number(month) + 1)}-01'`
        : `created_at >= CURRENT_DATE - INTERVAL '30 days'`
      }`
    ))[0];

    const prevRevenue: any = (await query(
      `SELECT COALESCE(SUM(total_amount),0) as revenue FROM purchases
       WHERE purchase_date >= CURRENT_DATE - INTERVAL '60 days' AND purchase_date < CURRENT_DATE - INTERVAL '30 days'`
    ))[0];

    const curr = Number(stats?.revenue || 0);
    const prev = Number(prevRevenue?.revenue || 0);
    const growthRate = prev > 0 ? ((curr - prev) / prev) * 100 : 0;

    const summary = await generateReportSummary({
      period,
      totalRevenue: curr,
      totalOrders: Number(stats?.orders || 0),
      avgOrderValue: Number(stats?.avg_order || 0),
      newCustomers: Number(newCustomers?.count || 0),
      growthRate,
    });

    res.json({ summary, stats: { revenue: curr, orders: stats?.orders, avgOrder: stats?.avg_order, growthRate } });
  } catch (error: any) {
    console.error('[AI Report Summary]', error.message);
    res.status(500).json({ error: error.message || 'Failed to generate report summary' });
  }
});

export default router;
