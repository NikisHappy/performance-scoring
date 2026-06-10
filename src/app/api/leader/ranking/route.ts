import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { reviews, employees, teams, teamVacancy } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { calcTeamCoeffs } from '@/lib/coeff'
import type { Review } from '@/db/schema'

export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')

  // Get all months that this leader has reviews
  const leaderId = session.leaderId
  if (!leaderId) return NextResponse.json({ error: 'Not a leader' }, { status: 403 })

  const allReviews = await db.select().from(reviews).where(eq(reviews.leaderId, leaderId))
  const monthsSet = new Set(allReviews.map(r => r.month))
  const months = [...monthsSet].sort()

  if (!month) {
    return NextResponse.json({ months })
  }

  // Get ranking for specific month
  const leaderTeams = await db.select().from(teams).where(eq(teams.leaderId, leaderId))
  const allEmps = await db.select().from(employees)
  const monthRevs = await db.select().from(reviews)
    .where(and(eq(reviews.leaderId, leaderId), eq(reviews.month, month)))
    
  const vacancies = await db.select().from(teamVacancy).where(eq(teamVacancy.month, month))

  const vacMap: Record<string, boolean> = {}
  vacancies.forEach(v => { vacMap[v.teamId] = !!v.isVacant })

  const rankings: Record<string, Array<{
    employeeId: string; name: string; level: string; teamId: string; teamName: string;
    totalScore: number; coeff: number | null; coeffLabel: string; coeffCls: string; up: boolean
  }>> = {}

  for (const team of leaderTeams) {
    const teamMembers = allEmps.filter(e => {
      if (e.teamId !== team.id) return false
      if (!e.removedAt) return true
      if (!e.leaveDate) return true // no leave date recorded — keep history rather than hiding it
      return e.leaveDate.slice(0, 7) >= month
    })
    const reviewsMap = new Map<string, Review>()
    for (const emp of teamMembers) {
      const rev = monthRevs.find(r => r.employeeId === emp.id)
      if (rev) reviewsMap.set(emp.id, rev)
    }

    const isVacant = !!vacMap[team.id]
    const coeffs = calcTeamCoeffs(teamMembers.map(e => ({ id: e.id })), reviewsMap, isVacant)

    const ranked = teamMembers
      .filter(emp => {
        const rev = reviewsMap.get(emp.id)
        return rev?.confirmed && rev.totalScore != null
      })
      .map(emp => {
        const rev = reviewsMap.get(emp.id)!
        const ci = coeffs.find(c => c.employeeId === emp.id)
        return {
          employeeId: emp.id,
          name: emp.name,
          level: emp.level,
          teamId: team.id,
          teamName: team.name,
          totalScore: rev.totalScore!,
          coeff: ci?.coeff ?? null,
          coeffLabel: ci?.label ?? '—',
          coeffCls: ci?.cls ?? 'badge-gray',
          up: ci?.up ?? false,
        }
      })
      .sort((a, b) => b.totalScore - a.totalScore)

    if (ranked.length) {
      rankings[team.name] = ranked
    }
  }

  return NextResponse.json({ months, rankings, vacancies: vacMap })
}
