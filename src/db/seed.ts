import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'
import { hashSync } from 'bcryptjs'

const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'perf.db')

// Remove existing db for fresh seed
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
}

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')

const db = drizzle(sqlite, { schema })

// Create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('leader','hr','admin')),
    leader_id TEXT
  );
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    leader_id TEXT NOT NULL,
    leader_name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pos TEXT NOT NULL,
    level TEXT NOT NULL,
    team_id TEXT NOT NULL,
    emp_no TEXT,
    dept TEXT DEFAULT '北京破圈',
    join_date TEXT,
    leave_date TEXT,
    perf_full_amount REAL,
    entity TEXT,
    removed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS dimensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pos_level TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    weight INTEGER NOT NULL,
    category TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    leader_id TEXT NOT NULL,
    month TEXT NOT NULL,
    confirmed INTEGER DEFAULT 0,
    submitted INTEGER DEFAULT 0,
    total_score REAL,
    custom_coeff REAL
  );
  CREATE TABLE IF NOT EXISTS review_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    dimension_id INTEGER NOT NULL,
    score REAL NOT NULL
  );
  CREATE TABLE IF NOT EXISTS team_vacancy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    month TEXT NOT NULL,
    is_vacant INTEGER DEFAULT 0
  );
`)

// Seed users
const pw = hashSync('123456', 10)
db.insert(schema.users).values([
  { username: '刘向东', password: pw, name: '刘向东', role: 'leader', leaderId: 'l1' },
  { username: '赵婉清', password: pw, name: '赵婉清', role: 'leader', leaderId: 'l2' },
  { username: '车思漫', password: pw, name: '车思漫', role: 'leader', leaderId: 'l3' },
  { username: 'Niki', password: pw, name: 'Niki', role: 'admin', leaderId: null },
  { username: 'HR小助手', password: pw, name: 'HR小助手', role: 'hr', leaderId: null },
]).run()

// Seed teams
db.insert(schema.teams).values([
  { id: 't1', name: '投手组', leaderId: 'l1', leaderName: '刘向东' },
  { id: 't2', name: '内容组', leaderId: 'l1', leaderName: '刘向东' },
  { id: 't3', name: '阿康组', leaderId: 'l2', leaderName: '赵婉清' },
  { id: 't4', name: '策划组', leaderId: 'l3', leaderName: '车思漫' },
]).run()

// Seed employees
db.insert(schema.employees).values([
  { id: 'e1', name: '方文雄', pos: '投手', level: '组长', teamId: 't1' },
  { id: 'e2', name: '陈丝雨', pos: '投手', level: '组长', teamId: 't1' },
  { id: 'e3', name: '佘君浩', pos: '投手', level: '高级投手', teamId: 't1' },
  { id: 'e4', name: '王澳玲', pos: '投手', level: '高级投手', teamId: 't1' },
  { id: 'e5', name: '龚祖', pos: '内容', level: 'AIGC', teamId: 't2' },
  { id: 'e6', name: '黄誉萱', pos: '内容', level: 'AIGC', teamId: 't2' },
  { id: 'e7', name: '曾龚博文', pos: '内容', level: 'AIGC', teamId: 't2' },
  { id: 'e8', name: '胡欣宇', pos: '内容', level: 'AIGC', teamId: 't2' },
  { id: 'e9', name: '罗静妮', pos: '内容', level: 'AIGC', teamId: 't2' },
  { id: 'e10', name: '刘诗歆', pos: '内容', level: 'AIGC', teamId: 't2' },
  { id: 'e11', name: '黄湘琪', pos: '阿康', level: 'AE', teamId: 't3' },
  { id: 'e12', name: '鲍书豪', pos: '阿康', level: 'AM', teamId: 't3' },
  { id: 'e13', name: '张建业', pos: '阿康', level: 'AE', teamId: 't3' },
  { id: 'e14', name: '吕叶莲', pos: '策划', level: 'I3', teamId: 't4' },
  { id: 'e15', name: '颜容', pos: '策划', level: 'I3', teamId: 't4' },
  { id: 'e16', name: '林芝羽', pos: '策划', level: 'I3', teamId: 't4' },
  { id: 'e17', name: '李艳', pos: '策划', level: 'I3', teamId: 't4' },
  { id: 'e18', name: '王竹', pos: '策划', level: 'I3', teamId: 't4' },
]).run()

// Seed dimensions
const DIMS: Record<string, Array<{ n: string; d: string; w: number; cat: string }>> = {
  '投手_组长': [
    { n: '转化成本', d: '105%~110%目标(T1) / 100%~105%(T2) / <目标(T3)', w: 20, cat: '业绩' },
    { n: '个人客户目标完成率', d: '完成客户目标消耗90%+(T1) / 95%+(T2) / 100%+(T3)', w: 30, cat: '业绩' },
    { n: '团队客户目标完成率', d: '团队季度消耗完成客户目标90%+(T1) / 95%+(T2) / 100%+(T3)', w: 30, cat: '业绩' },
    { n: '课题指标', d: '账户诊断优化(T1) / 多维度分析提案(T2) / 平台创新探索(T3)', w: 20, cat: '能力' },
  ],
  '投手_高级投手': [
    { n: '转化成本', d: '105%~110%目标(T1) / 100%~105%(T2) / <目标(T3)', w: 40, cat: '业绩' },
    { n: '个人客户目标完成率', d: '完成客户目标消耗90%+(T1) / 95%+(T2) / 100%+(T3)', w: 40, cat: '业绩' },
    { n: '课题指标', d: '账户独立优化(T1) / 独立复盘多维分析(T2) / KA客户策略+新链路探索(T3)', w: 20, cat: '能力' },
  ],
  '内容_AIGC': [
    { n: '产出数量', d: '日均4-5条(T1) / 日均7-10条(T2) / 日均10条+(T3)', w: 15, cat: '产出' },
    { n: '素材质量（投放表现）', d: '月日耗过千5条+(T1) / 8条+(T2) / 12条+(T3)', w: 25, cat: '产出' },
    { n: '过审率（平台&客户）', d: '一次过审率70%+(T1) / 80%+(T2) / 90%+(T3)', w: 15, cat: '产出' },
    { n: '创意能力', d: '框架内创作(T1) / 差异化方案+高质量产出(T2) / 前瞻性引领(T3)', w: 15, cat: '能力' },
    { n: '数据分析能力', d: '读懂基础报表(T1) / 趋势分析驱动迭代(T2) / 建立分析框架(T3)', w: 15, cat: '能力' },
    { n: 'AI工具使用', d: '基础使用 / 熟练应用 / 创新探索', w: 10, cat: '协作' },
    { n: '跨部门沟通协作', d: '配合协作 / 主动推进 / 高效整合', w: 5, cat: '协作' },
  ],
  '阿康_AM': [
    { n: '项目完成率', d: '完成率95%(T1) / 100%(T2)', w: 20, cat: '业绩' },
    { n: '下单金额结算率', d: '执行率95%(T1) / 100%(T2)', w: 20, cat: '业绩' },
    { n: '结算周期', d: '1.5个月内(T1) / 1个月内(T2) / 20天内(T3)', w: 10, cat: '业绩' },
    { n: '知识储备', d: '了解项目涉及信息(T2) / 形成SOP同步知识库(T3)', w: 5, cat: '客户服务' },
    { n: '日常沟通响应', d: '理解需求协调交付(T1) / 主持会议汇报(T2) / 获客户表扬(T3)', w: 15, cat: '客户服务' },
    { n: '项目统筹与跟控', d: '全程跟进+独立解答(T1) / 复盘框架搭建(T2)', w: 20, cat: '客户服务' },
    { n: '学习分享', d: '双周1次分享(T1) / 每周1次(T2) / 每2周3次(T3)', w: 10, cat: '协作' },
  ],
  '阿康_AE': [
    { n: '知识储备', d: '了解项目涉及信息并主动学习(T2)', w: 10, cat: '客户服务' },
    { n: '日常沟通响应', d: '会议纪要+及时回复(T1) / 主动优化建议(T2) / 0投诉(T3)', w: 35, cat: '客户服务' },
    { n: '项目执行与跟控', d: '独立跟进+周报(T1) / 识别风险+简易SOP(T2)', w: 35, cat: '客户服务' },
    { n: '学习分享', d: '参与周度案例分享(T1) / 形成方法论(T2) / 季度分享(T3)', w: 20, cat: '协作' },
  ],
  '策划_I3': [
    { n: '方案交付数量', d: '季度8个(T1) / 12个(T2) / 15个(T3)', w: 10, cat: '产出' },
    { n: '参与提案/讲标数量', d: '季度2次(T1) / 3次(T2) / 4次(T3)', w: 15, cat: '产出' },
    { n: '中标率', d: '40%(T1) / 50%(T2) / 60%+(T3)', w: 15, cat: '产出' },
    { n: '学习能力', d: '季度分享方案和AI工具(T1) / 主动了解行业(T2) / 了解投流执行能力(T3)', w: 5, cat: '能力' },
    { n: '交付能力', d: '独立完成brief到撰写(T1) / 逻辑故事性强(T2) / 差异化亮点(T3)', w: 10, cat: '能力' },
    { n: '项目管理能力', d: '按计划完成任务(T1) / 独立制定计划把控节点(T2) / 多项目灵活管理(T3)', w: 15, cat: '能力' },
    { n: '沟通协作能力', d: '清晰表达信息对齐(T1) / 跨部门推动共识(T2) / 策略性沟通主导决策(T3)', w: 15, cat: '能力' },
    { n: '独立讲标能力', d: '独立参与讲标(T1) / 客户认可度高(T2) / 临场应变强(T3)', w: 15, cat: '能力' },
  ],
}

let dimOrder = 0
for (const [posLevel, dims] of Object.entries(DIMS)) {
  for (const dim of dims) {
    db.insert(schema.dimensions).values({
      posLevel,
      name: dim.n,
      description: dim.d,
      weight: dim.w,
      category: dim.cat,
      sortOrder: dimOrder++,
    }).run()
  }
}

// Seed demo review data for last 4 months
function getDimsKey(pos: string, level: string): string {
  if (pos === '投手') return '投手_' + (level || '高级投手')
  if (pos === '内容') return '内容_AIGC'
  if (pos === '阿康') return '阿康_' + (level === 'AM' ? 'AM' : 'AE')
  if (pos === '策划') return '策划_I3'
  return ''
}

const allEmployees = [
  { id: 'e1', name: '方文雄', pos: '投手', level: '组长', teamId: 't1', leaderId: 'l1' },
  { id: 'e2', name: '陈丝雨', pos: '投手', level: '组长', teamId: 't1', leaderId: 'l1' },
  { id: 'e3', name: '佘君浩', pos: '投手', level: '高级投手', teamId: 't1', leaderId: 'l1' },
  { id: 'e4', name: '王澳玲', pos: '投手', level: '高级投手', teamId: 't1', leaderId: 'l1' },
  { id: 'e5', name: '龚祖', pos: '内容', level: 'AIGC', teamId: 't2', leaderId: 'l1' },
  { id: 'e6', name: '黄誉萱', pos: '内容', level: 'AIGC', teamId: 't2', leaderId: 'l1' },
  { id: 'e7', name: '曾龚博文', pos: '内容', level: 'AIGC', teamId: 't2', leaderId: 'l1' },
  { id: 'e8', name: '胡欣宇', pos: '内容', level: 'AIGC', teamId: 't2', leaderId: 'l1' },
  { id: 'e9', name: '罗静妮', pos: '内容', level: 'AIGC', teamId: 't2', leaderId: 'l1' },
  { id: 'e10', name: '刘诗歆', pos: '内容', level: 'AIGC', teamId: 't2', leaderId: 'l1' },
  { id: 'e11', name: '黄湘琪', pos: '阿康', level: 'AE', teamId: 't3', leaderId: 'l2' },
  { id: 'e12', name: '鲍书豪', pos: '阿康', level: 'AM', teamId: 't3', leaderId: 'l2' },
  { id: 'e13', name: '张建业', pos: '阿康', level: 'AE', teamId: 't3', leaderId: 'l2' },
  { id: 'e14', name: '吕叶莲', pos: '策划', level: 'I3', teamId: 't4', leaderId: 'l3' },
  { id: 'e15', name: '颜容', pos: '策划', level: 'I3', teamId: 't4', leaderId: 'l3' },
  { id: 'e16', name: '林芝羽', pos: '策划', level: 'I3', teamId: 't4', leaderId: 'l3' },
  { id: 'e17', name: '李艳', pos: '策划', level: 'I3', teamId: 't4', leaderId: 'l3' },
  { id: 'e18', name: '王竹', pos: '策划', level: 'I3', teamId: 't4', leaderId: 'l3' },
]

// Generate months
const now = new Date()
const demoMonths: string[] = []
for (let i = 4; i >= 1; i--) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
  demoMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
}

// Get all dimensions from DB
const allDims = sqlite.prepare('SELECT * FROM dimensions ORDER BY sort_order').all() as Array<{
  id: number; pos_level: string; name: string; weight: number
}>

// Employee base scores for consistency across months
const empBases: Record<string, number> = {}
allEmployees.forEach(emp => {
  empBases[emp.id] = 55 + Math.random() * 35
})

function randScore(base: number, range: number): number {
  return Math.min(100, Math.max(30, Math.round(base + (Math.random() - 0.5) * range)))
}

for (const month of demoMonths) {
  // Random vacancy
  const vacantTeams = ['t1', 't2', 't3', 't4'].filter(() => Math.random() < 0.12)
  for (const tid of vacantTeams) {
    db.insert(schema.teamVacancy).values({ teamId: tid, month, isVacant: true }).run()
  }

  for (const emp of allEmployees) {
    const dimsKey = getDimsKey(emp.pos, emp.level)
    const empDims = allDims.filter(d => d.pos_level === dimsKey)
    if (!empDims.length) continue

    const base = empBases[emp.id] + (Math.random() - 0.5) * 10

    // Create review
    const dimScores = empDims.map(d => randScore(base, 20))
    let totalScore = 0
    empDims.forEach((d, i) => {
      totalScore += dimScores[i] * d.weight / 100
    })
    totalScore = Math.round(totalScore * 10) / 10

    const customCoeff = totalScore < 70 ? Math.round((0.5 + Math.random() * 0.3) * 10) / 10 : null

    const result = sqlite.prepare(
      'INSERT INTO reviews (employee_id, leader_id, month, confirmed, submitted, total_score, custom_coeff) VALUES (?, ?, ?, 1, 1, ?, ?)'
    ).run(emp.id, emp.leaderId, month, totalScore, customCoeff)

    const reviewId = result.lastInsertRowid

    // Insert scores
    empDims.forEach((d, i) => {
      sqlite.prepare(
        'INSERT INTO review_scores (review_id, dimension_id, score) VALUES (?, ?, ?)'
      ).run(reviewId, d.id, dimScores[i])
    })
  }
}

console.log('✅ Seed completed successfully!')
console.log(`   - ${5} users`)
console.log(`   - ${4} teams`)
console.log(`   - ${allEmployees.length} employees`)
console.log(`   - ${Object.values(DIMS).flat().length} dimensions`)
console.log(`   - ${demoMonths.length} months of demo review data`)

sqlite.close()
