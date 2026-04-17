import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  try {
    const { user_id, monthly_income } = await req.json()

    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 })
    }

    if (typeof monthly_income !== 'number' || monthly_income < 0) {
      return Response.json({ error: 'valid monthly_income required' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: { 
        monthly_income,
        onboarding_complete: true 
      },
    })

    return Response.json({
      success: true,
      monthly_income: updatedUser.monthly_income,
      message: 'Income updated successfully'
    })
  } catch (error) {
    console.error('Income update error:', error)
    return Response.json({ error: 'Failed to update income' }, { status: 500 })
  }
}