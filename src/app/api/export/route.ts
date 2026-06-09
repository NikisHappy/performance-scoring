import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { employees, reviews, teams, teamVacancy } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { calcTeamCoeffs } from '@/lib/coeff'
import type { Review } from '@/db/schema'

export async function GET(request: NextRequest) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin' && session.role !== 'hr') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const [year, mon] = month.split('-').map(Number)
  const daysInMonth = new Date(year, mon, 0).getDate()
  const monthStart = new Date(year, mon - 1, 1)
  const monthEnd = new Date(year, mon - 1, daysInMonth)

  // Count working days
  let workDays = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, mon - 1, d).getDay()
    if (dow !== 0 && dow !== 6) workDays++
  }

  function countWorkDaysBetween(start: Date, end: Date): number {
    let count = 0
    const cur = new Date(start)
    while (cur <= end) {
      const dow = cur.getDay()
      if (dow !== 0 && dow !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    return count
  }

  const allEmps = db.select().from(employees).all()
  const allTeams = db.select().from(teams).all()
  const monthReviews = db.select().from(reviews).where(eq(reviews.month, month)).all()
  const vacancies = db.select().from(teamVacancy).where(eq(teamVacancy.month, month)).all()

  const rows: Record<string, unknown>[] = []

  for (const emp of allEmps) {
    const team = allTeams.find(t => t.id === emp.teamId)
    if (!team) continue

    const rev = monthReviews.find(r => r.employeeId === emp.id)

    // Calculate coefficient
    let coeff: number | null = null
    if (rev?.confirmed && rev.totalScore != null) {
      const teamMembers = allEmps.filter(e => e.teamId === emp.teamId && !e.removedAt)
      const reviewsMap = new Map<string, Review>()
      for (const tm of teamMembers) {
        const tmRev = monthReviews.find(r => r.employeeId === tm.id)
        if (tmRev) reviewsMap.set(tm.id, tmRev)
      }
      const isVacant = vacancies.some(v => v.teamId === emp.teamId && v.isVacant)
      const coeffs = calcTeamCoeffs(teamMembers.map(e => ({ id: e.id })), reviewsMap, isVacant)
      const ci = coeffs.find(c => c.employeeId === emp.id)
      coeff = ci?.coeff ?? null
    }

    // Calculate attendance
    let joinAbsence = 0
    if (emp.joinDate) {
      const jd = new Date(emp.joinDate)
      if (jd.getFullYear() === year && jd.getMonth() === mon - 1 && jd.getDate() > 1) {
        const beforeJoin = new Date(year, mon - 1, jd.getDate() - 1)
        joinAbsence = countWorkDaysBetween(monthStart, beforeJoin)
      }
    }

    let leaveAbsence = 0
    if (emp.leaveDate) {
      const ld = new Date(emp.leaveDate)
      if (ld.getFullYear() === year && ld.getMonth() === mon - 1 && ld.getDate() < daysInMonth) {
        const afterLeave = new Date(year, mon - 1, ld.getDate() + 1)
        leaveAbsence = countWorkDaysBetween(afterLeave, monthEnd)
      }
    }

    const normalDays = workDays - joinAbsence - leaveAbsence

    rows.push({
      '工号': emp.empNo || '',
      '姓名': emp.name,
      '入职日期': emp.joinDate || '',
      '离职日期': emp.leaveDate || '',
      '法人主体': emp.entity || '',
      '一级部门': emp.dept || '北京破圈',
      '奖金内容': '季度绩效奖金（月度发放）',
      '入职缺勤': joinAbsence || '',
      '离职缺勤': leaveAbsence || '',
      '季度绩效（全额）': emp.perfFullAmount || '',
      '本月正常出勤天数': normalDays,
      '本月绩效系数': coeff ?? '',
      '本月发放金额': (emp.perfFullAmount && coeff) ? Math.round(emp.perfFullAmount * coeff) : '',
    })
  }

  return NextResponse.json({
    rows,
    meta: {
      month,
      workDays,
      periodStart: `${year}年${mon}月1日`,
      periodEnd: `${year}年${mon}月${daysInMonth}日`,
    },
  })
}
