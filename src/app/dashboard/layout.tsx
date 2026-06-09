import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await verifySession()
  if (!session) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session} />
      <main className="flex-1 ml-[200px] p-7 pb-24 max-w-[1100px]">
        {children}
      </main>
    </div>
  )
}
