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
  const teamFilter = searchParams.get('team')
  const nameFilter = searchParams.get('name')?.toLowerCase()

  const allReviews = db.select().from(reviews).all()
  const monthsSet = new Set(allReviews.map(r => r.month))
  const allMonths = [...monthsSet].sort()
  const months = allMonths.slice(-6)

  const allTeams = db.select().from(teams).all()
  const allEmps = db.select().from(employees).all().filter(e => !e.removedAt)

  // Filter employees
  let filteredEmps = allEmps
  if (teamFilter) filteredEmps = filteredEmps.filter(e => e.teamId === teamFilter)
  if (nameFilter) filteredEmps = filteredEmps.filter(e => e.name.toLowerCase().includes(nameFilter))

  // Avg by month
  const avgByMonth = months.map(m => {
    let sum = 0, cnt = 0
    filteredEmps.forEach(emp => {
      const rev = allReviews.find(r => r.month === m && r.employeeId === emp.id)
      if (rev?.confirmed && rev.totalScore != null) { sum += rev.totalScore; cnt++ }
    })
    return { month: m, avg: cnt ? sum / cnt : null }
  })

  // Distribution by month
  const distByMonth = months.map(m => {
    const d = { month: m, s90: 0, s80: 0, s70: 0, s60: 0, sLow: 0 }
    filteredEmps.forEach(emp => {
      const rev = allReviews.find(r => r.month === m && r.employeeId === emp.id)
      if (rev?.confirmed && rev.totalScore != null) {
        if (rev.totalScore >= 90) d.s90++
        else if (rev.totalScore >= 80) d.s80++
        else if (rev.totalScore >= 70) d.s70++
        else if (rev.totalScore >= 60) d.s60++
        else d.sLow++
      }
    })
    return d
  })

  // Member trends
  const memberTrends = filteredEmps.map(emp => ({
    name: emp.name,
    scores: months.map(m => {
      const rev = allReviews.find(r => r.month === m && r.employeeId === emp.id)
      return rev?.confirmed && rev.totalScore != null ? rev.totalScore : null
    })
  }))

  // Team avgs
  const filteredTeams = allTeams.filter(t => !teamFilter || t.id === teamFilter)
  const teamAvgs = filteredTeams.map(team => {
    const tMembers = filteredEmps.filter(e => e.teamId === team.id)
    const avgs = months.map(m => {
      let sum = 0, cnt = 0
      tMembers.forEach(emp => {
        const rev = allReviews.find(r => r.month === m && r.employeeId === emp.id)
        if (rev?.confirmed && rev.totalScore != null) { sum += rev.totalScore; cnt++ }
      })
      return cnt ? sum / cnt : null
    })
    return { teamName: team.name, leaderName: team.leaderName, avgs }
  })

  return NextResponse.json({ months, avgByMonth, distByMonth, memberTrends, teamAvgs })
}
