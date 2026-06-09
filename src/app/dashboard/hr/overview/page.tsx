'use client'

import { useState, useEffect } from 'react'

interface OverviewData {
  totalEmployees: number
  confirmedCount: number
  submittedLeaders: number
  totalLeaders: number
  avgScore: string
  upCount: number
  teamProgress: Array<{
    name: string; leader: string; total: number; done: number; avg: string; vacant: boolean; submitted: boolean
  }>
  allRanked: Array<{
    name: string; team: string; leader: string; score: number; coeffLabel: string; coeffCls: string; up: boolean
  }>
}

export default function HROverviewPage() {
  const [month, setMonth] = useState('')
  const [months, setMonths] = useState<string[]>([])
  const [data, setData] = useState<OverviewData | null>(null)
  const [filters, setFilters] = useState({ team: '', leader: '', name: '' })

  useEffect(() => {
    fetch('/api/hr/overview').then(r => r.json()).then(d => {
      setMonths(d.months)
      if (d.months.length) setMonth(d.months[d.months.length - 1])
    })
  }, [])

  useEffect(() => {
    if (month) loadData()
  }, [month, filters])

  async function loadData() {
    const params = new URLSearchParams({ month, ...filters })
    const res = await fetch(`/api/hr/overview?${params}`)
    setData(await res.json())
  }

  const monthDisplay = (m: string) => { const [y, mo] = m.split('-'); return `${+y}年${+mo}月` }

  if (!data) return <div className="fade-in"><div className="text-center py-16" style={{ color: 'var(--text-3)' }}>加载中...</div></div>

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold mb-1">绩效总览</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>北京破圈 · 各团队评估进展与结果汇总</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-end">
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
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</label>
          <input
            type="text"
            className="input-field"
            placeholder="搜索姓名"
            style={{ width: 120 }}
            value={filters.name}
            onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <div className="text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>总人数</div>
          <div className="text-2xl font-extrabold font-mono">{data.totalEmployees}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>已确认</div>
          <div className="text-2xl font-extrabold font-mono">{data.confirmedCount}<span className="text-sm text-text-3">/{data.totalEmployees}</span></div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{data.submittedLeaders}/{data.totalLeaders} Leader已提交</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>整体均分</div>
          <div className="text-2xl font-extrabold font-mono">{data.avgScore}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] mb-1" style={{ color: 'var(--text-3)' }}>系数上浮</div>
          <div className="text-2xl font-extrabold font-mono" style={{ color: 'var(--green)' }}>{data.upCount}</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>系数1.2</div>
        </div>
      </div>

      {/* Team progress */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {data.teamProgress.map(t => {
          const pct = t.total ? (t.done / t.total * 100) : 0
          const color = t.done === t.total && t.done > 0 ? 'var(--green)' : t.done > 0 ? 'var(--amber)' : 'var(--text-3)'
          return (
            <div key={t.name} className="card p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-[13px] font-semibold">{t.name}（{t.leader}）</div>
                <div className="flex gap-1">
                  {t.vacant && <span className="badge badge-amber">轮空</span>}
                  {t.submitted ? <span className="badge badge-green">已提交</span> : (
                    t.done > 0 ? <span className="badge badge-amber">进行中</span> : <span className="badge badge-gray">未开始</span>
                  )}
                </div>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-3)' }}>已确认 {t.done}/{t.total} · 均分 {t.avg}</div>
            </div>
          )
        })}
      </div>

      {/* All ranked */}
      {data.allRanked.length > 0 && (
        <div className="card overflow-hidden" style={{ borderRadius: '12px' }}>
          <div className="flex items-center justify-between p-3.5 px-4.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold">全员排名 · {monthDisplay(month)}</h3>
            <span className="badge badge-blue">{data.allRanked.length}人</span>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#fafbfc]">
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide w-[50px]" style={{ color: 'var(--text-3)' }}>排名</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>组别</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>上级</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>得分</th>
                <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>系数</th>
              </tr>
            </thead>
            <tbody>
              {data.allRanked.map((r, i) => {
                const bc = r.score >= 90 ? 'var(--purple)' : r.score >= 80 ? 'var(--green)' : r.score >= 70 ? 'var(--amber)' : 'var(--red)'
                const rc = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n'
                return (
                  <tr key={i} style={{ background: r.up ? '#f0fdf4' : undefined, borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-4.5 py-2.5"><div className={`rank-badge ${rc}`}>{i + 1}</div></td>
                    <td className="px-4.5 py-2.5 text-xs font-semibold">{r.name}</td>
                    <td className="px-4.5 py-2.5 text-xs" style={{ color: 'var(--text-2)' }}>{r.team}</td>
                    <td className="px-4.5 py-2.5 text-xs" style={{ color: 'var(--text-2)' }}>{r.leader}</td>
                    <td className="px-4.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-[5px] rounded-full overflow-hidden max-w-[100px]" style={{ background: 'var(--bg-input)' }}>
                          <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: bc }} />
                        </div>
                        <span className="text-[13px] font-bold font-mono min-w-[30px] text-right" style={{ color: bc }}>{r.score.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-4.5 py-2.5">
                      <span className={`badge ${r.coeffCls}`} style={{ fontWeight: r.up ? 800 : undefined }}>
                        {r.up ? '↑ ' : ''}系数 {r.coeffLabel}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
