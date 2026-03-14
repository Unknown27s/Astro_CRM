// src/scheduler.ts

import dotenv from "dotenv";
dotenv.config();

import cron from "node-cron";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { query } from "../database/db";
import { prepareCustomerFeatures, performKMeansClustering } from "./mlService";
import { generateInsights } from "../routes/aihelper";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  purchase_count: number;
  total_value: number;
  avg_order_value: number;
  days_since_last_purchase: number;
}

interface ReportItem {
  category?: string;
  title?: string;
  details?: string;
}

interface PersonalizedMessage {
  customerId: number;
  message: string;
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

function fallbackMessage(customer: Customer): string {
  return `Hi ${customer.name}, thanks for being a valued customer! Enjoy an exclusive offer on your next purchase. Reply for details.`;
}

async function generateBulkPersonalizedMessages(customers: Customer[]): Promise<Map<number, string>> {
  if (customers.length === 0) {
    return new Map();
  }

  const compactCustomers = customers.slice(0, 20).map((customer) => ({
    customerId: customer.id,
    name: customer.name,
    totalSpend: Number(customer.total_value || 0),
    purchaseCount: Number(customer.purchase_count || 0)
  }));

  const prompt = `
Create premium loyalty SMS messages for these customers.
Return ONLY a JSON array of objects.
Each object must include:
- customerId (number)
- message (string, max 160 chars)

Customer Data:
${JSON.stringify(compactCustomers)}

Rules:
- mention appreciation and one special offer
- friendly and concise tone
- no markdown, no additional text
`;

  const response = await generateInsights(prompt);
  const cleaned = cleanJsonMarkdown(response);
  const parsed = JSON.parse(cleaned) as PersonalizedMessage[];

  const messageMap = new Map<number, string>();
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item.customerId !== 'number') continue;
      const text = String(item.message || '').trim();
      if (!text) continue;
      messageMap.set(item.customerId, text.slice(0, 160));
    }
  }

  return messageMap;
}

async function getAllCustomers(): Promise<Customer[]> {
  return query<Customer>(`
    SELECT
      c.id,
      c.name,
      COALESCE(c.phone, '') as phone,
      COALESCE(c.email, '') as email,
      COUNT(DISTINCT p.id) as purchase_count,
      COALESCE(SUM(p.total_amount), 0) as total_value,
      COALESCE(AVG(p.total_amount), 0) as avg_order_value,
      COALESCE(julianday('now') - julianday(MAX(p.purchase_date)), 9999) as days_since_last_purchase
    FROM customers c
    LEFT JOIN purchases p ON p.customer_id = c.id
    GROUP BY c.id, c.name, c.phone, c.email
    HAVING purchase_count > 0
    ORDER BY total_value DESC
  `);
}

async function sendSMS(phone: string, message: string): Promise<void> {
  if (!phone) return;
  console.log(`📲 SMS queued for ${phone}: ${message.slice(0, 80)}...`);
}

async function sendEmail(email: string, subject: string, body: string): Promise<void> {
  if (!email) return;
  console.log(`📧 Email queued for ${email}: ${subject} (${body.length} chars)`);
}

async function saveCSVReport(jsonText: string, fileName: string): Promise<void> {
  const outputDir = join(__dirname, "../../data/reports");
  await mkdir(outputDir, { recursive: true });

  let csv = "category,title,details\n";
  try {
    const data = JSON.parse(jsonText) as ReportItem[];
    csv += data
      .map((item) => {
        const category = (item.category ?? "").replace(/"/g, '""');
        const title = (item.title ?? "").replace(/"/g, '""');
        const details = (item.details ?? "").replace(/"/g, '""');
        return `"${category}","${title}","${details}"`;
      })
      .join("\n");
  } catch {
    csv += `"raw","report","${jsonText.replace(/"/g, '""')}"`;
  }

  await writeFile(join(outputDir, `${fileName}.csv`), csv, "utf-8");
}

async function savePDFReport(htmlBody: string, fileName: string): Promise<void> {
  const outputDir = join(__dirname, "../../data/reports");
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, `${fileName}.html`), htmlBody, "utf-8");
}

// 🔍 Optional debug (remove after testing)
// console.log("Gemini Key:", process.env.GEMINI_API_KEY);

async function runAutomation() {
  console.log("🚀 Running AI automation...");

  try {
    // 1️⃣ Fetch customers
    const allCustomers: Customer[] = await getAllCustomers();

    if (!allCustomers || allCustomers.length === 0) {
      console.log("No customers found. Exiting automation.");
      return;
    }

    if (allCustomers.length < 2) {
      console.log("Not enough customers for clustering.");
      return;
    }

    // 2️⃣ Prepare ML features
    const features = prepareCustomerFeatures(allCustomers);

    const k = Math.min(3, features.length);
    const clusters = await performKMeansClustering(features, k);

    // 3️⃣ Identify gold cluster (highest total spend)
    const clusterTotals = clusters.map((c) => c.centroid[0] || 0);
    const goldClusterIndex = clusterTotals.indexOf(Math.max(...clusterTotals));

    const goldCustomerIndexes: number[] = clusters[goldClusterIndex]?.points || [];
    const goldCustomers = goldCustomerIndexes.map((i: number) => allCustomers[i]);

    console.log(`Identified ${goldCustomers.length} gold customers.`);

    // 4️⃣ AI Personalized Messaging (single API call for all selected customers)
    let messageMap = new Map<number, string>();
    try {
      messageMap = await generateBulkPersonalizedMessages(goldCustomers);
    } catch (err) {
      console.error("❌ Bulk AI message generation failed. Falling back to template messages:", err);
    }

    for (const customer of goldCustomers) {
      try {
        const aiMessage = messageMap.get(customer.id) || fallbackMessage(customer);

        await sendSMS(customer.phone, aiMessage);

        await sendEmail(
          customer.email,
          "Exclusive Gold Member Offer",
          aiMessage
        );

        console.log(`✅ Sent personalized message to ${customer.name}`);
      } catch (err) {
        console.error(`❌ Failed to message ${customer.name}:`, err);
      }
      // Add a 2s delay between customers to respect API rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 5️⃣ Generate AI Segmentation Report
    const reportPrompt = `
Generate a professional JSON summary report for customer segmentation.

Total Customers: ${allCustomers.length}
Clusters: ${JSON.stringify(clusters)}

You must return a raw JSON array of objects. Each object in the array should represent a specific insight or recommendation. It must have exactly these keys:
- "category": (e.g., "Cluster Description", "Gold Trend", "Revenue Insight", "Recommendation")
- "title": A short title for this insight.
- "details": A detailed description or finding.

Return strictly the JSON array. Do not include any other markdown or text.
    `;

    let reportJSON = "";

    try {
      reportJSON = await generateInsights(reportPrompt);

      // Clean up potential markdown formatting from the AI response
      if (reportJSON.includes('```')) {
        const match = reportJSON.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (match) {
          reportJSON = match[1];
        } else {
          reportJSON = reportJSON.replace(/```(?:json)?\n/g, '').replace(/```/g, '');
        }
      }
      reportJSON = reportJSON.trim();
    } catch (err) {
      console.error("❌ AI report generation failed:", err);
    }

    // 6️⃣ Save Reports
    if (reportJSON) {
      try {
        const data = JSON.parse(reportJSON) as ReportItem[];
        let htmlBody = `
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 40px; }
            h1 { color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
            p.date { font-size: 14px; color: #6b7280; margin-bottom: 30px; }
            .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            .category { font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: bold; margin-bottom: 5px; }
            .title { font-size: 18px; font-weight: bold; color: #111827; margin-top: 0; margin-bottom: 10px; }
            .details { font-size: 14px; line-height: 1.6; color: #4b5563; }
            .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <h1>AI Segmentation & Insights Report</h1>
          <p class="date">Generated on ${new Date().toLocaleDateString()}</p>
        `;

        for (const item of data) {
          htmlBody += `
           <div class="card">
             <div class="category">${item.category || 'Insight'}</div>
             <h2 class="title">${item.title || ''}</h2>
             <div class="details">${item.details || ''}</div>
           </div>`;
        }

        htmlBody += `<div class="footer">Generated by Astro CRM AI</div></body></html>`;

        await saveCSVReport(reportJSON, "segmentation_report");
        await savePDFReport(htmlBody, "segmentation_report_pdf");

        console.log("📊 Reports saved successfully.");
      } catch (err) {
        console.error("❌ Failed to save reports:", err);
      }
    }

    console.log("✅ Automation complete!");
  } catch (err) {
    console.error("💥 Automation crashed:", err);
  }
}

// 🕘 Run daily at 9 AM
cron.schedule("0 9 * * *", runAutomation);

// 🔥 Run immediately for testing
runAutomation();