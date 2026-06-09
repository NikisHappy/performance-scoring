import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { reviews, reviewScores, dimensions, employees, teamVacancy } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// GET: Fetch reviews for a given month (optionally filtered by leaderId)
export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const leaderId = searchParams.get('leaderId')
  const employeeId = searchParams.get('employeeId')

  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  let query = db.select().from(reviews).where(eq(reviews.month, month))

  let results
  if (leaderId) {
    results = db.select().from(reviews)
      .where(and(eq(reviews.month, month), eq(reviews.leaderId, leaderId)))
      .all()
  } else if (employeeId) {
    results = db.select().from(reviews)
      .where(and(eq(reviews.month, month), eq(reviews.employeeId, employeeId)))
      .all()
  } else {
    results = db.select().from(reviews).where(eq(reviews.month, month)).all()
  }

  // Fetch scores for each review
  const enriched = results.map(rev => {
    const scores = db.select().from(reviewScores)
      .where(eq(reviewScores.reviewId, rev.id))
      .all()
    return { ...rev, scores }
  })

  return NextResponse.json({ reviews: enriched })
}

// POST: Create or update a review
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

  // Get employee's dimensions
  const emp = db.select().from(employees).where(eq(employees.id, employeeId)).get()
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const posLevel = getDimsKeyFromEmp(emp.pos, emp.level)
  const dims = db.select().from(dimensions)
    .where(eq(dimensions.posLevel, posLevel))
    .all()

  // Calculate total score
  let totalScore: number | null = null
  if (dimScores && dimScores.length === dims.length) {
    totalScore = 0
    dims.forEach((d, i) => {
      totalScore! += (dimScores[i] * d.weight) / 100
    })
    totalScore = Math.round(totalScore * 10) / 10
  }

  // Upsert review
  const existing = db.select().from(reviews)
    .where(and(eq(reviews.employeeId, employeeId), eq(reviews.month, month), eq(reviews.leaderId, leaderId)))
    .get()

  let reviewId: number

  if (existing) {
    db.update(reviews)
      .set({
        confirmed: confirmed ?? existing.confirmed,
        totalScore,
        customCoeff: customCoeff ?? existing.customCoeff,
      })
      .where(eq(reviews.id, existing.id))
      .run()
    reviewId = existing.id

    // Delete old scores
    db.delete(reviewScores).where(eq(reviewScores.reviewId, reviewId)).run()
  } else {
    const result = db.insert(reviews).values({
      employeeId,
      leaderId,
      month,
      confirmed: confirmed ?? false,
      totalScore,
      customCoeff,
    }).run()
    reviewId = Number(result.lastInsertRowid)
  }

  // Insert new scores
  if (dimScores && dimScores.length) {
    dims.forEach((d, i) => {
      if (dimScores[i] != null) {
        db.insert(reviewScores).values({
          reviewId,
          dimensionId: d.id,
          score: dimScores[i],
        }).run()
      }
    })
  }

  return NextResponse.json({ success: true, reviewId, totalScore })
}

// PUT: Submit all reviews for a month (leader)
export async function PUT(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { month, leaderId } = await request.json()
  if (!month || !leaderId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  db.update(reviews)
    .set({ submitted: true })
    .where(and(eq(reviews.month, month), eq(reviews.leaderId, leaderId)))
    .run()

  return NextResponse.json({ success: true })
}

function getDimsKeyFromEmp(pos: string, level: string): string {
  if (pos === '投手') return '投手_' + (level || '高级投手')
  if (pos === '内容') return '内容_AIGC'
  if (pos === '阿康') return '阿康_' + (level === 'AM' ? 'AM' : 'AE')
  if (pos === '策划') return '策划_I3'
  return ''
}
