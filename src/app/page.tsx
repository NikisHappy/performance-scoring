'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      setError('请输入账号和密码')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '登录失败')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="card p-10 w-[380px] text-center" style={{ borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,.06)' }}>
        <h1 className="text-[22px] font-bold mb-1">北京破圈月度考评记录</h1>
        <p className="text-[13px] text-text-3 mb-7">北京破圈 · 请使用账号密码登录</p>

        <form onSubmit={handleLogin}>
          <div className="text-left mb-4">
            <label className="block text-[11px] font-semibold text-text-3 uppercase tracking-wide mb-1.5">账号</label>
            <input
              type="text"
              className="input-field"
              placeholder="输入姓名"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="text-left mb-4">
            <label className="block text-[11px] font-semibold text-text-3 uppercase tracking-wide mb-1.5">密码</label>
            <input
              type="password"
              className="input-field"
              placeholder="输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="text-[12px] text-red min-h-[18px] mb-3">{error}</div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        <div className="text-[11px] text-text-3 mt-5 leading-relaxed">
          演示账号：Leader：刘向东 / 赵婉清 / 车思漫（密码123456）<br />
          HR：Niki / 123456
        </div>
      </div>
    </div>
  )
}
