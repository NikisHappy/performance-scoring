'use client'

import { useState, useEffect } from 'react'

interface ReviewSummary {
  employeeId: string
  name: string
  level: string
  teamId: string
  teamName: string
  totalScore: number
  coeff: number | null
  coeffLabel: string
  coeffCls: string
  up: boolean
}

export default function LeaderRankingPage() {
  const [month, setMonth] = useState('')
  const [months, setMonths] = useState<string[]>([])
  const [data, setData] = useState<Record<string, ReviewSummary[]>>({})
  const [vacancies, setVacancies] = useState<Record<string, boolean>>({})
  const [filterTeam, setFilterTeam] = useState('')
  const [filterName, setFilterName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (month) loadMonthData()
  }, [month])

  async function loadData() {
    const res = await fetch('/api/leader/ranking')
    const d = await res.json()
    setMonths(d.months)
    if (d.months.length) setMonth(d.months[d.months.length - 1])
  }

  async function loadMonthData() {
    const res = await fetch(`/api/leader/ranking?month=${month}`)
    const d = await res.json()
    setData(d.rankings || {})
    setVacancies(d.vacancies || {})
  }

  function monthDisplay(m: string) {
    const [y, mo] = m.split('-')
    return `${+y}年${+mo}月`
  }

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold mb-1">排名总览</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>各组独立排名，前30%系数上浮至1.2</p>
      </div>

      <div className="flex gap-3.5 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>选择月份</label>
          <select
            className="select-field"
            value={month}
            onChange={e => setMonth(e.target.value)}
          >
            {months.map(m => (
              <option key={m} value={m}>{monthDisplay(m)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>组别</label>
          <select className="select-field" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
            <option value="">全部组别</option>
            {Object.keys(data).map(teamName => <option key={teamName} value={teamName}>{teamName}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</label>
          <input type="text" className="input-field" placeholder="搜索姓名" style={{ width: 120 }}
            value={filterName} onChange={e => setFilterName(e.target.value)} />
        </div>
      </div>

      {Object.entries(data).length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>暂无数据</div>
      )}

      {(() => {
        const filteredData: Record<string, ReviewSummary[]> = Object.fromEntries(
          Object.entries(data)
            .filter(([teamName]) => !filterTeam || teamName === filterTeam)
            .map(([teamName, members]) => [
              teamName,
              filterName ? members.filter(m => m.name.includes(filterName)) : members
            ])
            .filter(([, members]) => (members as ReviewSummary[]).length > 0)
        )
        return Object.entries(filteredData).map(([teamName, members]) => {
        const teamId = members[0]?.teamId
        const isVacant = teamId ? vacancies[teamId] : false

        return (
          <div key={teamName} className="card mb-5 overflow-hidden" style={{ borderRadius: '12px' }}>
            <div className="flex items-center justify-between p-3.5 px-4.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold">{teamName} · {monthDisplay(month)}</h3>
              <div className="flex gap-1.5">
                {isVacant && <span className="badge badge-amber">已轮空</span>}
                <span className="badge badge-blue">{members.length}人</span>
              </div>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fafbfc]">
                  <th className="pl-8 pr-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide w-[50px]" style={{ color: 'var(--text-3)' }}>排名</th>
                  <th className="pl-8 pr-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</th>
                  <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>级别</th>
                  <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>得分</th>
                  <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>系数</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const bc = m.totalScore >= 90 ? 'var(--purple)' : m.totalScore >= 80 ? 'var(--green)' : m.totalScore >= 70 ? 'var(--amber)' : 'var(--red)'
                  const rc = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n'
                  return (
                    <tr key={m.employeeId} style={{ background: m.up ? '#f0fdf4' : undefined, borderBottom: '1px solid #f3f4f6' }}>
                      <td className="pl-8 pr-4.5 py-2.5"><div className={`rank-badge ${rc}`}>{i + 1}</div></td>
                      <td className="pl-8 pr-4.5 py-2.5 text-xs font-semibold">{m.name}</td>
                      <td className="px-4.5 py-2.5 text-xs" style={{ color: 'var(--text-2)' }}>{m.level}</td>
                      <td className="px-4.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-[5px] rounded-full overflow-hidden max-w-[100px]" style={{ background: 'var(--bg-input)' }}>
                            <div className="h-full rounded-full" style={{ width: `${m.totalScore}%`, background: bc }} />
                          </div>
                          <span className="text-[13px] font-bold font-mono min-w-[30px] text-right" style={{ color: bc }}>{m.totalScore.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-4.5 py-2.5">
                        <span className={`badge ${m.coeffCls}`} style={{ fontWeight: m.up ? 800 : undefined }}>
                          {m.up ? '↑ ' : ''}系数 {m.coeffLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })
      })()}
    </div>
  )
}
