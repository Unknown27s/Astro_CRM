// src/ai/aiHelper.ts

import Groq from "groq-sdk";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      "Missing GROQ_API_KEY. Please:\n" +
      "1. Copy backend/.env.example to backend/.env\n" +
      "2. Add your Groq API key from https://console.groq.com\n" +
      "3. Set GROQ_API_KEY in backend/.env"
    );
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }

  return groqClient;
}

export async function generateInsights(prompt: string, retries = 5): Promise<string> {
  const groq = getGroqClient();

  for (let i = 0; i < retries; i++) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
      });

      return completion.choices[0]?.message?.content ?? "No response generated.";
    } catch (error: any) {
      if (error?.message?.includes('quota') || error?.message?.includes('Insufficient Quota')) {
        console.error("🚨 API Quota Exceeded for Groq!");
        throw error;
      }

      const isRateLimit =
        error?.status === 429 ||
        error?.status === '429' ||
        error?.message?.includes('429') ||
        error?.message?.includes('Too Many Requests');

      if (isRateLimit && i < retries - 1) {
        const delay = 3000 * (2 ** i); // 3s, 6s, 12s, 24s
        console.warn(`[AI] Rate limit hit. Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      console.error("[AI] Error generation failed:", error);
      throw error;
    }
  }
  return "No response generated.";
}

export async function generateChatResponse(messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>, retries = 5): Promise<string> {
  const groq = getGroqClient();

  const chatMessages = [
    { role: 'system', content: 'You are Astro, the helpful, professional, and friendly AI assistant for an eCommerce CRM. You assist users with questions about their store, retail analytics, and general shopping advice. Keep answers short and concise.' },
    ...messages
  ];

  for (let i = 0; i < retries; i++) {
    try {
      const completion = await groq.chat.completions.create({
        messages: chatMessages as any,
        model: "llama-3.3-70b-versatile",
      });

      return completion.choices[0]?.message?.content ?? "No response generated.";
    } catch (error: any) {
      if (error?.message?.includes('quota') || error?.message?.includes('Insufficient Quota')) {
        console.error("🚨 API Quota Exceeded for Groq Chatbot!");
        throw new Error("I am currently out of API quota. Please check the Groq billing dashboard.");
      }

      const isRateLimit =
        error?.status === 429 ||
        error?.status === '429' ||
        error?.message?.includes('429') ||
        error?.message?.includes('Too Many Requests');

      if (isRateLimit && i < retries - 1) {
        const delay = 2000 * (2 ** i);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  return "Sorry, I am having trouble connecting right now.";
}