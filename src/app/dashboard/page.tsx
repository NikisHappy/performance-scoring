import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await verifySession()
  if (!session) redirect('/')

  if (session.role === 'leader') {
    redirect('/dashboard/leader/review')
  } else {
    redirect('/dashboard/hr/overview')
  }
}
