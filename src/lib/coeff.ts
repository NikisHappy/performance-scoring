import type { Review } from '@/db/schema'

/**
 * Coefficient calculation rules:
 * - Score >= 70: coefficient = 1.0
 * - Top 30% among >=70 scorers (per team): coefficient = 1.2 (unless vacancy)
 * - Score < 70: custom coefficient between 0.5-0.8 (default 0.8)
 * - Vacancy mode: no uplift, all >=70 get 1.0
 */

export interface CoeffResult {
  employeeId: string
  coeff: number | null
  label: string
  cls: string
  up: boolean
}

export function calcTeamCoeffs(
  teamMembers: Array<{ id: string }>,
  reviewsMap: Map<string, Review>,
  isVacant: boolean
): CoeffResult[] {
  const results: CoeffResult[] = teamMembers.map(emp => {
    const rev = reviewsMap.get(emp.id)
    if (!rev?.confirmed || rev.totalScore == null) {
      return { employeeId: emp.id, coeff: null, label: '—', cls: 'badge-gray', up: false }
    }
    if (rev.totalScore < 70) {
      const custom = rev.customCoeff ?? 0.8
      return { employeeId: emp.id, coeff: custom, label: custom.toFixed(1), cls: 'badge-red', up: false }
    }
    return { employeeId: emp.id, coeff: 1.0, label: '1.0', cls: 'badge-amber', up: false }
  })

  if (isVacant) {
    return results.map(r => ({
      ...r,
      up: false,
      coeff: r.coeff == null ? null : (r.coeff < 1 ? r.coeff : 1.0),
      label: r.coeff == null ? '—' : (r.coeff < 1 ? r.label : '1.0'),
      cls: r.coeff == null ? 'badge-gray' : (r.coeff < 1 ? 'badge-red' : 'badge-amber'),
    }))
  }

  // Top 30% among >=70 scorers
  const eligible = results
    .filter(r => {
      const rev = reviewsMap.get(r.employeeId)
      return rev && rev.totalScore != null && rev.totalScore >= 70
    })
    .sort((a, b) => {
      const ra = reviewsMap.get(a.employeeId)!
      const rb = reviewsMap.get(b.employeeId)!
      return (rb.totalScore ?? 0) - (ra.totalScore ?? 0)
    })

  const upCount = Math.floor(eligible.length * 0.3)
  const upIds = new Set(eligible.slice(0, upCount).map(r => r.employeeId))

  return results.map(r =>
    upIds.has(r.employeeId)
      ? { ...r, coeff: 1.2, label: '1.2', cls: 'badge-green', up: true }
      : r
  )
}

export function getDimsKey(pos: string, level: string): string {
  if (pos === '投手') return '投手_' + (level || '高级投手')
  if (pos === '内容') return '内容_AIGC'
  if (pos === '阿康') return '阿康_' + (level === 'AM' ? 'AM' : 'AE')
  if (pos === '策划') return '策划_I3'
  return ''
}
