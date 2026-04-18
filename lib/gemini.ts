import { GoogleGenerativeAI } from '@google/generative-ai'

export const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
export const GEMINI_MODEL = 'gemini-2.0-flash'
