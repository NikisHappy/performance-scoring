import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { teamVacancy } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { teamId, month, isVacant } = await request.json()
  if (!teamId || !month) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const [existing] = await db.select().from(teamVacancy)
    .where(and(eq(teamVacancy.teamId, teamId), eq(teamVacancy.month, month)))

  if (existing) {
    await db.update(teamVacancy)
      .set({ isVacant: !!isVacant })
      .where(eq(teamVacancy.id, existing.id))
  } else {
    await db.insert(teamVacancy).values({ teamId, month, isVacant: !!isVacant })
  }

  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')

  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const vacancies = await db.select().from(teamVacancy)
    .where(eq(teamVacancy.month, month))

  return NextResponse.json({ vacancies })
}
