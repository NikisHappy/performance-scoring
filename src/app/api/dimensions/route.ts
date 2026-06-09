import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { db } from '@/db'
import { dimensions, teams } from '@/db/schema'

export async function GET() {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allDims = db.select().from(dimensions).all()
  const allTeams = db.select().from(teams).all()

  return NextResponse.json({ dimensions: allDims, teams: allTeams })
}
