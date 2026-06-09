import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { reviews, reviewScores, employees, teams, dimensions, teamVacancy } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { calcTeamCoeffs } from '@/lib/coeff'
import type { Review } from '@/db/schema'

export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const teamFilter = searchParams.get('team')
  const nameFilter = searchParams.get('name')?.toLowerCase()

  const allReviews = db.select().from(reviews).all()
  const monthsSet = new Set(allReviews.map(r => r.month))
  const months = [...monthsSet].sort()

  if (!month) return NextResponse.json({ months })

  const allTeams = db.select().from(teams).all()
  const allEmps = db.select().from(employees).all().filter(e => !e.removedAt)
  const allDims = db.select().from(dimensions).all()
  const monthRevs = allReviews.filter(r => r.month === month)
  const vacancies = db.select().from(teamVacancy).where(eq(teamVacancy.month, month)).all()
  const vacMap: Record<string, boolean> = {}
  vacancies.forEach(v => { vacMap[v.teamId] = !!v.isVacant })

  const result: Array<{
    teamName: string; leaderName: string; vacant: boolean; month: string
    members: Array<{ name: string; level: string; dimScores: string; totalScore: number; coeffLabel: string; coeffCls: string; up: boolean; payable: string }>
  }> = []

  for (const team of allTeams) {
    if (teamFilter && team.id !== teamFilter) continue

    let tMembers = allEmps.filter(e => e.teamId === team.id)
    if (nameFilter) tMembers = tMembers.filter(e => e.name.toLowerCase().includes(nameFilter))

    const reviewsMap = new Map<string, Review>()
    tMembers.forEach(e => {
      const rev = monthRevs.find(r => r.employeeId === e.id)
      if (rev) reviewsMap.set(e.id, rev)
    })
    const isVacant = !!vacMap[team.id]
    const coeffs = calcTeamCoeffs(tMembers.map(e => ({ id: e.id })), reviewsMap, isVacant)

    const members = tMembers
      .filter(e => {
        const rev = reviewsMap.get(e.id)
        return rev?.confirmed && rev.totalScore != null
      })
      .map(e => {
        const rev = reviewsMap.get(e.id)!
        const ci = coeffs.find(c => c.employeeId === e.id)

        // Get dimension scores
        const scores = db.select().from(reviewScores).where(eq(reviewScores.reviewId, rev.id)).all()
        const dimStrs = scores.map(s => {
          const dim = allDims.find(d => d.id === s.dimensionId)
          return dim ? `${dim.name}:${s.score}` : ''
        }).filter(Boolean).join(' / ')

        const coeff = ci?.coeff ?? 0
        const payable = e.perfFullAmount && coeff ? Math.round(e.perfFullAmount * coeff).toString() : '—'

        return {
          name: e.name,
          level: e.level,
          dimScores: dimStrs,
          totalScore: rev.totalScore!,
          coeffLabel: ci?.label || '—',
          coeffCls: ci?.cls || 'badge-gray',
          up: ci?.up || false,
          payable,
        }
      })
      .sort((a, b) => b.totalScore - a.totalScore)

    if (members.length) {
      result.push({ teamName: team.name, leaderName: team.leaderName, vacant: isVacant, month, members })
    }
  }

  return NextResponse.json({ months, teams: result })
}
