'use client'

import { useState, useEffect } from 'react'

interface DetailTeam {
  teamName: string
  leaderName: string
  vacant: boolean
  month: string
  members: Array<{
    name: string; level: string; dimScores: string; totalScore: number;
    coeffLabel: string; coeffCls: string; up: boolean; payable: string
  }>
}

export default function HRDetailPage() {
  const [month, setMonth] = useState('')
  const [months, setMonths] = useState<string[]>([])
  const [data, setData] = useState<DetailTeam[]>([])
  const [filters, setFilters] = useState({ team: '', leader: '', name: '' })

  useEffect(() => {
    fetch('/api/hr/detail').then(r => r.json()).then(d => {
      setMonths(d.months)
      if (d.months.length) setMonth(d.months[d.months.length - 1])
    })
  }, [])

  useEffect(() => {
    if (month) loadData()
  }, [month, filters])

  async function loadData() {
    const params = new URLSearchParams({ month, ...filters })
    const res = await fetch(`/api/hr/detail?${params}`)
    const d = await res.json()
    setData(d.teams || [])
  }

  const monthDisplay = (m: string) => { const [y, mo] = m.split('-'); return `${+y}年${+mo}月` }

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold mb-1">明细数据</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>各组详细评估结果</p>
      </div>

      <div className="flex gap-3.5 mb-6 flex-wrap items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>选择月份</label>
          <select className="select-field" value={month} onChange={e => setMonth(e.target.value)}>
            {months.map(m => <option key={m} value={m}>{monthDisplay(m)}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>团队</label>
          <select className="select-field" value={filters.team} onChange={e => setFilters(f => ({ ...f, team: e.target.value }))}>
            <option value="">全部团队</option>
            <option value="t1">投手组</option>
            <option value="t2">内容组</option>
            <option value="t3">阿康组</option>
            <option value="t4">策划组</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>直接上级</label>
          <select className="select-field" value={filters.leader} onChange={e => setFilters(f => ({ ...f, leader: e.target.value }))}>
            <option value="">全部上级</option>
            <option value="l1">刘向东</option>
            <option value="l2">赵婉清</option>
            <option value="l3">车思漫</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</label>
          <input type="text" className="input-field" placeholder="搜索姓名" style={{ width: 120 }}
            value={filters.name} onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} />
        </div>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>暂无数据</div>
      )}

      {data.map(team => (
        <div key={team.teamName} className="card mb-5 overflow-hidden" style={{ borderRadius: '12px' }}>
          <div className="flex items-center justify-between p-3.5 px-4.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold">{team.teamName}（{team.leaderName}）</h3>
            <div className="flex gap-1.5">
              {team.vacant && <span className="badge badge-amber">轮空</span>}
              <span className="badge badge-blue">{monthDisplay(team.month)}</span>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#fafbfc]">
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide w-[50px]" style={{ color: 'var(--text-3)' }}>排名</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>级别</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>各维度</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>总分</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>系数</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>应发绩效</th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((m, i) => {
                const rc = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n'
                return (
                  <tr key={i} style={{ background: m.up ? '#f0fdf4' : undefined, borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-4.5 py-2.5"><div className={`rank-badge ${rc}`}>{i + 1}</div></td>
                    <td className="px-4.5 py-2.5 text-xs font-semibold">{m.name}</td>
                    <td className="px-4.5 py-2.5 text-xs" style={{ color: 'var(--text-2)' }}>{m.level}</td>
                    <td className="px-4.5 py-2.5 text-[11px] max-w-[260px]" style={{ color: 'var(--text-2)' }}>{m.dimScores}</td>
                    <td className="px-4.5 py-2.5"><span className="text-[15px] font-bold font-mono">{m.totalScore.toFixed(1)}</span></td>
                    <td className="px-4.5 py-2.5">
                      <span className={`badge ${m.coeffCls}`} style={{ fontWeight: m.up ? 800 : undefined }}>
                        {m.up ? '↑ ' : ''}系数 {m.coeffLabel}
                      </span>
                    </td>
                    <td className="px-4.5 py-2.5 text-xs font-semibold font-mono">{m.payable}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
