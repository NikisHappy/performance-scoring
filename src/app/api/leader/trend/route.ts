import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { reviews, employees, teams } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leaderId = session.leaderId
  if (!leaderId) return NextResponse.json({ error: 'Not a leader' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const monthsParam = searchParams.get('months')
  const onlyMonths = searchParams.get('onlyMonths')

  const allReviews = await db.select().from(reviews).where(eq(reviews.leaderId, leaderId))
  const monthsSet = new Set(allReviews.map(r => r.month))
  const allMonthsSorted = [...monthsSet].sort()

  if (onlyMonths) {
    return NextResponse.json({ allMonths: allMonthsSorted })
  }

  const months = monthsParam
    ? monthsParam.split(',').filter(m => monthsSet.has(m)).sort()
    : allMonthsSorted.slice(-6)

  if (!months.length) {
    return NextResponse.json({ months: [], allMonths: allMonthsSorted, members: [] })
  }

  const leaderTeams = await db.select().from(teams).where(eq(teams.leaderId, leaderId))
  const allEmps = await db.select().from(employees)
  const teamIds = new Set(leaderTeams.map(t => t.id))
  // Keep removed employees so their historical trend (up to leave month) stays visible.
  const myEmps = allEmps.filter(e => teamIds.has(e.teamId))

  // employee counts toward a given month if active or left on/after that month
  const activeInMonth = (emp: typeof allEmps[number], month: string) => {
    if (!emp.removedAt) return true
    if (!emp.leaveDate) return true // no leave date recorded — keep history rather than hiding it
    return emp.leaveDate.slice(0, 7) >= month
  }

  // Build member trend data (drop members who already left before the entire selected range)
  const members = myEmps
    .filter(emp => months.some(m => activeInMonth(emp, m)))
    .map(emp => {
      const team = leaderTeams.find(t => t.id === emp.teamId)
      const scores = months.map(m => {
        const rev = allReviews.find(r => r.employeeId === emp.id && r.month === m && r.confirmed)
        return rev?.totalScore ?? null
      })
      return { id: emp.id, name: emp.name, team: team?.name || '', scores }
    })
    .filter(m => !m.scores.every(s => s === null))

  return NextResponse.json({ months, allMonths: allMonthsSorted, members })
}
