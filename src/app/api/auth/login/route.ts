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

  // 根据当前请求是否走 HTTPS 决定 secure，
  // 这样 HTTPS 域名访问仍然安全，HTTP 局域网访问也能正常设置 cookie。
  const isHttps =
    request.nextUrl.protocol === 'https:' ||
    request.headers.get('x-forwarded-proto') === 'https'

  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return NextResponse.json({ success: true, user: session })
}
