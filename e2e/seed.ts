import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { generateNKeysBetween } from 'fractional-indexing'

// Default to a dedicated E2E DB so `pnpm test:e2e` never wipes the dev DB.
// Allow override via DATABASE_URL for CI or alternate runners.
const databaseUrl =
  process.env.DATABASE_URL ??
  `file:${path.join(process.cwd(), 'data', 'taskflow.e2e.db')}`

const adapter = new PrismaBetterSqlite3({ url: databaseUrl })

/** E2E 用（globalSetup / テストから DB 参照時に共有） */
export const prisma = new PrismaClient({
  adapter,
  log: ['error'],
})

export async function seed() {
  await prisma.issue.deleteMany()
  await prisma.cycle.deleteMany()
  await prisma.project.deleteMany()
  await prisma.initiative.deleteMany()

  const initiative = await prisma.initiative.create({
    data: { title: 'E2E Initiative', status: 'active' },
  })

  const project = await prisma.project.create({
    data: { title: 'E2E Project', prefix: 'E2E', initiativeId: initiative.id },
  })

  const cycle = await prisma.cycle.create({
    data: {
      title: 'E2E Cycle',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 86400000),
      status: 'active',
    },
  })

  const keys = generateNKeysBetween(null, null, 4)

  await prisma.$transaction([
    prisma.project.update({ where: { id: project.id }, data: { issueCounter: 1 } }),
    prisma.issue.create({
      data: {
        identifier: 'E2E-1',
        title: 'E2E Done Issue 1',
        status: 'done',
        priority: 'none',
        projectId: project.id,
        cycleId: cycle.id,
        labels: '[]',
        sortOrder: keys[0],
      },
    }),
  ])
  await prisma.$transaction([
    prisma.project.update({ where: { id: project.id }, data: { issueCounter: 2 } }),
    prisma.issue.create({
      data: {
        identifier: 'E2E-2',
        title: 'E2E Done Issue 2',
        status: 'done',
        priority: 'none',
        projectId: project.id,
        cycleId: cycle.id,
        labels: '[]',
        sortOrder: keys[1],
      },
    }),
  ])
  await prisma.$transaction([
    prisma.project.update({ where: { id: project.id }, data: { issueCounter: 3 } }),
    prisma.issue.create({
      data: {
        identifier: 'E2E-3',
        title: 'E2E Todo Issue searchable',
        status: 'todo',
        priority: 'none',
        projectId: project.id,
        cycleId: cycle.id,
        labels: '[]',
        sortOrder: keys[2],
      },
    }),
  ])
  await prisma.$transaction([
    prisma.project.update({ where: { id: project.id }, data: { issueCounter: 4 } }),
    prisma.issue.create({
      data: {
        identifier: 'E2E-4',
        title: 'E2E Backlog Issue',
        status: 'backlog',
        priority: 'none',
        projectId: project.id,
        labels: '[]',
        sortOrder: keys[3],
      },
    }),
  ])

  return { project, cycle, initiative }
}
