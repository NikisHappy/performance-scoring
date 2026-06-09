'use client'

import { useState, useEffect, useCallback } from 'react'

interface Employee {
  id: string; name: string; pos: string; level: string; empNo: string
  dept: string; joinDate: string; leaveDate: string; perfFullAmount: number | null
  entity: string; leaderName: string; teamName: string
}

export default function HRDataPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [form, setForm] = useState({
    empNo: '', name: '', dept: '北京破圈', pos: '投手', level: '高级投手',
    joinDate: '', perfFullAmount: '', entity: '北京破圈科技有限公司', leaderId: 'l1'
  })
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const [exportMonth, setExportMonth] = useState('')
  const [months, setMonths] = useState<string[]>([])

  const showToast = (msg: string, type: string) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const loadData = useCallback(async () => {
    const res = await fetch('/api/employees?includeExtra=true')
    if (res.ok) {
      const d = await res.json()
      setEmployees(d.employees || [])
      if (d.months?.length) {
        setMonths(d.months)
        if (!exportMonth) setExportMonth(d.months[d.months.length - 1])
      }
    }
  }, [exportMonth])

  useEffect(() => { loadData() }, [loadData])

  const levelsByPos: Record<string, string[]> = {
    '投手': ['高级投手', '组长'], '内容': ['AIGC'], '阿康': ['AE', 'AM'], '策划': ['I3']
  }

  async function handleAdd() {
    if (!form.name) { showToast('请填写姓名', 'red'); return }
    if (!form.empNo) { showToast('请填写工号', 'red'); return }

    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, perfFullAmount: form.perfFullAmount ? parseFloat(form.perfFullAmount) : null })
    })
    if (res.ok) {
      showToast('添加成功', 'green')
      setForm(f => ({ ...f, empNo: '', name: '', perfFullAmount: '' }))
      loadData()
    } else {
      const d = await res.json()
      showToast(d.error || '添加失败', 'red')
    }
  }

  async function handleRemove(id: string, name: string) {
    const leaveDate = prompt(`请输入 ${name} 的离职日期（YYYY-MM-DD）：`, new Date().toISOString().slice(0, 10))
    if (leaveDate === null) return

    const res = await fetch('/api/employees', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, leaveDate })
    })
    if (res.ok) { showToast(`已移除 ${name}`, 'green'); loadData() }
  }

  async function handleExport() {
    if (!exportMonth) { showToast('请选择导出月份', 'red'); return }
    window.open(`/api/export?month=${exportMonth}`, '_blank')
  }

  const monthDisplay = (m: string) => { const [y, mo] = m.split('-'); return `${+y}年${+mo}月` }

  return (
    <div className="fade-in">
      <div className="mb-7">
        <h1 className="text-[22px] font-bold mb-1">数据管理</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>人员导入与绩效数据导出</p>
      </div>

      {/* Add employee form */}
      <div className="card p-5 mb-6" style={{ borderRadius: '12px' }}>
        <h3 className="text-sm font-semibold mb-3.5">📥 添加人员</h3>
        <p className="text-xs mb-3.5" style={{ color: 'var(--text-2)' }}>添加后员工将自动出现在对应Leader的评分页面</p>
        <div className="flex gap-2.5 flex-wrap items-end">
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>工号</label>
            <input className="input-field" style={{ width: 90 }} placeholder="BJ001" value={form.empNo} onChange={e => setForm(f => ({ ...f, empNo: e.target.value }))} /></div>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>姓名</label>
            <input className="input-field" style={{ width: 100 }} placeholder="员工姓名" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>岗位</label>
            <select className="select-field" value={form.pos} onChange={e => { const pos = e.target.value; setForm(f => ({ ...f, pos, level: levelsByPos[pos]?.[0] || '' })) }}>
              <option value="投手">投手</option><option value="内容">内容</option><option value="阿康">阿康</option><option value="策划">策划</option>
            </select></div>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>级别</label>
            <select className="select-field" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
              {(levelsByPos[form.pos] || []).map(l => <option key={l} value={l}>{l}</option>)}
            </select></div>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>入职时间</label>
            <input type="date" className="input-field" style={{ width: 140 }} value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} /></div>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>绩效全额</label>
            <input type="number" className="input-field" style={{ width: 90 }} placeholder="5000" value={form.perfFullAmount} onChange={e => setForm(f => ({ ...f, perfFullAmount: e.target.value }))} /></div>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>签署主体</label>
            <select className="select-field" value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value }))}>
              <option value="北京破圈科技有限公司">北京破圈科技有限公司</option>
              <option value="北京破圈科技有限公司武汉分公司">武汉分公司</option>
              <option value="北京破圈科技有限公司上海分公司">上海分公司</option>
              <option value="上海明略破圈科技有限公司">上海明略破圈科技有限公司</option>
            </select></div>
          <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>直接上级</label>
            <select className="select-field" value={form.leaderId} onChange={e => setForm(f => ({ ...f, leaderId: e.target.value }))}>
              <option value="l1">刘向东</option><option value="l2">赵婉清</option><option value="l3">车思漫</option>
            </select></div>
          <button className="btn btn-primary" style={{ padding: '8px 20px' }} onClick={handleAdd}>添加</button>
        </div>
      </div>

      {/* Employee list */}
      <div className="card p-4 mb-6" style={{ borderRadius: '12px' }}>
        <h3 className="text-sm font-semibold mb-3">当前人员列表 <span className="badge badge-blue">{employees.length}人</span></h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#fafbfc]">
                {['工号', '姓名', '部门', '岗位', '级别', '入职时间', '绩效全额', '签署主体', '上级', '操作'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td className="px-3 py-2 text-xs">{emp.empNo || '—'}</td>
                  <td className="px-3 py-2 text-xs font-semibold">{emp.name}</td>
                  <td className="px-3 py-2 text-xs">{emp.dept}</td>
                  <td className="px-3 py-2 text-xs">{emp.pos}</td>
                  <td className="px-3 py-2 text-xs">{emp.level}</td>
                  <td className="px-3 py-2 text-xs">{emp.joinDate || '—'}</td>
                  <td className="px-3 py-2 text-xs font-mono">{emp.perfFullAmount || '—'}</td>
                  <td className="px-3 py-2 text-[11px]">{emp.entity || '—'}</td>
                  <td className="px-3 py-2 text-xs">{emp.leaderName}</td>
                  <td className="px-3 py-2">
                    <button className="text-[11px] px-2 py-1 rounded border border-[var(--border)] hover:border-red-400 hover:text-red-500"
                      onClick={() => handleRemove(emp.id, emp.name)}>移除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export section */}
      <div className="card p-5" style={{ borderRadius: '12px' }}>
        <h3 className="text-sm font-semibold mb-2.5">📤 数据导出</h3>
        <p className="text-xs mb-3.5" style={{ color: 'var(--text-2)' }}>按绩效导出模版导出Excel，包含工号、姓名、法人主体、绩效全额、系数、发放金额等字段。</p>
        <div className="flex gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-3)' }}>导出月份</label>
            <select className="select-field" value={exportMonth} onChange={e => setExportMonth(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{monthDisplay(m)}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleExport}>导出Excel</button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 px-5 py-3 rounded-lg text-[13px] font-semibold text-white z-50 ${toast.type === 'green' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
