import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '北京破圈月度考评记录',
  description: '北京破圈月度绩效考评管理系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
