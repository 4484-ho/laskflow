import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 1) {
    return NextResponse.json({ issues: [], projects: [], initiatives: [], cycles: [] })
  }

  const [issues, projects, initiatives, cycles] = await Promise.all([
    prisma.issue.findMany({
      where: { title: { contains: q }, parentId: null },
      select: { id: true, identifier: true, title: true, status: true },
      take: 5,
    }),
    prisma.project.findMany({
      where: { title: { contains: q } },
      select: { id: true, title: true },
      take: 3,
    }),
    prisma.initiative.findMany({
      where: { title: { contains: q } },
      select: { id: true, title: true },
      take: 3,
    }),
    prisma.cycle.findMany({
      where: { title: { contains: q } },
      select: { id: true, title: true },
      take: 3,
    }),
  ])

  return NextResponse.json({ issues, projects, initiatives, cycles })
}
