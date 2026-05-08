import { prisma } from '../src/server/db/prisma'
import { generateInitialKeys } from '../src/lib/fractional-index'

async function main() {
  const issues = await prisma.issue.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (issues.length === 0) {
    console.log('No issues to migrate.')
    return
  }
  const keys = generateInitialKeys(issues.length)
  for (let i = 0; i < issues.length; i++) {
    await prisma.issue.update({
      where: { id: issues[i].id },
      data: { sortOrder: keys[i] },
    })
  }
  console.log(`Updated ${issues.length} issues with fractional sort keys.`)
}

main().finally(() => prisma.$disconnect())
