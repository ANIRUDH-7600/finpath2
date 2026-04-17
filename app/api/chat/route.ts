import { groq } from '@ai-sdk/groq';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'), // Free model
    system: `You are FinPath AI, a helpful financial assistant.
    
    Guidelines:
    - Answer personal finance questions (budgeting, saving, investing basics)
    - Explain Indian financial concepts (SIP, Mutual Funds, Nifty, PPF, etc.)
    - Give general financial education and tips
    - Always say: "Consult a SEBI-registered advisor before investing"
    - Keep responses short, practical, and friendly
    - Never predict stock market returns
    
    Be concise (2-3 sentences when possible). Use emojis occasionally.`,
    messages,
  });

  return result.toTextStreamResponse();
}