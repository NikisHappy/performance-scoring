import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { compareSync } from 'bcryptjs'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'perf-scoring-secret-key-2024')

export interface SessionPayload {
  userId: number
  username: string
  name: string
  role: 'leader' | 'hr' | 'admin'
  leaderId: string | null
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
  return token
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function login(username: string, password: string): Promise<SessionPayload | null> {
  const [user] = await db.select().from(users).where(eq(users.username, username))
  if (!user) return null

  const valid = compareSync(password, user.password)
  if (!valid) return null

  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role as 'leader' | 'hr' | 'admin',
    leaderId: user.leaderId,
  }
}
