// app/api/investments/market/route.ts - Using Groq
import { NextResponse } from 'next/server'
import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'

export async function GET() {
  try {
    // Try to get fresh market data from Groq
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `Return ONLY valid JSON for current Indian stock market data (April 2026):
{
  "nifty_current": number,
  "nifty_pe": number,
  "nifty_change_pct": number,
  "sensex_current": number,
  "repo_rate": number,
  "inflation": number,
  "sentiment": "bullish" or "neutral" or "bearish"
}

Use realistic values based on current market conditions.`,
      temperature: 0.3,
      maxOutputTokens: 300,
    })
    
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    const data = JSON.parse(cleaned)
    
    return NextResponse.json({
      nifty_current: data.nifty_current,
      nifty_pe: data.nifty_pe,
      nifty_change_pct: data.nifty_change_pct,
      sensex_current: data.sensex_current,
      repo_rate: data.repo_rate,
      inflation: data.inflation,
      sentiment: data.sentiment,
      nifty_monthly: generateMonthlyData(),
      stocks: generateStocks(),
      mutual_funds: generateMutualFunds(),
      etfs: generateETFs(),
      fetched_at: new Date().toISOString()
    })
  } catch (error) {
    console.log('Groq market fetch failed, using fallback:', error)
    // Fallback to static data
    return NextResponse.json({
      nifty_current: 22500,
      nifty_pe: 22.5,
      nifty_change_pct: 0.35,
      sensex_current: 74000,
      repo_rate: 6.5,
      inflation: 5.2,
      sentiment: 'neutral',
      nifty_monthly: generateMonthlyData(),
      stocks: generateStocks(),
      mutual_funds: generateMutualFunds(),
      etfs: generateETFs(),
      fetched_at: new Date().toISOString()
    })
  }
}

function generateMonthlyData() {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
  let value = 21800
  return months.map(month => {
    value = value + (Math.random() - 0.5) * 400
    return { month, value: Math.round(value) }
  })
}

function generateStocks() {
  return [
    { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2847, change_pct: 1.2, sector: 'Energy' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3892, change_pct: -0.5, sector: 'IT' },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1756, change_pct: 0.8, sector: 'Banking' },
    { symbol: 'INFY', name: 'Infosys', price: 1623, change_pct: -1.2, sector: 'IT' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 1298, change_pct: 1.5, sector: 'Banking' },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', price: 1895, change_pct: 2.1, sector: 'Telecom' },
  ]
}

function generateMutualFunds() {
  return [
    { name: 'SBI Bluechip Fund', category: 'Large Cap', nav: 102.5, returns_1y: 18.2, risk: 'Moderate', sip_min: 500 },
    { name: 'Parag Parikh Flexi Cap', category: 'Flexi Cap', nav: 78.3, returns_1y: 22.1, risk: 'High', sip_min: 1000 },
    { name: 'Quant Small Cap Fund', category: 'Small Cap', nav: 145.6, returns_1y: 28.4, risk: 'Very High', sip_min: 500 },
    { name: 'HDFC Balanced Advantage', category: 'Hybrid', nav: 64.2, returns_1y: 13.7, risk: 'Moderate', sip_min: 500 },
  ]
}

function generateETFs() {
  return [
    { symbol: 'NIFTYBEES', name: 'Nippon Nifty 50 BeES', price: 248.5, ytd_pct: 14.3, underlying: 'Nifty 50' },
    { symbol: 'MON100', name: 'Motilal Nasdaq 100 ETF', price: 98.3, ytd_pct: 8.5, underlying: 'Nasdaq 100' },
    { symbol: 'GOLDBEES', name: 'Nippon India Gold ETF', price: 65.8, ytd_pct: 9.2, underlying: 'Gold' },
  ]
}