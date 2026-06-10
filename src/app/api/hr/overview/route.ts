import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { reviews, employees, teams, teamVacancy } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { calcTeamCoeffs } from '@/lib/coeff'
import type { Review } from '@/db/schema'

export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const teamFilter = searchParams.get('team')
  const nameFilter = searchParams.get('name')?.toLowerCase()

  // Get all months
  const allReviews = await db.select().from(reviews)
  const monthsSet = new Set(allReviews.map(r => r.month))
  const months = [...monthsSet].sort()

  if (!month) return NextResponse.json({ months })

  const allTeams = await db.select().from(teams)
  // Keep removed employees, but only count them in months up to (and including) their leave month.
  const allEmpsRaw = await db.select().from(employees)
  const allEmps = allEmpsRaw.filter(e => {
    if (!e.removedAt) return true
    if (!e.leaveDate) return true // no leave date recorded — keep history rather than hiding it
    return e.leaveDate.slice(0, 7) >= month
  })
  const monthRevs = allReviews.filter(r => r.month === month)
  const vacancies = await db.select().from(teamVacancy).where(eq(teamVacancy.month, month))
  const vacMap: Record<string, boolean> = {}
  vacancies.forEach(v => { vacMap[v.teamId] = !!v.isVacant })

  // Filter employees
  let filteredEmps = allEmps
  if (teamFilter) filteredEmps = filteredEmps.filter(e => e.teamId === teamFilter)
  if (nameFilter) filteredEmps = filteredEmps.filter(e => e.name.toLowerCase().includes(nameFilter))

  let confirmedCount = 0
  let scoreSum = 0
  let upCount = 0
  const allRanked: Array<{ name: string; team: string; leader: string; score: number; coeffLabel: string; coeffCls: string; up: boolean }> = []

  // Team progress
  const teamProgress = allTeams
    .filter(t => !teamFilter || t.id === teamFilter)
    .map(t => {
      const tMembers = filteredEmps.filter(e => e.teamId === t.id)
      const reviewsMap = new Map<string, Review>()
      tMembers.forEach(e => {
        const rev = monthRevs.find(r => r.employeeId === e.id)
        if (rev) reviewsMap.set(e.id, rev)
      })
      const isVacant = !!vacMap[t.id]
      const coeffs = calcTeamCoeffs(tMembers.map(e => ({ id: e.id })), reviewsMap, isVacant)

      let done = 0, sum = 0
      tMembers.forEach(e => {
        const rev = reviewsMap.get(e.id)
        if (rev?.confirmed && rev.totalScore != null) {
          done++
          sum += rev.totalScore
          confirmedCount++
          scoreSum += rev.totalScore
          const ci = coeffs.find(c => c.employeeId === e.id)
          if (ci?.up) upCount++
          allRanked.push({
            name: e.name,
            team: t.name,
            leader: t.leaderName,
            score: rev.totalScore,
            coeffLabel: ci?.label || '—',
            coeffCls: ci?.cls || 'badge-gray',
            up: ci?.up || false,
          })
        }
      })

      const submitted = tMembers.length > 0 && tMembers.every(e => {
        const rev = monthRevs.find(r => r.employeeId === e.id)
        return rev?.submitted
      })

      return {
        name: t.name,
        leader: t.leaderName,
        total: tMembers.length,
        done,
        avg: done ? (sum / done).toFixed(1) : '—',
        vacant: isVacant,
        submitted,
      }
    })

  // Count submitted leaders
  const leaderIds = [...new Set(allTeams.map(t => t.leaderId))]
  const submittedLeaders = leaderIds.filter(lid => {
    const leaderRevs = monthRevs.filter(r => r.leaderId === lid)
    return leaderRevs.length > 0 && leaderRevs.every(r => r.submitted)
  }).length

  allRanked.sort((a, b) => b.score - a.score)

  return NextResponse.json({
    months,
    totalEmployees: filteredEmps.length,
    confirmedCount,
    submittedLeaders,
    totalLeaders: leaderIds.length,
    avgScore: confirmedCount ? (scoreSum / confirmedCount).toFixed(1) : '—',
    upCount,
    teamProgress,
    allRanked,
  })
}
