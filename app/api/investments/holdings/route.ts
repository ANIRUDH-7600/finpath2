// app/api/investments/holdings/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

interface Investment {
  id: string
  fund_name: string
  asset_type: string
  amount: number
  avg_buy_price: number | null
  status: string
}

interface Holding {
  id: string
  fund_name: string
  asset_type: string
  amount: number
  avg_buy_price: number
  current_value: number
  pnl: number
  pnl_pct: number
}

export async function GET(req: NextRequest) {
  try {
    const user_id = req.nextUrl.searchParams.get('user_id')
    
    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    // Get user's investments from the Investment table
    const investmentsRaw = await prisma.investment.findMany({
      where: { user_id, status: 'active' }
    })
    const investments: Investment[] = investmentsRaw.map(inv => ({
      id: inv.id,
      fund_name: inv.fund_name,
      asset_type: inv.asset_type,
      amount: inv.amount,
      avg_buy_price: inv.sip_amount ?? null,
      status: inv.status,
    }))

    // Calculate current values (simplified - in real app, fetch live prices)
    const holdings: Holding[] = investments.map((inv: Investment) => {
      const currentPrice: number = inv.avg_buy_price || inv.amount
      const currentValue: number = inv.amount
      const pnl: number = currentValue - inv.amount
      const pnlPct: number = inv.amount > 0 ? (pnl / inv.amount) * 100 : 0
      
      return {
        id: inv.id,
        fund_name: inv.fund_name,
        asset_type: inv.asset_type,
        amount: inv.amount,
        avg_buy_price: inv.avg_buy_price || inv.amount,
        current_value: currentValue,
        pnl: pnl,
        pnl_pct: pnlPct
      }
    })

    const totalInvested: number = investments.reduce((sum: number, inv: Investment) => sum + inv.amount, 0)
    const totalCurrentValue: number = holdings.reduce((sum: number, h: Holding) => sum + h.current_value, 0)
    const totalPnl: number = totalCurrentValue - totalInvested
    const totalPnlPct: number = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

    return Response.json({
      holdings,
      total_invested: totalInvested,
      total_current_value: totalCurrentValue,
      total_pnl: totalPnl,
      total_pnl_pct: totalPnlPct
    })
  } catch (error) {
    console.error('Holdings error:', error)
    return Response.json({ error: 'Failed to fetch holdings' }, { status: 500 })
  }
}