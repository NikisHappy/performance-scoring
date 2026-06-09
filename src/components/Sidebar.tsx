'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { SessionPayload } from '@/lib/auth'

const leaderNav = [
  { href: '/dashboard/leader/review', label: '评分打分', icon: 'score' },
  { href: '/dashboard/leader/ranking', label: '排名总览', icon: 'rank' },
  { href: '/dashboard/leader/trend', label: '趋势看板', icon: 'trend' },
]

const hrNav = [
  { href: '/dashboard/hr/overview', label: '总览', icon: 'grid' },
  { href: '/dashboard/hr/detail', label: '明细数据', icon: 'doc' },
  { href: '/dashboard/hr/trend', label: '趋势看板', icon: 'trend' },
  { href: '/dashboard/hr/data', label: '数据管理', icon: 'doc' },
]

const adminExtra = [
  { href: '/dashboard/hr/permissions', label: '权限管理', icon: 'lock' },
]

function NavIcon({ icon }: { icon: string }) {
  const icons: Record<string, JSX.Element> = {
    score: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
    rank: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>,
    trend: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  }
  return icons[icon] || null
}

function roleLabel(role: string) {
  return { leader: 'Leader', hr: 'HR', admin: 'HR 管理员' }[role] || role
}

export function Sidebar({ user }: { user: SessionPayload }) {
  const pathname = usePathname()
  const router = useRouter()

  const nav = user.role === 'leader' ? leaderNav : [
    ...hrNav,
    ...(user.role === 'admin' ? adminExtra : []),
  ]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-[200px] fixed top-0 left-0 bottom-0 flex flex-col z-50" style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
      <div className="px-5 pb-4 pt-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
          月度考评
        </h2>
      </div>

      <div className="px-5 py-2 mb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="text-[13px] font-semibold">{user.name}</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{roleLabel(user.role)}</div>
      </div>

      <nav className="flex-1 px-2.5 py-1">
        {nav.map(item => {
          const active = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-[7px] text-[13px] font-medium mb-0.5 transition-colors text-left ${
                active
                  ? 'font-semibold'
                  : 'hover:bg-bg-hover'
              }`}
              style={{
                background: active ? 'var(--accent-l)' : undefined,
                color: active ? 'var(--accent)' : 'var(--text-2)',
              }}
            >
              <NavIcon icon={item.icon} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto p-2.5" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[7px] text-xs w-full hover:bg-red-l transition-colors"
          style={{ color: 'var(--red)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          退出登录
        </button>
      </div>
    </div>
  )
}
