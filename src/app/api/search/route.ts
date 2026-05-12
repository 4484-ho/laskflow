import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

// Escape LIKE wildcards so a search for "50%" looks for the literal "%", not
// "match any sequence". Escape character is declared via `ESCAPE '\\'`.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 1) {
    return NextResponse.json({ issues: [], projects: [], initiatives: [], cycles: [] })
  }

  const pattern = `%${escapeLike(q)}%`

  // Use raw SQL with COLLATE NOCASE for case-insensitive search on SQLite.
  // Prisma's `mode: 'insensitive'` is not supported on SQLite.
  // Note: subtasks (parentId IS NOT NULL) are intentionally excluded from
  // top-level search results — they surface via their parent issue.
  const [issues, projects, initiatives, cycles] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; identifier: string; title: string; status: string }>>`
      SELECT id, identifier, title, status FROM Issue
      WHERE title LIKE ${pattern} ESCAPE '\\' COLLATE NOCASE
        AND parentId IS NULL
      LIMIT 5
    `,
    prisma.$queryRaw<Array<{ id: string; title: string }>>`
      SELECT id, title FROM Project
      WHERE title LIKE ${pattern} ESCAPE '\\' COLLATE NOCASE
      LIMIT 3
    `,
    prisma.$queryRaw<Array<{ id: string; title: string }>>`
      SELECT id, title FROM Initiative
      WHERE title LIKE ${pattern} ESCAPE '\\' COLLATE NOCASE
      LIMIT 3
    `,
    prisma.$queryRaw<Array<{ id: string; title: string }>>`
      SELECT id, title FROM Cycle
      WHERE title LIKE ${pattern} ESCAPE '\\' COLLATE NOCASE
      LIMIT 3
    `,
  ])

  return NextResponse.json({ issues, projects, initiatives, cycles })
}
