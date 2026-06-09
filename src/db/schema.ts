import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['leader', 'hr', 'admin'] }).notNull(),
  leaderId: text('leader_id'),
})

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  leaderId: text('leader_id').notNull(),
  leaderName: text('leader_name').notNull(),
})

export const employees = sqliteTable('employees', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  pos: text('pos').notNull(),
  level: text('level').notNull(),
  teamId: text('team_id').notNull(),
  empNo: text('emp_no'),
  dept: text('dept').default('北京破圈'),
  joinDate: text('join_date'),
  leaveDate: text('leave_date'),
  perfFullAmount: real('perf_full_amount'),
  entity: text('entity'),
  removedAt: text('removed_at'),
})

export const dimensions = sqliteTable('dimensions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  posLevel: text('pos_level').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  weight: integer('weight').notNull(),
  category: text('category').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: text('employee_id').notNull(),
  leaderId: text('leader_id').notNull(),
  month: text('month').notNull(), // YYYY-MM
  confirmed: integer('confirmed', { mode: 'boolean' }).default(false),
  submitted: integer('submitted', { mode: 'boolean' }).default(false),
  totalScore: real('total_score'),
  customCoeff: real('custom_coeff'),
})

export const reviewScores = sqliteTable('review_scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reviewId: integer('review_id').notNull(),
  dimensionId: integer('dimension_id').notNull(),
  score: real('score').notNull(),
})

export const teamVacancy = sqliteTable('team_vacancy', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: text('team_id').notNull(),
  month: text('month').notNull(),
  isVacant: integer('is_vacant', { mode: 'boolean' }).default(false),
})

// Type exports
export type User = typeof users.$inferSelect
export type Team = typeof teams.$inferSelect
export type Employee = typeof employees.$inferSelect
export type Dimension = typeof dimensions.$inferSelect
export type Review = typeof reviews.$inferSelect
export type ReviewScore = typeof reviewScores.$inferSelect
export type TeamVacancy = typeof teamVacancy.$inferSelect
