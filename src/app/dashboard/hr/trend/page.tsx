'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#4f6ef7', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

interface TrendData {
  months: string[]
  avgByMonth: Array<{ month: string; avg: number | null }>
  distByMonth: Array<{ month: string; s90: number; s80: number; s70: number; s60: number; sLow: number }>
  memberTrends: Array<{ name: string; scores: (number | null)[] }>
  teamAvgs: Array<{ teamName: string; leaderName: string; avgs: (number | null)[] }>
}

export default function HRTrendPage() {
  const [data, setData] = useState<TrendData | null>(null)
  const [filters, setFilters] = useState({ team: '', leader: '', name: '' })

  useEffect(() => { loadData() }, [filters])

  async function loadData() {
    const params = new URLSearchParams(filters)
    const res = await fetch(`/api/hr/trend?${params}`)
    if (res.ok) {
      const d = await res.json()
      setData(d)
    }
  }

  if (!data) return <div className="text-center py-16" style={{ color: 'var(--text-3)' }}>加载中...</div>

  const shortMonth = (m: string) => `${+m.split('-')[1]}月`

  const chartData = data.months.map((m, i) => {
    const dist = data.distByMonth[i]
    return {
      month: shortMonth(m),
      avg: data.avgByMonth[i]?.avg ?? undefined,
      s90: dist?.s90 ?? 0,
      s80: dist?.s80 ?? 0,
      s70: dist?.s70 ?? 0,
      s60: dist?.s60 ?? 0,
      sLow: dist?.sLow ?? 0,
    }
  })

  const memberChartData = data.months.map((m, i) => {
    const point: Record<string, unknown> = { month: shortMonth(m) }
    data.memberTrends.forEach(mt => { point[mt.name] = mt.scores[i] })
    return point
  })

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold mb-1">趋势看板</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>北京破圈 · 月度考评趋势（近6个月）</p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap items-end">
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
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="s90" name="90-100分" fill="#8b5cf6" stackId="a" />
                  <Bar dataKey="s80" name="80-89分" fill="#10b981" stackId="a" />
                  <Bar dataKey="s70" name="70-79分" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="s60" name="60-69分" fill="#f97316" stackId="a" />
                  <Bar dataKey="sLow" name="<60分" fill="#ef4444" stackId="a" />
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
                  <Line type="monotone" dataKey="avg" name="均分" stroke="#4f6ef7" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 mb-6">
            <h4 className="text-[13px] font-semibold mb-4">个人多月考评趋势</h4>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={memberChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[40, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {data.memberTrends.map((mt, i) => (
                  <Line key={mt.name} type="monotone" dataKey={mt.name} stroke={COLORS[i % COLORS.length]}
                    strokeWidth={1.5} dot={{ r: 2.5 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-hidden" style={{ borderRadius: '12px' }}>
            <div className="flex items-center justify-between p-3.5 px-4.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold">各组月度均分（近6个月）</h3>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fafbfc]">
                  <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>组别</th>
                  <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Leader</th>
                  {data.months.map(m => (
                    <th key={m} className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>{shortMonth(m)}</th>
                  ))}
                  <th className="px-4.5 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>趋势</th>
                </tr>
              </thead>
              <tbody>
                {data.teamAvgs.map(ta => {
                  const vals = ta.avgs.filter(v => v != null) as number[]
                  let trend = '—'
                  if (vals.length >= 2) {
                    const diff = vals[vals.length - 1] - vals[vals.length - 2]
                    trend = diff > 0 ? `↑ +${diff.toFixed(1)}` : diff < 0 ? `↓ ${diff.toFixed(1)}` : '→'
                  }
                  return (
                    <tr key={ta.teamName} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="px-4.5 py-2.5 text-xs font-semibold">{ta.teamName}</td>
                      <td className="px-4.5 py-2.5 text-xs" style={{ color: 'var(--text-2)' }}>{ta.leaderName}</td>
                      {ta.avgs.map((v, i) => (
                        <td key={i} className="px-4.5 py-2.5 text-xs font-bold font-mono" style={{
                          color: v == null ? 'var(--text-3)' : v >= 90 ? 'var(--purple)' : v >= 80 ? 'var(--green)' : v >= 70 ? 'var(--amber)' : 'var(--red)'
                        }}>
                          {v != null ? v.toFixed(1) : '—'}
                        </td>
                      ))}
                      <td className="px-4.5 py-2.5 text-xs font-semibold" style={{
                        color: trend.startsWith('↑') ? 'var(--green)' : trend.startsWith('↓') ? 'var(--red)' : 'var(--text-3)'
                      }}>{trend}</td>
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
