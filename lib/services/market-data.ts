import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'

export interface MacroData {
  niftyPE: number
  niftyLevel: number
  sensexLevel: number
  inflation: number
  repoRate: number
  goldPrice: number
  usdinr: number
  fiiFlow: number
  diiFlow: number
  sentiment: { score: number; label: string; sources: string[]; timestamp: string }
  market_signal: string
  action_tip: string
}

export class MarketDataService {
  async getMacroData(): Promise<MacroData> {
    try {
      // Use Groq instead of Gemini
      const { text } = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt: `Return ONLY valid JSON for current Indian market data (April 2026):
{
  "nifty_pe": number between 18-28,
  "nifty_current": number between 20000-26000,
  "sensex_current": number between 65000-85000,
  "inflation": number between 4-7,
  "repo_rate": number between 6-7,
  "sentiment": "bullish" or "neutral" or "bearish"
}

Use realistic values based on current Indian market conditions.`,
        temperature: 0.3,
        maxOutputTokens: 300,
      })
      
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      const data = JSON.parse(cleaned)
      
      return {
        niftyPE: data.nifty_pe,
        niftyLevel: data.nifty_current,
        sensexLevel: data.sensex_current,
        inflation: data.inflation,
        repoRate: data.repo_rate,
        goldPrice: 65000,
        usdinr: 83.5,
        fiiFlow: 1200,
        diiFlow: 800,
        sentiment: {
          score: data.sentiment === 'bullish' ? 0.6 : data.sentiment === 'bearish' ? -0.3 : 0.2,
          label: data.sentiment,
          sources: ['Groq AI analysis'],
          timestamp: new Date().toISOString()
        },
        market_signal: data.sentiment === 'bullish' 
          ? 'Markets showing positive momentum with strong FII inflows' 
          : data.sentiment === 'bearish'
          ? 'Markets under pressure, maintain caution'
          : 'Markets stable with balanced valuations',
        action_tip: data.sentiment === 'bullish'
          ? 'Consider increasing equity allocation through SIPs'
          : data.sentiment === 'bearish'
          ? 'Stay invested, avoid panic selling. Add gold for hedge'
          : 'Continue systematic investments as per asset allocation'
      }
    } catch (error) {
      console.log('Groq macro fetch failed, using fallback:', error)
      return this.getFallbackData()
    }
  }

  private getFallbackData(): MacroData {
    return {
      niftyPE: 22.5,
      niftyLevel: 22500,
      sensexLevel: 74000,
      inflation: 5.2,
      repoRate: 6.5,
      goldPrice: 65000,
      usdinr: 83.5,
      fiiFlow: 1200,
      diiFlow: 800,
      sentiment: {
        score: 0.2,
        label: 'neutral',
        sources: ['Fallback market data'],
        timestamp: new Date().toISOString()
      },
      market_signal: 'Indian markets remain stable with moderate valuations. Systematic investments recommended.',
      action_tip: 'Maintain your asset allocation as per risk profile. Continue SIPs.'
    }
  }
}

export const marketData = new MarketDataService()