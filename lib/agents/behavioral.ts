import type { Transaction } from '@/types'
import { analyzeBehaviorWithGroq } from './groq_behaviour'

interface FinancialContext {
  monthlyIncome: number
  currentSavings: number
  monthlySpending: number
  savingsRate?: number
}

export async function analyzeBehavior(transactions: Transaction[], context: FinancialContext) {
  const { monthlyIncome, monthlySpending, savingsRate = 0 } = context
  
  // Get AI-powered behavioral analysis
  let aiAnalysis
  try {
    aiAnalysis = await analyzeBehaviorWithGroq(transactions, monthlyIncome)
  } catch (error) {
    console.error('AI analysis failed, using fallback:', error)
    aiAnalysis = null
  }
  
  // Calculate health score
  let healthScore = 50
  let healthLabel = 'Average'
  
  if (savingsRate >= 30) {
    healthScore = 90
    healthLabel = 'Excellent'
  } else if (savingsRate >= 20) {
    healthScore = 75
    healthLabel = 'Good'
  } else if (savingsRate >= 10) {
    healthScore = 60
    healthLabel = 'Fair'
  } else {
    healthScore = 40
    healthLabel = 'Needs Improvement'
  }
  
  // Adjust health score based on AI detections
  if (aiAnalysis) {
    if (aiAnalysis.emotionalSpending.detected) healthScore -= 10
    if (aiAnalysis.unusedSubscriptions.detected) healthScore -= 5
    if (healthScore < 0) healthScore = 0
  }
  
  // Categorize transactions
  const categories: Record<string, number> = {}
  transactions.forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + t.amount
  })
  
  // Build leakage patterns from AI analysis
  const leakage_patterns = []
  
  if (aiAnalysis?.emotionalSpending.detected) {
    leakage_patterns.push({
      pattern: 'Emotional Spending Detected',
      amount: aiAnalysis.emotionalSpending.estimatedCost,
      frequency: aiAnalysis.emotionalSpending.patterns.join(', '),
      suggestion: aiAnalysis.emotionalSpending.suggestion
    })
  }
  
  if (aiAnalysis?.unusedSubscriptions.detected) {
    leakage_patterns.push({
      pattern: 'Unused Subscriptions',
      amount: aiAnalysis.unusedSubscriptions.estimatedSavings,
      frequency: aiAnalysis.unusedSubscriptions.subscriptions.length.toString(),
      suggestion: aiAnalysis.unusedSubscriptions.suggestion
    })
  }
  
  if (aiAnalysis?.overusedBills.detected) {
    leakage_patterns.push({
      pattern: 'Bill Overage',
      amount: aiAnalysis.overusedBills.estimatedOverage,
      frequency: 'Monthly',
      suggestion: aiAnalysis.overusedBills.suggestion
    })
  }
  
  // Add manual pattern detection as backup
  const microTransactions = transactions.filter(t => t.amount < 200)
  if (microTransactions.length > 20 && !aiAnalysis?.emotionalSpending.detected) {
    const total = microTransactions.reduce((sum, t) => sum + t.amount, 0)
    leakage_patterns.push({
      pattern: 'Frequent small UPI payments',
      amount: total,
      frequency: `${microTransactions.length} transactions`,
      suggestion: 'Set a daily UPI limit of ₹200 for non-essential spends'
    })
  }
  
  // Generate top insight
  let topInsight = aiAnalysis?.overallInsight || ''
  
  if (!topInsight) {
    if (monthlySpending > monthlyIncome) {
      topInsight = `⚠️ Your spending (₹${monthlySpending}) exceeds your income (₹${monthlyIncome}). Review your expenses immediately.`
    } else if (savingsRate < 10) {
      topInsight = `Your savings rate is ${savingsRate.toFixed(1)}%. Try to save at least 20% of your income. ${aiAnalysis?.unusedSubscriptions.suggestion || ''}`
    } else if (savingsRate >= 20) {
      topInsight = `Great job! You're saving ${savingsRate.toFixed(1)}% of your income. Consider investing this surplus for long-term wealth.`
    } else {
      topInsight = `You're saving ${savingsRate.toFixed(1)}% of your income. Increase this to 20% for faster wealth building.`
    }
  }
  
  return {
    health_score: healthScore,
    health_label: healthLabel,
    monthly_total: monthlySpending,
    categories,
    top_insight: topInsight,
    leakage_patterns,
    ai_insights: aiAnalysis?.spendingPatterns || []
  }
}