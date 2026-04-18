// app/api/paper-trading/agent/route.ts - COMPLETE FIXED VERSION
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { groq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { marketData } from '@/lib/services/market-data'

interface AgentDecision {
  symbol: string
  name: string
  asset_type: string
  action: 'buy' | 'sell' | 'hold'
  quantity: number
  price: number
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id')
    if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })

    const decisions = await prisma.aIAgentDecision.findMany({
      where: { user_id, status: 'pending' },
      orderBy: { created_at: 'desc' },
    })
    return Response.json(decisions)
  } catch (error) {
    console.error('agent GET error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { user_id, action, decision_id } = body

    // Handle empty body
    if (!user_id && !action) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Approve/reject a pending decision
    if (action === 'approve' || action === 'reject') {
      if (!decision_id) {
        return Response.json({ error: 'decision_id required' }, { status: 400 })
      }
      
      const decision = await prisma.aIAgentDecision.findUnique({ where: { id: decision_id } })
      if (!decision) return Response.json({ error: 'Decision not found' }, { status: 404 })

      if (action === 'reject') {
        await prisma.aIAgentDecision.update({ where: { id: decision_id }, data: { status: 'rejected' } })
        return Response.json({ ok: true })
      }

      // Execute the trade
      const portfolio = await prisma.paperPortfolio.findUnique({
        where: { user_id },
        include: { holdings: true },
      })
      if (!portfolio) return Response.json({ error: 'Portfolio not found' }, { status: 404 })

      const totalValue = decision.quantity * decision.price
      const existingHolding = portfolio.holdings.find((h: { symbol: string }) => h.symbol === decision.symbol)

      if (decision.action === 'buy' && portfolio.cash_balance < totalValue) {
        await prisma.aIAgentDecision.update({ where: { id: decision_id }, data: { status: 'rejected' } })
        return Response.json({ error: 'Insufficient cash' }, { status: 400 })
      }
      if (decision.action === 'sell' && (!existingHolding || existingHolding.quantity < decision.quantity)) {
        await prisma.aIAgentDecision.update({ where: { id: decision_id }, data: { status: 'rejected' } })
        return Response.json({ error: 'Insufficient holdings' }, { status: 400 })
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (decision.action === 'buy') {
          await tx.paperPortfolio.update({ where: { id: portfolio.id }, data: { cash_balance: { decrement: totalValue } } })
          if (existingHolding) {
            const newQty = existingHolding.quantity + decision.quantity
            const newAvg = (existingHolding.quantity * existingHolding.avg_buy_price + decision.quantity * decision.price) / newQty
            await tx.paperHolding.update({ where: { id: existingHolding.id }, data: { quantity: newQty, avg_buy_price: newAvg } })
          } else {
            await tx.paperHolding.create({
              data: { portfolio_id: portfolio.id, symbol: decision.symbol, name: decision.name, asset_type: decision.symbol.includes('BEES') || decision.symbol.includes('ETF') ? 'etf' : 'stock', quantity: decision.quantity, avg_buy_price: decision.price },
            })
          }
        } else {
          await tx.paperPortfolio.update({ where: { id: portfolio.id }, data: { cash_balance: { increment: totalValue } } })
          const newQty = (existingHolding?.quantity ?? 0) - decision.quantity
          if (newQty <= 0.0001) await tx.paperHolding.delete({ where: { id: existingHolding!.id } })
          else await tx.paperHolding.update({ where: { id: existingHolding!.id }, data: { quantity: newQty } })
        }

        await tx.paperTrade.create({
          data: {
            portfolio_id: portfolio.id, symbol: decision.symbol, name: decision.name,
            asset_type: 'stock', action: decision.action, quantity: decision.quantity,
            price: decision.price, total_value: totalValue,
            triggered_by: 'ai_agent', ai_reason: decision.reason,
          },
        })

        await tx.aIAgentDecision.update({ where: { id: decision_id }, data: { status: 'executed' } })
      })

      return Response.json({ ok: true })
    }

    // Run the AI agent analysis
    if (action === 'analyze') {
      if (!user_id) {
        return Response.json({ error: 'user_id required' }, { status: 400 })
      }

      const [user, portfolio, recentTxns, macro] = await Promise.all([
        prisma.user.findUnique({ where: { id: user_id }, select: { monthly_income: true, risk_appetite: true } }),
        prisma.paperPortfolio.findUnique({ where: { user_id }, include: { holdings: true } }),
        prisma.transaction.findMany({
          where: { user_id, date: { gte: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] } },
          select: { amount: true, category: true },
          take: 50,
        }),
        marketData.getMacroData(),
      ])

      if (!portfolio) return Response.json({ error: 'Create a portfolio first' }, { status: 400 })

      // Clear old pending decisions
      await prisma.aIAgentDecision.updateMany({
        where: { user_id, status: 'pending' },
        data: { status: 'superseded' },
      })

      const monthlySpend = recentTxns.reduce((s: number, t: { amount: number }) => s + t.amount, 0)
      const spendRate = user?.monthly_income ? Math.round((monthlySpend / user.monthly_income) * 100) : 50

      const holdingsSummary = portfolio.holdings.length > 0
        ? portfolio.holdings.map((h: { symbol: string; quantity: number; avg_buy_price: number }) => `${h.symbol}: ${h.quantity} units @ ₹${h.avg_buy_price}`).join('\n')
        : 'No holdings'

      // Use Groq instead of Claude
      const prompt = `You are a portfolio manager. Analyze and suggest trades.

USER: Risk ${user?.risk_appetite ?? 3}/5, Income ₹${user?.monthly_income?.toLocaleString('en-IN') ?? '50,000'}, Spend rate ${spendRate}%

PORTFOLIO: Cash ₹${Math.round(portfolio.cash_balance).toLocaleString('en-IN')}
Holdings:
${holdingsSummary}

MARKET: Nifty ${macro.niftyLevel}, PE ${macro.niftyPE}, Sentiment ${macro.sentiment.label}

Available: RELIANCE(2847), TCS(3892), HDFCBANK(1756), INFY(1623), ICICIBANK(1298), NIFTYBEES(248), GOLDBEES(66)

RULES:
- Only BUY if cash >= quantity × price
- Only SELL if holding exists
- Max 2 buy, 2 sell

Return JSON array only:
[{"symbol":"RELIANCE","name":"Reliance Industries","asset_type":"stock","action":"buy","quantity":1,"price":2847,"reason":"short reason","confidence":"medium"}]`

      let decisions: AgentDecision[] = []
      
      try {
        const { text } = await generateText({
          model: groq('llama-3.3-70b-versatile'),
          prompt: prompt,
          temperature: 0.3,
          maxOutputTokens: 500,
        })
        
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
        const match = cleaned.match(/\[[\s\S]*\]/)
        if (match) {
          decisions = JSON.parse(match[0]).filter((d: AgentDecision) => d.action !== 'hold')
        }
      } catch (groqError) {
        console.log('Groq failed, using fallback decisions')
        // Fallback: simple rule-based decision
        if (macro.niftyPE < 22 && portfolio.cash_balance > 5000) {
          decisions = [{
            symbol: 'NIFTYBEES',
            name: 'Nippon Nifty 50 BeES',
            asset_type: 'etf',
            action: 'buy',
            quantity: Math.floor(portfolio.cash_balance * 0.3 / 248),
            price: 248,
            reason: 'Fair valuation, good entry',
            confidence: 'medium',
          }]
        }
      }

      // Validate decisions before saving
      const validDecisions = decisions.filter(d => {
        if (d.action === 'buy') {
          const totalCost = d.quantity * d.price
          return totalCost <= portfolio.cash_balance && d.quantity > 0
        }
        if (d.action === 'sell') {
          const holding = portfolio.holdings.find((h: { symbol: string; quantity: number }) => h.symbol === d.symbol)
          return holding && holding.quantity >= d.quantity && d.quantity > 0
        }
        return false
      })

      if (validDecisions.length > 0) {
        await prisma.aIAgentDecision.createMany({
          data: validDecisions.map(d => ({
            user_id,
            symbol: d.symbol,
            name: d.name,
            action: d.action,
            quantity: d.quantity,
            price: d.price,
            reason: d.reason,
            confidence: d.confidence,
            status: 'pending',
          })),
        })
      }

      return Response.json({ decisions: validDecisions, count: validDecisions.length })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('agent POST error:', error)
    return Response.json({ error: 'Agent failed', details: String(error) }, { status: 500 })
  }
}