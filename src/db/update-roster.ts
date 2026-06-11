import { Pool } from 'pg'

// 保留现有数据(reviews/review_scores 等不动), 仅按 id 补充花名册字段:
// 工号(emp_no) / 入职时间(join_date) / 绩效金额(perf_full_amount) / 签署主体(entity)。
// 数据来自 demo.xlsx, 与 seed.ts 中的 empMeta 一致。
//
// 默认只补「工号为空」的行(WHERE emp_no IS NULL), 因此:
//   - 幂等: 重复执行/每次部署都安全, 已补过的行直接跳过
//   - 不覆盖人工修改: HR 在界面改过的绩效金额等不会被冲回 Excel 原值
// 如需强制用 Excel 值覆盖全部行, 设环境变量 ROSTER_FORCE=1。

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://perf:perf123@localhost:5432/performance'

const empMeta: Record<string, { empNo: string; joinDate: string; perfFullAmount: number; entity: string }> = {
  e1: { empNo: '0009545', joinDate: '2025-10-13', perfFullAmount: 3000, entity: '北京破圈科技有限公司武汉分公司' },
  e2: { empNo: '0009548', joinDate: '2025-10-15', perfFullAmount: 3000, entity: '北京破圈科技有限公司武汉分公司' },
  e3: { empNo: '0009697', joinDate: '2026-03-23', perfFullAmount: 5400, entity: '北京破圈科技有限公司武汉分公司' },
  e4: { empNo: '0009764', joinDate: '2026-04-08', perfFullAmount: 5400, entity: '北京破圈科技有限公司武汉分公司' },
  e5: { empNo: '0009645', joinDate: '2026-03-09', perfFullAmount: 2700, entity: '北京破圈科技有限公司武汉分公司' },
  e6: { empNo: '0009766', joinDate: '2026-04-13', perfFullAmount: 5400, entity: '北京破圈科技有限公司武汉分公司' },
  e7: { empNo: '0009816', joinDate: '2026-04-20', perfFullAmount: 5400, entity: '北京破圈科技有限公司武汉分公司' },
  e8: { empNo: '0009921', joinDate: '2026-04-27', perfFullAmount: 1800, entity: '北京破圈科技有限公司武汉分公司' },
  e9: { empNo: '0009958', joinDate: '2026-05-08', perfFullAmount: 1800, entity: '北京破圈科技有限公司武汉分公司' },
  e10: { empNo: '0009959', joinDate: '2026-05-15', perfFullAmount: 1800, entity: '北京破圈科技有限公司武汉分公司' },
  e11: { empNo: '0009598', joinDate: '2025-10-20', perfFullAmount: 3000, entity: '北京破圈科技有限公司上海分公司' },
  e12: { empNo: '0009623', joinDate: '2025-11-12', perfFullAmount: 2700, entity: '北京破圈科技有限公司上海分公司' },
  e13: { empNo: '0009649', joinDate: '2026-03-11', perfFullAmount: 2700, entity: '北京破圈科技有限公司上海分公司' },
  e14: { empNo: '0009601', joinDate: '2025-10-22', perfFullAmount: 3000, entity: '北京破圈科技有限公司上海分公司' },
  e15: { empNo: '0009667', joinDate: '2026-03-11', perfFullAmount: 2700, entity: '北京破圈科技有限公司上海分公司' },
  e16: { empNo: '0009844', joinDate: '2026-04-24', perfFullAmount: 5400, entity: '北京破圈科技有限公司武汉分公司' },
  e17: { empNo: '0009915', joinDate: '2026-04-24', perfFullAmount: 1800, entity: '北京破圈科技有限公司武汉分公司' },
  e18: { empNo: '0009916', joinDate: '2026-04-27', perfFullAmount: 1800, entity: '北京破圈科技有限公司武汉分公司' },
}

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL })
  const force = process.env.ROSTER_FORCE === '1'
  // 默认只补空值, 不覆盖人工修改; ROSTER_FORCE=1 时强制覆盖全部
  const guard = force ? '' : 'AND emp_no IS NULL'
  let updated = 0
  let skipped = 0
  let missing = 0
  for (const [id, m] of Object.entries(empMeta)) {
    const res = await pool.query(
      `UPDATE employees
         SET emp_no = $2,
             join_date = $3,
             perf_full_amount = $4,
             entity = $5,
             dept = COALESCE(dept, '北京破圈')
       WHERE id = $1 ${guard}`,
      [id, m.empNo, m.joinDate, m.perfFullAmount, m.entity]
    )
    if (res.rowCount && res.rowCount > 0) {
      updated += res.rowCount
    } else {
      // rowCount=0: 要么该 id 不存在, 要么已有工号被 guard 跳过
      const exists = await pool.query('SELECT 1 FROM employees WHERE id = $1', [id])
      if (exists.rowCount && exists.rowCount > 0) skipped++
      else { missing++; console.warn(`⚠️  未找到员工 ${id}, 跳过`) }
    }
  }
  console.log(`✅ 花名册字段更新完成: 更新 ${updated} 行, 已有跳过 ${skipped} 个, 缺失 ${missing} 个 (force=${force})`)
  await pool.end()
}

run().catch(err => { console.error('更新失败:', err); process.exit(1) })
