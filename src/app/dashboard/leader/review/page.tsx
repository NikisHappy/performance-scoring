'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Employee {
  id: string
  name: string
  pos: string
  level: string
  teamId: string
}

interface Dimension {
  id: number
  posLevel: string
  name: string
  description: string
  weight: number
  category: string
}

interface ReviewData {
  id: number
  employeeId: string
  totalScore: number | null
  confirmed: boolean
  customCoeff: number | null
  scores: Array<{ dimensionId: number; score: number }>
}

interface Team {
  id: string
  name: string
  leaderId: string
}

const COLORS = ['#4f6ef7', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e', '#eab308', '#dc2626', '#7c3aed', '#059669']

function getDimsKey(pos: string, level: string): string {
  if (pos === '投手') return '投手_' + (level || '高级投手')
  if (pos === '内容') return '内容_AIGC'
  if (pos === '阿康') return '阿康_' + (level === 'AM' ? 'AM' : 'AE')
  if (pos === '策划') return '策划_I3'
  return ''
}

function curMonth(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export default function LeaderReviewPage() {
  const router = useRouter()
  const [month, setMonth] = useState(curMonth())
  const [employees, setEmployees] = useState<Employee[]>([])
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [reviewsMap, setReviewsMap] = useState<Map<string, ReviewData>>(new Map())
  const [teams, setTeams] = useState<Team[]>([])
  const [vacancies, setVacancies] = useState<Record<string, boolean>>({})
  const [localScores, setLocalScores] = useState<Record<string, Record<number, number | null>>>({})
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const [user, setUser] = useState<{ name: string; leaderId: string } | null>(null)
  const [filterTeam, setFilterTeam] = useState('')
  const [filterName, setFilterName] = useState('')
  const [filterStatus, setFilterStatus] = useState('')  // '' | 'done' | 'pending'

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const loadData = useCallback(async () => {
    const [meRes, empRes, dimRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/employees'),
      fetch('/api/dimensions'),
    ])
    const me = await meRes.json()
    const empData = await empRes.json()
    const dimData = await dimRes.json()

    setUser(me.user)
    setEmployees(empData.employees)
    setDimensions(dimData.dimensions)
    setTeams(dimData.teams || [])

    // Load reviews and vacancies for month
    await loadMonthData(me.user.leaderId)
  }, [])

  const loadMonthData = async (leaderId?: string) => {
    const lid = leaderId || user?.leaderId
    if (!lid) return

    const [revRes, vacRes] = await Promise.all([
      fetch(`/api/reviews?month=${month}&leaderId=${lid}`),
      fetch(`/api/vacancy?month=${month}`),
    ])
    const revData = await revRes.json()
    const vacData = await vacRes.json()

    const map = new Map<string, ReviewData>()
    for (const rev of revData.reviews) {
      map.set(rev.employeeId, rev)
    }
    setReviewsMap(map)

    const vac: Record<string, boolean> = {}
    for (const v of vacData.vacancies) {
      vac[v.teamId] = v.isVacant
    }
    setVacancies(vac)

    // Initialize local scores from reviews
    const ls: Record<string, Record<number, number | null>> = {}
    for (const [empId, rev] of map) {
      ls[empId] = {}
      for (const s of rev.scores) {
        ls[empId][s.dimensionId] = s.score
      }
    }
    setLocalScores(ls)
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (user) {
      loadMonthData()
    }
  }, [month])

  function getEmpDims(emp: Employee): Dimension[] {
    const key = getDimsKey(emp.pos, emp.level)
    return dimensions.filter(d => d.posLevel === key)
  }

  function calcTotalScore(emp: Employee): number | null {
    const dims = getEmpDims(emp)
    const scores = localScores[emp.id]
    if (!scores) return null
    const allFilled = dims.every(d => scores[d.id] != null)
    if (!allFilled) return null
    let total = 0
    dims.forEach(d => {
      total += (scores[d.id]! * d.weight) / 100
    })
    return Math.round(total * 10) / 10
  }

  function handleScoreChange(empId: string, dimId: number, value: string) {
    const v = value === '' ? null : parseInt(value)
    if (v !== null && (isNaN(v) || v < 0 || v > 100)) return

    setLocalScores(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [dimId]: v },
    }))
  }

  async function confirmEmployee(empId: string) {
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    const dims = getEmpDims(emp)
    const scores = localScores[empId]
    if (!scores) return

    const dimScores = dims.map(d => scores[d.id])
    if (dimScores.some(s => s == null)) return

    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: empId,
        month,
        dimScores,
        confirmed: true,
      }),
    })

    showToast('已确认', 'green')
    loadMonthData()
  }

  async function editEmployee(empId: string) {
    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: empId,
        month,
        dimScores: Object.values(localScores[empId] || {}),
        confirmed: false,
      }),
    })
    showToast('已解锁，可修改评分', 'green')
    loadMonthData()
  }

  async function setCustomCoeff(empId: string, value: string) {
    const v = parseFloat(value)
    if (isNaN(v) || v < 0.5 || v > 0.8) return
    const emp = employees.find(e => e.id === empId)
    if (!emp) return
    const dims = getEmpDims(emp)
    const scores = localScores[empId]
    const dimScores = dims.map(d => scores?.[d.id] ?? 0)

    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: empId,
        month,
        dimScores,
        confirmed: true,
        customCoeff: Math.round(v * 10) / 10,
      }),
    })
    loadMonthData()
  }

  async function toggleVacancy(teamId: string, isVacant: boolean) {
    await fetch('/api/vacancy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, month, isVacant }),
    })
    setVacancies(prev => ({ ...prev, [teamId]: isVacant }))
    loadMonthData()
  }

  async function submitAll() {
    if (!user) return
    await fetch('/api/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, leaderId: user.leaderId }),
    })
    showToast('全部提交成功', 'green')
    router.push('/dashboard/leader/ranking')
  }

  // Apply filters
  let filteredEmployees = employees
  if (filterTeam) filteredEmployees = filteredEmployees.filter(e => e.teamId === filterTeam)
  if (filterName) filteredEmployees = filteredEmployees.filter(e => e.name.includes(filterName))
  if (filterStatus === 'done') filteredEmployees = filteredEmployees.filter(e => reviewsMap.get(e.id)?.confirmed)
  if (filterStatus === 'pending') filteredEmployees = filteredEmployees.filter(e => !reviewsMap.get(e.id)?.confirmed)

  // Group employees by team
  const teamGroups: Record<string, Employee[]> = {}
  filteredEmployees.forEach(emp => {
    if (!teamGroups[emp.teamId]) teamGroups[emp.teamId] = []
    teamGroups[emp.teamId].push(emp)
  })

  const confirmedCount = filteredEmployees.filter(e => reviewsMap.get(e.id)?.confirmed).length
  const avgScore = (() => {
    let sum = 0, cnt = 0
    filteredEmployees.forEach(e => {
      const rev = reviewsMap.get(e.id)
      if (rev?.confirmed && rev.totalScore != null) { sum += rev.totalScore; cnt++ }
    })
    return cnt ? (sum / cnt).toFixed(1) : '—'
  })()

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold mb-1">评分打分</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>
          {user?.name} · 北京破圈 · {employees.length}名成员
        </p>
      </div>

      <div className="flex gap-3.5 mb-6 flex-wrap items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>考核月份</label>
          <input
            type="month"
            className="input-field"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>组别</label>
          <select className="select-field" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
            <option value="">全部组别</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</label>
          <input type="text" className="input-field" placeholder="搜索姓名" style={{ width: 120 }}
            value={filterName} onChange={e => setFilterName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>打分状态</label>
          <select className="select-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="done">已完成</option>
            <option value="pending">未完成</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg p-3 px-4 mb-5 text-xs leading-7" style={{ background: '#f8fafc', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
        <b style={{ color: 'var(--text)' }}>评分规则：</b>每组独立排名 · ≥70分系数<b>1.0</b> · 前<b className="text-accent">30%</b>可上浮至<b className="text-green">1.2</b> · &lt;70分系数<b className="text-red">0.5~0.8</b>（可自定义）· 开启轮空后系数不上浮
      </div>

      {Object.entries(teamGroups).map(([teamId, members]) => {
        const team = teams.find(t => t.id === teamId)
        const isVacant = !!vacancies[teamId]

        return (
          <div key={teamId} className="mb-6">
            <div className="text-sm font-bold py-4 pb-2 flex items-center gap-2.5">
              {team?.name || teamId}
              <span className="badge badge-blue">{members.length}人</span>
              <div className="ml-auto flex items-center gap-2.5">
                <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>轮空</span>
                <label className="relative w-11 h-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVacant}
                    onChange={e => toggleVacancy(teamId, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="absolute inset-0 bg-gray-300 rounded-full peer-checked:bg-accent transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
            </div>

            {isVacant && (
              <div className="flex items-center gap-2 p-2.5 px-4 rounded-lg mb-4 text-[13px]" style={{ background: 'var(--amber-l)', border: '1px solid #fcd34d', color: '#92400e' }}>
                ⚠️ 已开启轮空，{team?.name || '该组'}本月系数不上浮
              </div>
            )}

            {members.map((emp, empIdx) => {
              const dims = getEmpDims(emp)
              const rev = reviewsMap.get(emp.id)
              const confirmed = rev?.confirmed ?? false
              const totalScore = confirmed ? rev?.totalScore : calcTotalScore(emp)
              const color = COLORS[empIdx % COLORS.length]
              const isBelow70 = confirmed && totalScore != null && totalScore < 70
              const categories = [...new Set(dims.map(d => d.category))]

              return (
                <div key={emp.id} className="card mb-3 overflow-hidden fade-in" style={{ borderRadius: '12px', borderColor: confirmed ? '#a7f3d0' : undefined }}>
                  <div className="flex items-center justify-between p-3.5 px-4.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[13px] font-bold text-white" style={{ background: color }}>
                        {emp.name.charAt(emp.name.length - 1)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{emp.name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>{emp.pos} · {emp.level}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[22px] font-extrabold font-mono leading-none ${totalScore != null ? '' : 'text-text-3'}`}>
                        {totalScore != null ? totalScore.toFixed(1) : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 px-4.5">
                    {categories.map((cat, catIdx) => (
                      <div key={cat}>
                        <div className={`text-[11px] font-bold uppercase tracking-wide py-2 pb-1 ${catIdx ? 'border-t mt-1.5' : ''}`} style={{ color: 'var(--accent)', borderColor: 'var(--border)' }}>
                          {cat}维度
                        </div>
                        {dims.filter(d => d.category === cat).map(dim => {
                          const score = localScores[emp.id]?.[dim.id]
                          return (
                            <div key={dim.id} className="py-2.5" style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <div className="flex items-center gap-2.5 mb-1.5">
                                <div className="flex-1">
                                  <div className="text-[13px] font-medium">{dim.name}</div>
                                  <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>{dim.description}</div>
                                </div>
                                <span className="badge badge-blue">{dim.weight}%</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>评分 (0-100)：</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  placeholder="—"
                                  className="w-[70px] rounded-lg px-2.5 py-1.5 text-sm font-semibold font-mono text-center outline-none"
                                  style={{
                                    background: 'var(--bg-input)',
                                    border: '1.5px solid transparent',
                                    color: 'var(--text)',
                                  }}
                                  value={score ?? ''}
                                  onChange={e => handleScoreChange(emp.id, dim.id, e.target.value)}
                                  disabled={confirmed}
                                  onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.background = '#fff' }}
                                  onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'var(--bg-input)' }}
                                />
                                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                                  {score != null ? (score * dim.weight / 100).toFixed(1) : '—'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-3 px-4.5" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      {confirmed ? (
                        <>
                          <span className="badge badge-green text-xs px-3 py-1.5">✓ 已确认</span>
                          <button
                            className="px-3 py-1 rounded-md text-[11px] font-semibold border cursor-pointer hover:border-accent hover:text-accent transition-colors"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-2)', background: 'var(--bg-card)' }}
                            onClick={() => editEmployee(emp.id)}
                          >
                            修改
                          </button>
                          {isBelow70 && (
                            <div className="flex items-center gap-1.5 ml-2">
                              <label className="text-[11px]" style={{ color: 'var(--text-3)' }}>自定义系数(0.5-0.8):</label>
                              <input
                                type="number"
                                min="0.5"
                                max="0.8"
                                step="0.1"
                                className="w-14 px-1.5 py-1 border rounded text-xs font-semibold text-center font-mono outline-none"
                                style={{ borderColor: 'var(--border)' }}
                                defaultValue={rev?.customCoeff ?? 0.8}
                                onChange={e => setCustomCoeff(emp.id, e.target.value)}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <button
                          className="btn btn-primary text-xs px-4.5 py-1.5"
                          disabled={calcTotalScore(emp) == null}
                          onClick={() => confirmEmployee(emp.id)}
                        >
                          确认打分
                        </button>
                      )}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>加权总分 = 最终绩效分</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-[200px] right-0 bg-white/95 backdrop-blur-sm z-40 px-9 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-[1100px] flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <div className="text-base font-extrabold font-mono">{confirmedCount}/{employees.length}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>已确认</div>
            </div>
            <div>
              <div className="text-base font-extrabold font-mono">{avgScore}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>均分</div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            disabled={confirmedCount < employees.length}
            onClick={submitAll}
          >
            {confirmedCount === employees.length ? '提交全部' : '全部确认后提交'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 px-5 py-3 rounded-lg text-[13px] font-semibold text-white z-[300] fade-in"
          style={{ background: toast.type === 'green' ? 'var(--green)' : 'var(--red)' }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
