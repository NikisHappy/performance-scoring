import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { employees, teams, reviews, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { hashSync } from 'bcryptjs'

// GET: List employees
export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')
  const type = searchParams.get('type')

  // Account management endpoints
  if (type === 'accounts') {
    const accounts = await db.select().from(users)
    return NextResponse.json({ accounts: accounts.map(a => ({ id: a.id, username: a.username, name: a.name, role: a.role, leaderId: a.leaderId })) })
  }

  let results
  if (teamId) {
    results = await db.select().from(employees).where(eq(employees.teamId, teamId))
  } else {
    results = await db.select().from(employees)
  }

  // Filter out removed employees unless requested
  const includeRemoved = searchParams.get('includeRemoved') === 'true'
  if (!includeRemoved) {
    results = results.filter(e => !e.removedAt)
  }

  // Include extra info (team/leader names, months)
  const includeExtra = searchParams.get('includeExtra') === 'true'
  if (includeExtra) {
    const allTeams = await db.select().from(teams)
    const allReviews = await db.select().from(reviews)
    const monthsSet = new Set(allReviews.map(r => r.month))
    const months = [...monthsSet].sort()

    const enriched = results.map(e => {
      const team = allTeams.find(t => t.id === e.teamId)
      return { ...e, teamName: team?.name || '', leaderName: team?.leaderName || '' }
    })
    return NextResponse.json({ employees: enriched, months })
  }

  return NextResponse.json({ employees: results })
}

// POST: Add employee or manage accounts
export async function POST(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin' && session.role !== 'hr') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const body = await request.json()

  // Account management
  if (type === 'account') {
    const { username, password, role, leaderId } = body
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })
    const pw = hashSync(password || '123456', 10)
    await db.insert(users).values({ username, password: pw, name: username, role: role || 'hr', leaderId: leaderId || null })
    return NextResponse.json({ success: true })
  }

  if (type === 'resetPwd') {
    const { username } = body
    const pw = hashSync('123456', 10)
    await db.update(users).set({ password: pw }).where(eq(users.username, username))
    return NextResponse.json({ success: true })
  }

  if (type === 'deleteAccount') {
    const { username } = body
    await db.delete(users).where(eq(users.username, username))
    return NextResponse.json({ success: true })
  }

  // Add employee
  const { name, pos, level, leaderId: empLeaderId, empNo, dept, joinDate, perfFullAmount, entity } = body

  if (!name || !pos || !level) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Determine teamId based on pos and leaderId
  const allTeams = await db.select().from(teams)
  const leaderTeams = allTeams.filter(t => t.leaderId === (empLeaderId || 'l1'))
  const posTeamMap: Record<string, string> = { '投手': '投手组', '内容': '内容组', '阿康': '阿康组', '策划': '策划组' }
  const targetTeam = leaderTeams.find(t => t.name === posTeamMap[pos]) || leaderTeams[0]
  const teamId = targetTeam?.id || 't1'

  const id = 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)

  await db.insert(employees).values({
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
  })

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

  await db.update(employees)
    .set({
      removedAt: new Date().toISOString(),
      leaveDate: leaveDate || new Date().toISOString().slice(0, 10),
    })
    .where(eq(employees.id, id))
    

  return NextResponse.json({ success: true })
}
