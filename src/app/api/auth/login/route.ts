import { NextRequest, NextResponse } from 'next/server'
import { login, createSession } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  if (!username || !password) {
    return NextResponse.json({ error: '请输入账号和密码' }, { status: 400 })
  }

  const session = await login(username, password)
  if (!session) {
    return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
  }

  const token = await createSession(session)
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return NextResponse.json({ success: true, user: session })
}
