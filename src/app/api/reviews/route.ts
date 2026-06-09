import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { reviews, reviewScores, dimensions, employees, periodStatus } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const leaderId = searchParams.get('leaderId')
  const employeeId = searchParams.get('employeeId')

  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  let results
  if (leaderId) {
    results = await db.select().from(reviews)
      .where(and(eq(reviews.month, month), eq(reviews.leaderId, leaderId)))
  } else if (employeeId) {
    results = await db.select().from(reviews)
      .where(and(eq(reviews.month, month), eq(reviews.employeeId, employeeId)))
  } else if (session.role === 'leader' && session.leaderId) {
    // Leader can only see their own reviews
    results = await db.select().from(reviews)
      .where(and(eq(reviews.month, month), eq(reviews.leaderId, session.leaderId)))
  } else {
    results = await db.select().from(reviews).where(eq(reviews.month, month))
  }

  const enriched = await Promise.all(results.map(async (rev) => {
    const scores = await db.select().from(reviewScores)
      .where(eq(reviewScores.reviewId, rev.id))
    return { ...rev, scores }
  }))

  return NextResponse.json({ reviews: enriched })
}

export async function POST(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.role !== 'leader' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { employeeId, month, dimScores, confirmed, customCoeff } = body
  const leaderId = session.leaderId

  if (!employeeId || !month || !leaderId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Check if period is open
  const [period] = await db.select().from(periodStatus).where(eq(periodStatus.month, month))
  if (period && !period.isOpen) {
    return NextResponse.json({ error: '该月份考评周期已关闭，无法修改数据' }, { status: 403 })
  }

  const [emp] = await db.select().from(employees).where(eq(employees.id, employeeId))
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const posLevel = getDimsKeyFromEmp(emp.pos, emp.level)
  const dims = await db.select().from(dimensions).where(eq(dimensions.posLevel, posLevel))

  let totalScore: number | null = null
  if (dimScores && dimScores.length === dims.length) {
    totalScore = 0
    dims.forEach((d, i) => {
      totalScore! += (dimScores[i] * d.weight) / 100
    })
    totalScore = Math.round(totalScore * 10) / 10
  }

  const [existing] = await db.select().from(reviews)
    .where(and(eq(reviews.employeeId, employeeId), eq(reviews.month, month), eq(reviews.leaderId, leaderId)))

  let reviewId: number

  if (existing) {
    await db.update(reviews)
      .set({
        confirmed: confirmed ?? existing.confirmed,
        totalScore,
        customCoeff: customCoeff ?? existing.customCoeff,
      })
      .where(eq(reviews.id, existing.id))
    reviewId = existing.id
    await db.delete(reviewScores).where(eq(reviewScores.reviewId, reviewId))
  } else {
    const [inserted] = await db.insert(reviews).values({
      employeeId,
      leaderId,
      month,
      confirmed: confirmed ?? false,
      totalScore,
      customCoeff,
    }).returning()
    reviewId = inserted.id
  }

  if (dimScores && dimScores.length) {
    for (let i = 0; i < dims.length; i++) {
      if (dimScores[i] != null) {
        await db.insert(reviewScores).values({
          reviewId,
          dimensionId: dims[i].id,
          score: dimScores[i],
        })
      }
    }
  }

  return NextResponse.json({ success: true, reviewId, totalScore })
}

export async function PUT(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { month, leaderId } = await request.json()
  if (!month || !leaderId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await db.update(reviews)
    .set({ submitted: true })
    .where(and(eq(reviews.month, month), eq(reviews.leaderId, leaderId)))

  return NextResponse.json({ success: true })
}

function getDimsKeyFromEmp(pos: string, level: string): string {
  if (pos === '投手') return '投手_' + (level || '高级投手')
  if (pos === '内容') return '内容_AIGC'
  if (pos === '阿康') return '阿康_' + (level === 'AM' ? 'AM' : 'AE')
  if (pos === '策划') return '策划_I3'
  return ''
}
