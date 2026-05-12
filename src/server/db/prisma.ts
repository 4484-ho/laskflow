import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// DATABASE_URL overrides the default. E2E tests set this to a separate file so
// the dev DB is never wiped by `globalSetup`.
const databaseUrl =
  process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'data', 'taskflow.db')}`

const adapter = new PrismaBetterSqlite3({ url: databaseUrl })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
