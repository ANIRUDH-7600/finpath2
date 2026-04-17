import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { name, monthly_income, risk_appetite, phone, email } = await req.json()

    const user = await prisma.user.create({
      data: {
        name,
        monthly_income: monthly_income ?? 0,
        risk_appetite: risk_appetite ?? 3,
        phone,
        email,
        onboarding_complete: true,
      },
    })

    return Response.json(user)
  } catch (error) {
    console.error('users POST error:', error)
    return Response.json({ error: 'Failed to create user' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user_id, monthly_income, risk_appetite, phone } = await req.json()

    const user = await prisma.user.update({
      where: { id: user_id },
      data: {
        monthly_income,
        risk_appetite,
        phone,
        onboarding_complete: true,
      },
    })

    return Response.json(user)
  } catch (error) {
    console.error('users PATCH error:', error)
    return Response.json({ error: 'Failed to update user' }, { status: 500 })
  }
}