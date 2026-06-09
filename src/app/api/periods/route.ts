import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { periodStatus, reviews } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all months from reviews
  const allReviews = await db.select().from(reviews)
  const monthsSet = new Set(allReviews.map(r => r.month))
  const months = [...monthsSet].sort()

  // Get period statuses
  const statuses = await db.select().from(periodStatus)
  const statusMap: Record<string, boolean> = {}
  statuses.forEach(s => { statusMap[s.month] = s.isOpen ?? true })

  // Build result: all months with their open/closed status
  const periods = months.map(m => ({
    month: m,
    isOpen: statusMap[m] ?? false, // default closed for past months
  }))

  return NextResponse.json({ periods })
}

export async function POST(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { month, isOpen } = await request.json()
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  // Upsert
  const [existing] = await db.select().from(periodStatus).where(eq(periodStatus.month, month))
  if (existing) {
    await db.update(periodStatus).set({ isOpen }).where(eq(periodStatus.id, existing.id))
  } else {
    await db.insert(periodStatus).values({ month, isOpen })
  }

  return NextResponse.json({ success: true, month, isOpen })
}
