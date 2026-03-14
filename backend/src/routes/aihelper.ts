// src/routes/aihelper.ts — ASI:One AI Service (OpenAI-compatible)

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { queryOne } from '../database/db';
dotenv.config();

const MODEL = 'asi1';

let asiClient: OpenAI | null = null;

function resolveAsiApiKey(): string | undefined {
  const envKey = process.env.ASI_ONE_API_KEY?.trim();
  if (envKey) return envKey;

  const settings = queryOne<{ asi_api_key?: string }>('SELECT asi_api_key FROM store_settings LIMIT 1');
  const dbKey = settings?.asi_api_key?.trim();
  return dbKey;
}

export function getAsiClient(): OpenAI {
  const apiKey = resolveAsiApiKey();

  if (!apiKey) {
    throw new Error(
      'Missing ASI_ONE_API_KEY. Please set ASI_ONE_API_KEY in your .env file or configure in Online Store settings.'
    );
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
  const client = getAsiClient();

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

// ─── Chat: General CRM assistant ────────────────────────────────────────────

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