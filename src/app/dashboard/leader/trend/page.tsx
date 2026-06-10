'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts'
import InteractiveLineChart from '@/components/InteractiveLineChart'

const COLORS = ['#4f6ef7', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e', '#eab308', '#dc2626', '#7c3aed', '#059669']

interface TrendData {
  months: string[]
  members: Array<{ id: string; name: string; team: string; scores: (number | null)[] }>
}

export default function LeaderTrendPage() {
  const [data, setData] = useState<TrendData | null>(null)
  const [filters, setFilters] = useState({ team: '', name: '' })
  const [allMonths, setAllMonths] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false)

  useEffect(() => {
    // Load available months first
    fetch('/api/leader/trend?onlyMonths=true').then(r => r.json()).then(d => {
      if (d.allMonths) {
        setAllMonths(d.allMonths)
        setSelectedMonths(d.allMonths.slice(-6))
      }
    })
  }, [])

  useEffect(() => { if (selectedMonths.length) loadData() }, [selectedMonths])

  async function loadData() {
    const params = new URLSearchParams()
    if (selectedMonths.length) params.set('months', selectedMonths.join(','))
    const res = await fetch(`/api/leader/trend?${params}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
    }
  }

  function toggleMonth(m: string) {
    setSelectedMonths(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort()
    )
  }

  if (!data) return <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>加载中...</div>

  const shortMonth = (m: string) => `${+m.split('-')[1]}月`

  // Client-side filters (team / name) — chart aggregations recompute from this set
  const filteredMembers = data.members
    .filter(m => !filters.team || m.team === filters.team)
    .filter(m => !filters.name || m.name.includes(filters.name))

  const chartData = data.months.map((m, i) => {
    let sum = 0, cnt = 0
    const dist = { s90: 0, s80: 0, s70: 0, s60: 0, sLow: 0 }
    filteredMembers.forEach(mem => {
      const v = mem.scores[i]
      if (v == null) return
      sum += v; cnt++
      if (v >= 90) dist.s90++
      else if (v >= 80) dist.s80++
      else if (v >= 70) dist.s70++
      else if (v >= 60) dist.s60++
      else dist.sLow++
    })
    return {
      month: shortMonth(m),
      avg: cnt ? sum / cnt : undefined,
      ...dist,
    }
  })

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold mb-1">趋势看板</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>团队月度考评趋势（近6个月）</p>
      </div>

      <div className="flex gap-3.5 mb-6 flex-wrap items-end">
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>选择月份</label>
          <button onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
            className="select-field text-left flex items-center justify-between min-w-[200px]"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <span className="text-[13px]" style={{ color: selectedMonths.length ? 'var(--text)' : 'var(--text-3)' }}>
              {selectedMonths.length ? `已选 ${selectedMonths.length} 个月` : '请选择月份'}
            </span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 1L5 5L9 1" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {monthDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', minWidth: 200 }}>
              <div className="max-h-[200px] overflow-y-auto p-1.5">
                {allMonths.map(m => {
                  const active = selectedMonths.includes(m)
                  const [y, mo] = m.split('-')
                  return (
                    <label key={m} className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-[var(--bg-hover)] text-[13px]">
                      <input type="checkbox" checked={active} onChange={() => toggleMonth(m)}
                        className="rounded" style={{ accentColor: 'var(--accent)' }} />
                      <span style={{ color: active ? 'var(--accent)' : 'var(--text)' }}>{+y}年{+mo}月</span>
                    </label>
                  )
                })}
              </div>
              <div className="flex justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <button className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}
                  onClick={() => setSelectedMonths([...allMonths])}>全选</button>
                <button className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}
                  onClick={() => setSelectedMonths(allMonths.slice(-6))}>近6月</button>
                <button className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}
                  onClick={() => setMonthDropdownOpen(false)}>确定</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>组别</label>
          <select className="select-field" value={filters.team} onChange={e => setFilters(f => ({ ...f, team: e.target.value }))}>
            <option value="">全部组别</option>
            {[...new Set(data.members.map(m => m.team))].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</label>
          <input type="text" className="input-field" placeholder="搜索姓名" style={{ width: 120 }}
            value={filters.name} onChange={e => setFilters(f => ({ ...f, name: e.target.value }))} />
        </div>
      </div>

      {data.months.length === 0 ? (
        <div className="card p-16 text-center" style={{ color: 'var(--text-3)' }}>暂无历史数据</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="card p-5">
              <h4 className="text-[13px] font-semibold mb-4">月度评分分布</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="s90" name="90-100分" fill="#8b5cf6" stackId="a" radius={[4, 4, 4, 4]}>
                    <LabelList dataKey="s90" position="center" style={{ fontSize: 10, fill: '#fff', fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                  <Bar dataKey="s80" name="80-89分" fill="#10b981" stackId="a" radius={[4, 4, 4, 4]}>
                    <LabelList dataKey="s80" position="center" style={{ fontSize: 10, fill: '#fff', fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                  <Bar dataKey="s70" name="70-79分" fill="#f59e0b" stackId="a" radius={[4, 4, 4, 4]}>
                    <LabelList dataKey="s70" position="center" style={{ fontSize: 10, fill: '#fff', fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                  <Bar dataKey="s60" name="60-69分" fill="#f97316" stackId="a" radius={[4, 4, 4, 4]}>
                    <LabelList dataKey="s60" position="center" style={{ fontSize: 10, fill: '#fff', fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                  <Bar dataKey="sLow" name="<60分" fill="#ef4444" stackId="a" radius={[4, 4, 4, 4]}>
                    <LabelList dataKey="sLow" position="center" style={{ fontSize: 10, fill: '#fff', fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h4 className="text-[13px] font-semibold mb-4">筛选范围月度均分趋势</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="linear" dataKey="avg" name="均分" stroke="#4f6ef7" strokeWidth={1.5} strokeOpacity={0.7} dot={{ r: 3, fill: '#4f6ef7' }}>
                    <LabelList dataKey="avg" position="top" style={{ fontSize: 10, fill: '#4f6ef7', fontWeight: 600 }} formatter={(v: number) => v?.toFixed(1)} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 mb-6">
            <h4 className="text-[13px] font-semibold mb-4">个人多月考评趋势（悬停折线查看姓名）</h4>
            <InteractiveLineChart
              months={data.months}
              members={filteredMembers.map((mem, i) => ({
                name: mem.name,
                color: COLORS[i % COLORS.length],
                scores: mem.scores,
              }))}
              yMin={40}
              yMax={100}
              height={320}
            />
          </div>

          {/* Detail table */}
          <div className="card overflow-hidden" style={{ borderRadius: '12px' }}>
            <div className="flex items-center justify-between p-3.5 px-4.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold">月度评分明细（近6个月）</h3>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fafbfc]">
                  <th className="pl-6 pr-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</th>
                  <th className="pl-5 pr-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>组别</th>
                  {data.months.map(m => (
                    <th key={m} className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{shortMonth(m)}</th>
                  ))}
                  <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>趋势</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(mem => {
                  const vals = mem.scores.filter((s): s is number => s != null)
                  let trend = '—'
                  if (vals.length >= 2) {
                    const diff = vals[vals.length - 1] - vals[vals.length - 2]
                    trend = diff > 0 ? `↑ +${diff.toFixed(1)}` : diff < 0 ? `↓ ${diff.toFixed(1)}` : '→'
                  }
                  return (
                    <tr key={mem.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="pl-6 pr-4 py-2.5 text-xs font-semibold">{mem.name}</td>
                      <td className="pl-5 pr-4 py-2.5 text-xs" style={{ color: 'var(--text-2)' }}>{mem.team}</td>
                      {mem.scores.map((s, i) => {
                        if (s == null) return <td key={i} className="px-4.5 py-2.5 text-xs" style={{ color: 'var(--text-3)' }}>—</td>
                        const c = s >= 90 ? 'var(--purple)' : s >= 80 ? 'var(--green)' : s >= 70 ? 'var(--amber)' : 'var(--red)'
                        return <td key={i} className="px-4.5 py-2.5 text-xs font-bold font-mono" style={{ color: c }}>{s.toFixed(1)}</td>
                      })}
                      <td className="px-4.5 py-2.5 text-xs font-semibold" style={{ color: trend.startsWith('↑') ? 'var(--green)' : trend.startsWith('↓') ? 'var(--red)' : 'var(--text-3)' }}>
                        {trend}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
