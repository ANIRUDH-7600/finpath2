import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import type { Transaction } from '@/types'

interface BehavioralAnalysisResult {
  emotionalSpending: {
    detected: boolean
    patterns: string[]
    estimatedCost: number
    suggestion: string
  }
  unusedSubscriptions: {
    detected: boolean
    subscriptions: string[]
    estimatedSavings: number
    suggestion: string
  }
  overusedBills: {
    detected: boolean
    bills: string[]
    estimatedOverage: number
    suggestion: string
  }
  spendingPatterns: {
    pattern: string
    frequency: string
    impact: string
  }[]
  overallInsight: string
}

export async function analyzeBehaviorWithGroq(
  transactions: Transaction[],
  monthlyIncome: number
): Promise<BehavioralAnalysisResult> {
  // Prepare transaction summary for AI
  const transactionSummary = transactions.slice(0, 50).map(t => ({
    merchant: t.merchant,
    amount: t.amount,
    category: t.category,
    date: t.date
  }))

  const prompt = `You are a financial behavioral analyst for FinPath, an Indian personal finance app. Analyze these transactions and identify:

1. EMOTIONAL SPENDING: Look for patterns indicating emotional spending (late-night orders, weekend splurges, retail therapy after certain days, etc.)
2. UNUSED SUBSCRIPTIONS: Identify recurring payments that might be unused (Netflix, Spotify, gym, etc. that appear monthly but may be wasted)
3. OVERUSED BILLS: Identify bills or services where usage/cost is higher than normal (electricity, mobile, broadband, etc.)

Transactions (last 50):
${JSON.stringify(transactionSummary, null, 2)}

Monthly Income: ₹${monthlyIncome}

Return a JSON object with this exact structure:
{
  "emotionalSpending": {
    "detected": boolean,
    "patterns": ["pattern1", "pattern2"],
    "estimatedCost": number (estimated monthly cost in rupees),
    "suggestion": "actionable suggestion"
  },
  "unusedSubscriptions": {
    "detected": boolean,
    "subscriptions": ["subscription1", "subscription2"],
    "estimatedSavings": number (monthly savings possible in rupees),
    "suggestion": "actionable suggestion"
  },
  "overusedBills": {
    "detected": boolean,
    "bills": ["bill1", "bill2"],
    "estimatedOverage": number (excess amount in rupees),
    "suggestion": "actionable suggestion"
  },
  "spendingPatterns": [
    {
      "pattern": "description of pattern",
      "frequency": "how often it occurs",
      "impact": "financial impact"
    }
  ],
  "overallInsight": "one powerful sentence summarizing the key finding"
}

Be specific with Indian context. Use exact merchant names from the data. Return ONLY valid JSON, no other text.`

  try {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'), // Free tier model
      prompt: prompt,
      temperature: 0.3,
    })

    // Clean the response (remove any markdown code blocks)
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '')
    }

    const result = JSON.parse(cleanedText) as BehavioralAnalysisResult
    return result
  } catch (error) {
    console.error('Groq analysis error:', error)
    // Return fallback analysis
    return getFallbackAnalysis(transactions)
  }
}

// Fallback analysis if Groq fails
function getFallbackAnalysis(transactions: Transaction[]): BehavioralAnalysisResult {
  // Detect late-night spending
  const lateNightTx = transactions.filter(t => {
    const hour = new Date(t.date).getHours()
    return hour > 22 && hour < 5 && t.category === 'Food & Dining'
  })
  
  // Detect subscriptions
  const subscriptions = transactions.filter(t => 
    t.category === 'Subscriptions' && t.amount < 1000
  )
  
  // Detect weekend spending
  const weekendTx = transactions.filter(t => {
    const date = new Date(t.date)
    return date.getDay() === 0 || date.getDay() === 6
  })
  const weekendTotal = weekendTx.reduce((sum, t) => sum + t.amount, 0)
  const avgWeekend = weekendTx.length > 0 ? weekendTotal / weekendTx.length : 0

  return {
    emotionalSpending: {
      detected: lateNightTx.length > 3,
      patterns: lateNightTx.length > 3 ? ['Late-night food orders after 10 PM'] : [],
      estimatedCost: lateNightTx.reduce((sum, t) => sum + t.amount, 0),
      suggestion: 'Set a daily spending limit for late-night hours. Plan meals in advance.'
    },
    unusedSubscriptions: {
      detected: subscriptions.length > 2,
      subscriptions: subscriptions.map(s => s.merchant),
      estimatedSavings: subscriptions.reduce((sum, s) => sum + s.amount, 0),
      suggestion: 'Review your active subscriptions. Cancel any you haven\'t used in 30 days.'
    },
    overusedBills: {
      detected: false,
      bills: [],
      estimatedOverage: 0,
      suggestion: 'Monitor your utility bills for unusual spikes.'
    },
    spendingPatterns: [
      {
        pattern: `Weekend spending averages ₹${avgWeekend.toFixed(0)} per weekend day`,
        frequency: 'Every weekend',
        impact: `~₹${(avgWeekend * 8).toFixed(0)} per month`
      }
    ],
    overallInsight: lateNightTx.length > 3 
      ? 'Your late-night food deliveries are adding up. Consider meal prepping.'
      : 'Your spending patterns show healthy habits. Keep tracking!'
  }
}