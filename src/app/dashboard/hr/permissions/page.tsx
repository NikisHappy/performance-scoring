'use client'

import { useState, useEffect, useCallback } from 'react'

interface Account {
  id: number; username: string; name: string; role: string; leaderId: string | null
}

interface Period {
  month: string; isOpen: boolean; name?: string | null; startDate?: string | null; endDate?: string | null
}

export default function PermissionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [form, setForm] = useState({ username: '', password: '123456', role: 'hr', leaderId: 'l1' })
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const [periodForm, setPeriodForm] = useState({ name: '', startDate: '', endDate: '' })

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const loadAccounts = useCallback(async () => {
    const res = await fetch('/api/employees?type=accounts')
    if (res.ok) { const d = await res.json(); setAccounts(d.accounts || []) }
  }, [])

  const loadPeriods = useCallback(async () => {
    const res = await fetch('/api/periods')
    if (res.ok) { const d = await res.json(); setPeriods(d.periods || []) }
  }, [])

  useEffect(() => { loadAccounts(); loadPeriods() }, [loadAccounts, loadPeriods])

  async function togglePeriod(month: string, isOpen: boolean, meta?: { name?: string; startDate?: string; endDate?: string }) {
    const res = await fetch('/api/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, isOpen, ...meta })
    })
    if (res.ok) {
      showToast(`${monthDisplay(month)} 已${isOpen ? '开启' : '关闭'}`, 'green')
      loadPeriods()
    }
  }

  async function createPeriod() {
    if (!periodForm.name.trim()) { showToast('请填写周期名称', 'red'); return }
    if (!periodForm.startDate || !periodForm.endDate) { showToast('请选择起止时间', 'red'); return }
    if (periodForm.endDate < periodForm.startDate) { showToast('结束时间不能早于开始时间', 'red'); return }
    const month = periodForm.startDate.slice(0, 7) // YYYY-MM identifier
    if (periods.some(p => p.month === month)) { showToast(`${monthDisplay(month)} 周期已存在`, 'red'); return }
    await togglePeriod(month, true, {
      name: periodForm.name.trim(),
      startDate: periodForm.startDate,
      endDate: periodForm.endDate,
    })
    setPeriodForm({ name: '', startDate: '', endDate: '' })
    setPeriodModalOpen(false)
  }

  const monthDisplay = (m: string) => { const [y, mo] = m.split('-'); return `${+y}年${+mo}月` }

  const grouped = {
    admin: accounts.filter(a => a.role === 'admin'),
    hr: accounts.filter(a => a.role === 'hr'),
    leader: accounts.filter(a => a.role === 'leader'),
  }

  async function handleAdd() {
    if (!form.username) { showToast('请填写账号', 'red'); return }
    const res = await fetch('/api/employees?type=account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) { showToast('添加成功', 'green'); setForm(f => ({ ...f, username: '' })); loadAccounts() }
    else { const d = await res.json(); showToast(d.error || '添加失败', 'red') }
  }

  async function handleResetPwd(username: string) {
    const res = await fetch('/api/employees?type=resetPwd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
    if (res.ok) showToast(`${username} 密码已重置为 123456`, 'green')
  }

  async function handleDelete(username: string) {
    if (!confirm(`确定删除账号 ${username}？`)) return
    const res = await fetch('/api/employees?type=deleteAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    })
    if (res.ok) { showToast('已删除', 'green'); loadAccounts() }
  }

  const roleLabel = (r: string) => ({ leader: 'Leader', hr: 'HR', admin: '管理员' }[r] || r)
  const roleBadge = (r: string) => ({ admin: 'badge-purple', hr: 'badge-blue', leader: 'badge-green' }[r] || 'badge-gray')

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold mb-1">权限管理</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>管理系统账号与角色权限</p>
      </div>

      {(['admin', 'hr', 'leader'] as const).map(role => (
        <div key={role} className="mb-6">
          <h3 className="text-sm font-semibold mb-2">
            <span className={`badge ${roleBadge(role)}`} style={{ fontSize: '12px', padding: '4px 10px' }}>{roleLabel(role)}</span>
            {' '}{grouped[role].length}人
          </h3>
          <div className="card overflow-hidden" style={{ borderRadius: '12px' }}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fafbfc]">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>账号</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>姓名</th>
                  {role === 'leader' && <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Leader ID</th>}
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {grouped[role].map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-4 py-2.5 text-xs">{a.username}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold">{a.name}</td>
                    {role === 'leader' && <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-2)' }}>{a.leaderId || '—'}</td>}
                    <td className="px-4 py-2.5 flex gap-1.5">
                      {role !== 'admin' && (
                        <>
                          <button className="text-[11px] px-2 py-1 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            onClick={() => handleResetPwd(a.username)}>重置密码</button>
                          <button className="text-[11px] px-2 py-1 rounded border border-[var(--border)] hover:border-red-400 hover:text-red-500"
                            onClick={() => handleDelete(a.username)}>删除</button>
                        </>
                      )}
                      {role === 'admin' && <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Add account */}
      <div className="card p-5" style={{ borderRadius: '12px' }}>
        <h3 className="text-sm font-semibold mb-3">添加账号</h3>
        <div className="flex gap-2.5 flex-wrap items-end p-3.5 rounded-lg" style={{ background: 'var(--bg-input)' }}>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>账号/姓名</label>
            <input className="input-field" style={{ width: 120 }} placeholder="输入姓名" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} /></div>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>密码</label>
            <input className="input-field" style={{ width: 100 }} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>角色</label>
            <select className="select-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="hr">HR</option><option value="leader">Leader</option><option value="admin">管理员</option>
            </select></div>
          {form.role === 'leader' && (
            <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>关联Leader</label>
              <select className="select-field" value={form.leaderId} onChange={e => setForm(f => ({ ...f, leaderId: e.target.value }))}>
                <option value="l1">刘向东</option><option value="l2">赵婉清</option><option value="l3">车思漫</option>
              </select></div>
          )}
          <button className="btn btn-primary" style={{ padding: '7px 18px' }} onClick={handleAdd}>添加</button>
        </div>
      </div>

      {/* Period management */}
      <div className="card p-5 mb-6" style={{ borderRadius: '12px' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">考评周期管理</h3>
          <button className="btn btn-primary" style={{ padding: '7px 18px' }}
            onClick={() => setPeriodModalOpen(true)}>+ 新增周期</button>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>新增或管理考评周期，开启后 Leader 可修改评分数据，关闭后数据锁定不可修改。</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {periods.map(p => (
            <div key={p.month} className="flex items-center justify-between px-3 py-2.5 rounded-lg border"
              style={{ borderColor: p.isOpen ? 'var(--green)' : 'var(--border)', background: p.isOpen ? 'var(--green-l)' : 'var(--bg-card)' }}>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-medium truncate">{p.name || monthDisplay(p.month)}</span>
                {p.startDate && p.endDate && (
                  <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{p.startDate} ~ {p.endDate}</span>
                )}
              </div>
              <button onClick={() => togglePeriod(p.month, !p.isOpen)}
                className="text-[11px] font-semibold px-2 py-1 rounded flex-shrink-0"
                style={{
                  background: p.isOpen ? 'var(--green)' : 'var(--bg-input)',
                  color: p.isOpen ? '#fff' : 'var(--text-3)',
                }}>
                {p.isOpen ? '开启中' : '已关闭'}
              </button>
            </div>
          ))}
          {periods.length === 0 && (
            <p className="text-xs col-span-full" style={{ color: 'var(--text-3)' }}>暂无考评周期数据</p>
          )}
        </div>
      </div>

      {/* New period modal */}
      {periodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setPeriodModalOpen(false)}>
          <div className="card p-6 w-[380px] max-w-[90vw]" style={{ borderRadius: '14px' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1">新增考评周期</h3>
            <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>填写周期名称与起止时间</p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>周期名称</label>
                <input type="text" className="input-field" placeholder="如：2026年6月"
                  value={periodForm.name} onChange={e => setPeriodForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>开始时间</label>
                <input type="date" className="input-field"
                  value={periodForm.startDate} onChange={e => setPeriodForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>结束时间</label>
                <input type="date" className="input-field"
                  value={periodForm.endDate} onChange={e => setPeriodForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2.5 justify-end mt-6">
              <button className="text-[13px] font-semibold px-4 py-2 rounded-lg border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
                onClick={() => setPeriodModalOpen(false)}>取消</button>
              <button className="btn btn-primary" style={{ padding: '8px 20px' }} onClick={createPeriod}>确认新增</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-5 right-5 px-5 py-3 rounded-lg text-[13px] font-semibold text-white z-50 ${toast.type === 'green' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
