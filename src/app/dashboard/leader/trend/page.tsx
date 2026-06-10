'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

const COLORS = ['#4f6ef7', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e', '#eab308', '#dc2626', '#7c3aed', '#059669']

interface TrendData {
  months: string[]
  members: Array<{ id: string; name: string; team: string; scores: (number | null)[] }>
  distribution: Array<{ month: string; s90: number; s80: number; s70: number; s60: number; sLow: number }>
}

export default function LeaderTrendPage() {
  const [data, setData] = useState<TrendData | null>(null)
  const [filterTeam, setFilterTeam] = useState('')
  const [filterName, setFilterName] = useState('')

  useEffect(() => {
    fetch('/api/leader/trend')
      .then(r => r.json())
      .then(d => setData(d))
  }, [])

  if (!data || !data.months.length) {
    return (
      <div className="fade-in">
        <div className="mb-7">
          <h1 className="text-[22px] font-bold mb-1">趋势看板</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>月度考评趋势</p>
        </div>
        <div className="card text-center py-16" style={{ color: 'var(--text-3)' }}>暂无历史数据</div>
      </div>
    )
  }

  const shortMonth = (m: string) => (+m.split('-')[1]) + '月'

  // Apply filters
  const filteredMembers = data.members
    .filter(m => !filterTeam || m.team === filterTeam)
    .filter(m => !filterName || m.name.includes(filterName))

  // Prepare line chart data
  const lineData = data.months.map((m, i) => {
    const point: Record<string, unknown> = { month: shortMonth(m) }
    filteredMembers.forEach(mem => {
      point[mem.name] = mem.scores[i]
    })
    return point
  })

  // Prepare distribution data
  const distData = data.distribution.map(d => ({
    month: shortMonth(d.month),
    '90-100分': d.s90,
    '80-89分': d.s80,
    '70-79分': d.s70,
    '60-69分': d.s60,
    '60分以下': d.sLow,
  }))

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold mb-1">趋势看板</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>团队月度考评趋势（近6个月）</p>
      </div>

      <div className="flex gap-3.5 mb-6 flex-wrap items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>组别</label>
          <select className="select-field" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
            <option value="">全部组别</option>
            {[...new Set(data.members.map(m => m.team))].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</label>
          <input type="text" className="input-field" placeholder="搜索姓名" style={{ width: 120 }}
            value={filterName} onChange={e => setFilterName(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h4 className="text-[13px] font-semibold mb-4">月度评分分布</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="90-100分" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="80-89分" stackId="a" fill="#10b981" />
              <Bar dataKey="70-79分" stackId="a" fill="#f59e0b" />
              <Bar dataKey="60-69分" stackId="a" fill="#f97316" />
              <Bar dataKey="60分以下" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 col-span-2">
          <h4 className="text-[13px] font-semibold mb-4">个人多月考评趋势</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis domain={[40, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {filteredMembers.map((mem, i) => (
                <Line
                  key={mem.id}
                  type="monotone"
                  dataKey={mem.name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail table */}
      <div className="card overflow-hidden" style={{ borderRadius: '12px' }}>
        <div className="flex items-center justify-between p-3.5 px-4.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="text-sm font-semibold">月度评分明细（近6个月）</h3>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fafbfc]">
              <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>姓名</th>
              <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>组别</th>
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
                  <td className="px-4.5 py-2.5 text-xs font-semibold">{mem.name}</td>
                  <td className="px-4.5 py-2.5 text-xs" style={{ color: 'var(--text-2)' }}>{mem.team}</td>
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
    </div>
  )
}
