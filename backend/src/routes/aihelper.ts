// src/routes/aihelper.ts — ASI:One AI Service (OpenAI-compatible)

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { query, queryOne } from '../database/db';
dotenv.config();

const MODEL = 'asi1';

let asiClient: OpenAI | null = null;

async function resolveAsiApiKey(): Promise<string | undefined> {
  const envKey = process.env.ASI_ONE_API_KEY?.trim();
  if (envKey) return envKey;

  const settings = await queryOne<{ asi_api_key?: string }>('SELECT asi_api_key FROM store_settings LIMIT 1');
  const dbKey = settings?.asi_api_key?.trim();
  return dbKey;
}

export async function getAsiClient(): Promise<OpenAI> {
  const apiKey = await resolveAsiApiKey();

  if (!apiKey) {
    // Return a dummy client for now - will fail when actually used
    // This allows server to start without API key configured
    if (!asiClient) {
      asiClient = new OpenAI({
        apiKey: 'dummy-key',
        baseURL: 'https://api.asi1.ai/v1',
      });
    }
    return asiClient;
  }

  if (!asiClient) {
    asiClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.asi1.ai/v1',
    });
  }

  return asiClient;
}

// ─── Core: Generate any AI response ─────────────────────────────────────────

async function callAI(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  retries = 4
): Promise<string> {
  const apiKey = await resolveAsiApiKey();

  if (!apiKey) {
    console.warn('[AI] ASI:One API key not configured. AI features are disabled.');
    return 'AI features are not configured. Please set ASI_ONE_API_KEY in your .env file or configure it in Online Store settings.';
  }

  const client = await getAsiClient();

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[AI] Calling ASI:One with model: ${MODEL}`);
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      });

      return completion.choices[0]?.message?.content ?? 'No response generated.';
    } catch (error: any) {
      console.error(`[AI] Full error details:`, {
        status: error?.status,
        message: error?.message,
        error: error?.error,
        response: error?.response,
      });

      const isRateLimit =
        error?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('Too Many Requests');

      if (isRateLimit && i < retries - 1) {
        const delay = 3000 * 2 ** i;
        console.warn(`[AI] Rate limit. Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      console.error('[AI] Error:', error?.message || error);
      throw error;
    }
  }

  return 'No response generated.';
}

// ─── CRM Query Templates ─────────────────────────────────────────────────────

interface CrmQueryTemplate {
  keywords: string[];
  label: string;
  sql: string;
}

const CRM_QUERY_TEMPLATES: CrmQueryTemplate[] = [
  {
    keywords: ['top customer', 'best customer', 'highest spend', 'most spending'],
    label: 'Top Customers by Spending',
    sql: `SELECT name, phone, total_spent, total_purchases, status FROM customers ORDER BY total_spent DESC LIMIT 10`,
  },
  {
    keywords: ['total revenue', 'total sale', 'how much revenue', 'total earning'],
    label: 'Total Revenue',
    sql: `SELECT COALESCE(SUM(total_spent),0) as total_revenue, COUNT(*) as total_customers FROM customers`,
  },
  {
    keywords: ['open deal', 'active deal', 'pipeline', 'deal in progress'],
    label: 'Open Deals in Pipeline',
    sql: `SELECT d.title, d.value, d.stage, c.name as customer_name FROM deals d LEFT JOIN customers c ON d.customer_id = c.id WHERE d.stage NOT IN ('Closed Won','Closed Lost') ORDER BY d.value DESC LIMIT 15`,
  },
  {
    keywords: ['won deal', 'closed won', 'deal won'],
    label: 'Won Deals',
    sql: `SELECT d.title, d.value, c.name as customer_name, d.won_date FROM deals d LEFT JOIN customers c ON d.customer_id = c.id WHERE d.stage = 'Closed Won' ORDER BY d.won_date DESC LIMIT 10`,
  },
  {
    keywords: ['lost deal', 'closed lost', 'deal lost'],
    label: 'Lost Deals',
    sql: `SELECT d.title, d.value, c.name as customer_name, d.lost_reason FROM deals d LEFT JOIN customers c ON d.customer_id = c.id WHERE d.stage = 'Closed Lost' ORDER BY d.lost_date DESC LIMIT 10`,
  },
  {
    keywords: ['how many customer', 'total customer', 'customer count'],
    label: 'Customer Statistics',
    sql: `SELECT COUNT(*) as total, COUNT(CASE WHEN status='Active' THEN 1 END) as active, COUNT(CASE WHEN status='VIP' THEN 1 END) as vip, COUNT(CASE WHEN status='Inactive' THEN 1 END) as inactive FROM customers`,
  },
  {
    keywords: ['recent purchase', 'latest purchase', 'last purchase'],
    label: 'Recent Purchases',
    sql: `SELECT p.total_amount, p.purchase_date, p.payment_method, c.name as customer_name FROM purchases p LEFT JOIN customers c ON p.customer_id = c.id ORDER BY p.purchase_date DESC LIMIT 10`,
  },
  {
    keywords: ['revenue this month', 'this month sale', 'monthly revenue', 'current month'],
    label: 'This Month Revenue',
    sql: `SELECT COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as orders FROM purchases WHERE EXTRACT(MONTH FROM purchase_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM purchase_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
  },
  {
    keywords: ['inactive customer', 'dormant customer', 'not buying'],
    label: 'Inactive Customers',
    sql: `SELECT name, phone, total_spent, last_purchase_date FROM customers WHERE status = 'Inactive' ORDER BY total_spent DESC LIMIT 10`,
  },
  {
    keywords: ['vip customer', 'premium customer', 'high value'],
    label: 'VIP Customers',
    sql: `SELECT name, phone, total_spent, total_purchases FROM customers WHERE status = 'VIP' ORDER BY total_spent DESC LIMIT 10`,
  },
  {
    keywords: ['overdue task', 'overdue activit', 'pending task', 'missed follow'],
    label: 'Overdue Activities',
    sql: `SELECT a.subject, a.type, a.priority, a.due_date, c.name as customer_name FROM activities a LEFT JOIN customers c ON a.customer_id = c.id WHERE a.completed = false AND a.due_date < CURRENT_TIMESTAMP ORDER BY a.due_date ASC LIMIT 10`,
  },
  {
    keywords: ['upcoming task', 'upcoming activit', 'today task', 'due soon'],
    label: 'Upcoming Activities',
    sql: `SELECT a.subject, a.type, a.priority, a.due_date, c.name as customer_name FROM activities a LEFT JOIN customers c ON a.customer_id = c.id WHERE a.completed = false AND a.due_date >= CURRENT_TIMESTAMP AND a.due_date <= CURRENT_TIMESTAMP + INTERVAL '7 days' ORDER BY a.due_date ASC LIMIT 10`,
  },
  {
    keywords: ['deal summary', 'pipeline summary', 'deal stat', 'deal overview'],
    label: 'Deals Summary',
    sql: `SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as total_value FROM deals GROUP BY stage ORDER BY total_value DESC`,
  },
  {
    keywords: ['top product', 'best selling', 'popular product', 'most sold'],
    label: 'Top Products',
    sql: `SELECT name, price, stock_qty, COALESCE(total_sold,0) as total_sold FROM products WHERE is_visible = true ORDER BY total_sold DESC LIMIT 10`,
  },
  {
    keywords: ['campaign', 'marketing', 'sms campaign', 'email campaign'],
    label: 'Campaigns Overview',
    sql: `SELECT name, campaign_type, status, sent_count, target_audience, created_at FROM campaigns ORDER BY created_at DESC LIMIT 10`,
  },
];

async function detectAndRunCrmQuery(userMessage: string): Promise<{ label: string; data: any[] } | null> {
  const msg = userMessage.toLowerCase();
  for (const tpl of CRM_QUERY_TEMPLATES) {
    if (tpl.keywords.some(kw => msg.includes(kw))) {
      try {
        const data = await query(tpl.sql);
        return { label: tpl.label, data: data as any[] };
      } catch (err: any) {
        console.error(`[AI Query] Error running template '${tpl.label}':`, err.message);
        return null;
      }
    }
  }
  return null;
}

// ─── Chat: General CRM assistant (DB-aware) ─────────────────────────────────

export async function generateChatResponse(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<string> {
  const system = {
    role: 'system' as const,
    content:
      'You are Astro AI, the intelligent assistant for an eCommerce CRM platform. ' +
      'You help business owners understand their customers, sales trends, campaigns, and analytics. ' +
      'Give actionable, concise, helpful answers. Use numbers and specifics when available. ' +
      'When discussing data, give recommendations the owner can act on today.',
  };

  return callAI([system, ...messages]);
}

export async function generateSmartChatResponse(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<string> {
  // Get the last user message
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  let dbContext = '';

  if (lastUserMsg) {
    const result = await detectAndRunCrmQuery(lastUserMsg.content);
    if (result && result.data.length > 0) {
      dbContext = `\n\n[LIVE CRM DATA — ${result.label}]\n${JSON.stringify(result.data, null, 2)}\n[END DATA]\n\nUse this real data to answer the user's question accurately. Cite specific numbers and names from the data. Format currency as ₹.`;
    }
  }

  const system = {
    role: 'system' as const,
    content:
      'You are Astro AI, the intelligent assistant for AstroCRM — a retail/eCommerce CRM platform. ' +
      'You have direct access to the business database and can provide real, live data. ' +
      'Give actionable, concise, and data-driven answers. Use exact numbers from the data. ' +
      'Format responses with markdown bold for key values. Be friendly and professional.' +
      dbContext,
  };

  return callAI([system, ...messages]);
}

// ─── AI Autocomplete for descriptions ────────────────────────────────────────

export async function generateAutocomplete(data: {
  context: string;
  partialText: string;
  entityType?: string;
}): Promise<string> {
  const prompt = `You are an AI writing assistant for a CRM application. Complete or improve the following text based on its context.

Context: ${data.context}
Entity type: ${data.entityType || 'general'}
Partial text: "${data.partialText}"

Rules:
- If the text is empty, write a professional 1-2 sentence suggestion
- If the text has content, complete or expand it naturally
- Keep it concise and professional
- Use business/CRM appropriate language
- Return ONLY the completed text, nothing else
- Do NOT add quotes around the response`;

  return callAI([{ role: 'user', content: prompt }]);
}

// ─── Dashboard Summary ────────────────────────────────────────────────────────

export async function generateDashboardSummary(data: {
  totalCustomers: number;
  activeCustomers: number;
  vipCustomers: number;
  inactiveCustomers: number;
  totalRevenue: number;
  recentRevenue: number;
  growth: number;
  topProducts?: string[];
}): Promise<string> {
  const prompt = `You are an expert retail business analyst. Based on this CRM data, write a sharp 3–4 sentence executive summary for today's dashboard. Highlight what's going well, what needs attention, and one actionable recommendation.

Data:
- Total Customers: ${data.totalCustomers}
- Active: ${data.activeCustomers} | VIP: ${data.vipCustomers} | Inactive: ${data.inactiveCustomers}
- Total Revenue: ₹${data.totalRevenue.toLocaleString()}
- Revenue (last 30 days): ₹${data.recentRevenue.toLocaleString()}
- Growth vs previous period: ${data.growth.toFixed(1)}%
${data.topProducts?.length ? `- Top Products: ${data.topProducts.join(', ')}` : ''}

Write in a professional but friendly tone. Be concise and actionable. Start directly with the insight.`;

  return callAI([{ role: 'user', content: prompt }]);
}

// ─── Analytics Explanation ────────────────────────────────────────────────────

export async function explainAnalytics(data: {
  segments: Array<{ name: string; count: number; avgValue: number; avgFrequency: number }>;
}): Promise<string> {
  const segmentText = data.segments
    .map(
      (s) =>
        `- ${s.name}: ${s.count} customers, avg spend ₹${s.avgValue.toFixed(0)}, avg ${s.avgFrequency.toFixed(1)} purchases`
    )
    .join('\n');

  const prompt = `You are a data analyst explaining customer segmentation results to a retail store owner. Based on the K-means clustering below, explain in plain English what each segment means, who those customers are, and give one concrete marketing recommendation per segment. Keep the total response under 300 words.

Segments:\n${segmentText}

Format your response with each segment as a header followed by 2–3 sentences.`;

  return callAI([{ role: 'user', content: prompt }]);
}

// ─── Campaign Message Generator ───────────────────────────────────────────────

export async function generateCampaignMessage(data: {
  audience: string;
  storeName?: string;
  goal?: string;
  tone?: string;
}): Promise<{ message: string; subject: string }> {
  const prompt = `You are an expert SMS marketing copywriter for retail stores. Write a short, compelling SMS campaign message.

Store: ${data.storeName || 'Our Store'}
Target Audience: ${data.audience}
Campaign Goal: ${data.goal || 'Re-engage customers and drive sales'}
Tone: ${data.tone || 'friendly and urgent'}

Rules:
- Keep it under 160 characters if possible (SMS limit)
- Use {{name}} as placeholder for customer's first name
- Include a clear call to action
- Return JSON in this exact format: {"message": "...", "subject": "Campaign name"}

Only return the JSON, nothing else.`;

  const raw = await callAI([{ role: 'user', content: prompt }]);
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { message: raw.slice(0, 160), subject: 'AI Campaign' };
  }
}

// ─── Customer Risk Assessment ─────────────────────────────────────────────────

export async function assessCustomerRisk(customer: {
  name: string;
  totalSpent: number;
  totalPurchases: number;
  daysSinceLastPurchase: number;
  status: string;
  avgOrderValue: number;
}): Promise<{ riskLevel: 'low' | 'medium' | 'high'; reason: string; action: string }> {
  const prompt = `Assess churn risk for this retail customer and give a recommended action. Return ONLY JSON.

Customer:
- Name: ${customer.name}
- Total Spent: ₹${customer.totalSpent}
- Total Purchases: ${customer.totalPurchases}
- Days Since Last Purchase: ${customer.daysSinceLastPurchase}
- Status: ${customer.status}
- Average Order Value: ₹${customer.avgOrderValue}

Return exactly: {"riskLevel": "low"|"medium"|"high", "reason": "1 sentence", "action": "1 actionable sentence"}`;

  const raw = await callAI([{ role: 'user', content: prompt }]);
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { riskLevel: 'medium', reason: 'Unable to assess at this time.', action: 'Monitor customer activity.' };
  }
}

// ─── Sales Forecast ────────────────────────────────────────────────────────────

export async function generateSalesForecast(data: {
  recentTrends: Array<{ date: string; revenue: number; purchase_count: number }>;
  totalRevenueLast30: number;
  avgDailyRevenue: number;
  growthRate: number;
}): Promise<{ forecast7Day: number; forecast30Day: number; insight: string; confidence: string }> {
  const trendSummary = data.recentTrends
    .slice(-7)
    .map((t) => `${t.date}: ₹${t.revenue} (${t.purchase_count} orders)`)
    .join(', ');

  const prompt = `You are a retail sales forecasting expert. Analyze the trend data and produce a sales forecast.

Last 7 days of data: ${trendSummary}
Last 30-day revenue: ₹${data.totalRevenueLast30}
Average daily revenue: ₹${data.avgDailyRevenue}
Growth rate vs previous period: ${data.growthRate.toFixed(1)}%

Return ONLY this JSON:
{
  "forecast7Day": <number: predicted revenue next 7 days in rupees>,
  "forecast30Day": <number: predicted revenue next 30 days in rupees>,
  "insight": "<2 sentences interpreting the trend>",
  "confidence": "low|medium|high"
}`;

  const raw = await callAI([{ role: 'user', content: prompt }]);
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    const est7 = Math.round(data.avgDailyRevenue * 7 * (1 + data.growthRate / 100));
    const est30 = Math.round(data.avgDailyRevenue * 30 * (1 + data.growthRate / 100));
    return {
      forecast7Day: est7,
      forecast30Day: est30,
      insight: 'Based on recent trends, moderate growth is expected.',
      confidence: 'medium',
    };
  }
}

// ─── Report Summary ─────────────────────────────────────────────────────────────

export async function generateReportSummary(data: {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  newCustomers: number;
  topProducts?: string[];
  growthRate?: number;
}): Promise<string> {
  const prompt = `Write an executive business report summary for a retail store owner. Be professional, specific, and include one key strategic recommendation.

Report Period: ${data.period}
Total Revenue: ₹${data.totalRevenue.toLocaleString()}
Total Orders: ${data.totalOrders}
Average Order Value: ₹${data.avgOrderValue.toFixed(0)}
New Customers: ${data.newCustomers}
${data.topProducts?.length ? `Top Products: ${data.topProducts.join(', ')}` : ''}
${data.growthRate !== undefined ? `Growth Rate: ${data.growthRate.toFixed(1)}%` : ''}

Write 3-4 sentences. Start directly. Include 1 actionable strategy for next period.`;

  return callAI([{ role: 'user', content: prompt }]);
}

// ─── Insights (used by existing routes) ──────────────────────────────────────

export async function generateInsights(prompt: string): Promise<string> {
  return callAI([{ role: 'user', content: prompt }]);
}
