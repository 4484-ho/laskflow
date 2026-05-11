import { PrismaClient } from '@prisma/client'
import { generateNKeysBetween } from 'fractional-indexing'

const prisma = new PrismaClient()

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

seed().then(() => { console.log('Seeded'); return prisma.$disconnect() }).catch(console.error)
