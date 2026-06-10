import { pgTable, serial, text, integer, doublePrecision, boolean, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  leaderId: text('leader_id'),
})

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  leaderId: text('leader_id').notNull(),
  leaderName: text('leader_name').notNull(),
})

export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  pos: text('pos').notNull(),
  level: text('level').notNull(),
  teamId: text('team_id').notNull(),
  empNo: text('emp_no'),
  dept: text('dept').default('北京破圈'),
  joinDate: text('join_date'),
  leaveDate: text('leave_date'),
  perfFullAmount: doublePrecision('perf_full_amount'),
  entity: text('entity'),
  removedAt: text('removed_at'),
})

export const dimensions = pgTable('dimensions', {
  id: serial('id').primaryKey(),
  posLevel: text('pos_level').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  weight: integer('weight').notNull(),
  category: text('category').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  employeeId: text('employee_id').notNull(),
  leaderId: text('leader_id').notNull(),
  month: text('month').notNull(),
  confirmed: boolean('confirmed').default(false),
  submitted: boolean('submitted').default(false),
  totalScore: doublePrecision('total_score'),
  customCoeff: doublePrecision('custom_coeff'),
})

export const reviewScores = pgTable('review_scores', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').notNull(),
  dimensionId: integer('dimension_id').notNull(),
  score: doublePrecision('score').notNull(),
})

export const teamVacancy = pgTable('team_vacancy', {
  id: serial('id').primaryKey(),
  teamId: text('team_id').notNull(),
  month: text('month').notNull(),
  isVacant: boolean('is_vacant').default(false),
})

// Type exports
export type User = typeof users.$inferSelect
export type Team = typeof teams.$inferSelect
export type Employee = typeof employees.$inferSelect
export type Dimension = typeof dimensions.$inferSelect
export type Review = typeof reviews.$inferSelect
export type ReviewScore = typeof reviewScores.$inferSelect
export type TeamVacancy = typeof teamVacancy.$inferSelect

export const periodStatus = pgTable('period_status', {
  id: serial('id').primaryKey(),
  month: text('month').notNull().unique(),
  isOpen: boolean('is_open').default(true),
  name: text('name'),
  startDate: text('start_date'),
  endDate: text('end_date'),
})

export type PeriodStatus = typeof periodStatus.$inferSelect
