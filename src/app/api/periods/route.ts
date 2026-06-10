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

  // Get period statuses (may include manually-created future periods not yet in reviews)
  const statuses = await db.select().from(periodStatus)
  statuses.forEach(s => monthsSet.add(s.month))
  const statusMap: Record<string, typeof statuses[number]> = {}
  statuses.forEach(s => { statusMap[s.month] = s })

  const months = [...monthsSet].sort()

  // Build result: all months with their open/closed status and metadata
  const periods = months.map(m => {
    const s = statusMap[m]
    return {
      month: m,
      isOpen: s?.isOpen ?? false, // default closed for past months without a record
      name: s?.name ?? null,
      startDate: s?.startDate ?? null,
      endDate: s?.endDate ?? null,
    }
  })

  return NextResponse.json({ periods })
}

export async function POST(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin' && session.role !== 'hr') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { month, isOpen, name, startDate, endDate } = await request.json()
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  // Only overwrite metadata fields that were actually provided.
  const meta: Record<string, unknown> = {}
  if (name !== undefined) meta.name = name
  if (startDate !== undefined) meta.startDate = startDate
  if (endDate !== undefined) meta.endDate = endDate

  // Upsert
  const [existing] = await db.select().from(periodStatus).where(eq(periodStatus.month, month))
  if (existing) {
    await db.update(periodStatus).set({ isOpen, ...meta }).where(eq(periodStatus.id, existing.id))
  } else {
    await db.insert(periodStatus).values({ month, isOpen, ...meta })
  }

  return NextResponse.json({ success: true, month, isOpen })
}
