import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { employees } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET: List employees
export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')

  let results
  if (teamId) {
    results = db.select().from(employees).where(eq(employees.teamId, teamId)).all()
  } else {
    results = db.select().from(employees).all()
  }

  // Filter out removed employees unless requested
  const includeRemoved = searchParams.get('includeRemoved') === 'true'
  if (!includeRemoved) {
    results = results.filter(e => !e.removedAt)
  }

  return NextResponse.json({ employees: results })
}

// POST: Add employee
export async function POST(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin' && session.role !== 'hr') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, pos, level, teamId, empNo, dept, joinDate, perfFullAmount, entity } = body

  if (!name || !pos || !level || !teamId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const id = 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)

  db.insert(employees).values({
    id,
    name,
    pos,
    level,
    teamId,
    empNo: empNo || null,
    dept: dept || '北京破圈',
    joinDate: joinDate || null,
    perfFullAmount: perfFullAmount ? parseFloat(perfFullAmount) : null,
    entity: entity || null,
  }).run()

  return NextResponse.json({ success: true, id })
}

// DELETE: Remove employee (soft delete)
export async function DELETE(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin' && session.role !== 'hr') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, leaveDate } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  db.update(employees)
    .set({
      removedAt: new Date().toISOString(),
      leaveDate: leaveDate || new Date().toISOString().slice(0, 10),
    })
    .where(eq(employees.id, id))
    .run()

  return NextResponse.json({ success: true })
}
