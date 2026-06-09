import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { reviews, employees, teams } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leaderId = session.leaderId
  if (!leaderId) return NextResponse.json({ error: 'Not a leader' }, { status: 403 })

  const allReviews = db.select().from(reviews).where(eq(reviews.leaderId, leaderId)).all()
  const leaderTeams = db.select().from(teams).where(eq(teams.leaderId, leaderId)).all()
  const allEmps = db.select().from(employees).all()

  const teamIds = new Set(leaderTeams.map(t => t.id))
  const myEmps = allEmps.filter(e => teamIds.has(e.teamId) && !e.removedAt)

  // Get last 6 months
  const monthsSet = new Set(allReviews.map(r => r.month))
  const months = [...monthsSet].sort().slice(-6)

  if (!months.length) {
    return NextResponse.json({ months: [], members: [], distribution: [] })
  }

  // Build member trend data
  const members = myEmps.map(emp => {
    const team = leaderTeams.find(t => t.id === emp.teamId)
    const scores = months.map(m => {
      const rev = allReviews.find(r => r.employeeId === emp.id && r.month === m && r.confirmed)
      return rev?.totalScore ?? null
    })
    return { id: emp.id, name: emp.name, team: team?.name || '', scores }
  })

  // Build distribution data
  const distribution = months.map(m => {
    const d = { month: m, s90: 0, s80: 0, s70: 0, s60: 0, sLow: 0 }
    myEmps.forEach(emp => {
      const rev = allReviews.find(r => r.employeeId === emp.id && r.month === m && r.confirmed)
      if (rev?.totalScore != null) {
        if (rev.totalScore >= 90) d.s90++
        else if (rev.totalScore >= 80) d.s80++
        else if (rev.totalScore >= 70) d.s70++
        else if (rev.totalScore >= 60) d.s60++
        else d.sLow++
      }
    })
    return d
  })

  return NextResponse.json({ months, members, distribution })
}
