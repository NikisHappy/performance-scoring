'use client'

import { useState } from 'react'

export interface ChartMember {
  name: string
  color: string
  scores: (number | null)[]
}

interface Props {
  months: string[]
  members: ChartMember[]
  yMin?: number
  yMax?: number
  height?: number
}

// 1:1 复刻 index.html 中的 buildInteractiveLineChart：原生 SVG + hover 高亮
export default function InteractiveLineChart({ months, members, yMin = 0, yMax = 100, height = 280 }: Props) {
  const [active, setActive] = useState<number | null>(null)

  const W = 600, H = height, PL = 40, PR = 20, PT = 25, PB = 30
  const cW = W - PL - PR, cH = H - PT - PB
  const n = months.length
  if (!n) return null
  const xStep = n > 1 ? cW / (n - 1) : cW / 2
  const shortMonth = (m: string) => `${+m.split('-')[1]}月`

  // 网格 + Y 轴刻度
  const grid = []
  for (let i = 0; i <= 4; i++) {
    const y = PT + cH * (1 - i / 4)
    const val = yMin + (yMax - yMin) * i / 4
    grid.push(
      <g key={i}>
        <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#e5e7eb" strokeWidth={0.5} />
        <text x={PL - 6} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize={10}>{val.toFixed(0)}</text>
      </g>
    )
  }

  // X 轴月份
  const xLabels = months.map((m, i) => (
    <text key={m} x={PL + (n > 1 ? i * xStep : xStep)} y={H - 4} textAnchor="middle" fill="#9ca3af" fontSize={10}>
      {shortMonth(m)}
    </text>
  ))

  const toPoints = (scores: (number | null)[]) => {
    const pts: { x: number; y: number }[] = []
    scores.forEach((v, i) => {
      if (v == null) return
      const x = PL + (n > 1 ? i * xStep : xStep)
      const y = PT + cH * (1 - (v - yMin) / (yMax - yMin))
      pts.push({ x, y })
    })
    return pts
  }

  const activeMember = active != null ? members[active] : null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H + 10 }}>
        {grid}
        {xLabels}

        {/* 折线 + 透明粗 hitbox */}
        {members.map((s, si) => {
          const pts = toPoints(s.scores)
          const dimmed = active != null && active !== si
          const isActive = active === si
          return (
            <g key={si}>
              {pts.length >= 2 && (
                <>
                  <path
                    d={pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')}
                    fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setActive(si)} onMouseLeave={() => setActive(null)}
                  />
                  <path
                    d={pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')}
                    fill="none" stroke={s.color}
                    strokeWidth={isActive ? 3.5 : 2}
                    opacity={dimmed ? 0.15 : isActive ? 1 : 0.5}
                    pointerEvents="none"
                  />
                </>
              )}
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={isActive ? 4 : dimmed ? 2 : 2.5}
                  fill={s.color} stroke="#fff" strokeWidth={1}
                  opacity={dimmed ? 0.15 : isActive ? 1 : 0.5} pointerEvents="none" />
              ))}
            </g>
          )
        })}

        {/* 姓名标签：顶部居中 */}
        <text x={W / 2} y={14} textAnchor="middle"
          fill={activeMember?.color ?? 'var(--text)'} fontSize={13} fontWeight={700}
          fontFamily="Noto Sans SC,sans-serif" opacity={activeMember ? 1 : 0}>
          {activeMember?.name ?? ''}
        </text>
      </svg>

      {/* 图例（联动 hover） */}
      <div className="flex gap-3 flex-wrap mt-2.5">
        {members.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] cursor-pointer"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  )
}
