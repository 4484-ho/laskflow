import { prisma } from '@/lib/prisma'
import type { Initiative, InitiativeStatus, CreateInitiativeInput } from '@/types'

interface UpdateInitiativeInput {
  title?: string
  description?: string | null
  status?: InitiativeStatus
  color?: string | null
  startDate?: string | null
  targetDate?: string | null
}

export async function getInitiatives(): Promise<Initiative[]> {
  return prisma.initiative.findMany({ orderBy: { createdAt: 'asc' } }) as Promise<Initiative[]>
}

export async function getInitiative(id: string): Promise<Initiative | null> {
  return prisma.initiative.findUnique({ where: { id } }) as Promise<Initiative | null>
}

export async function createInitiative(data: CreateInitiativeInput): Promise<Initiative> {
  return prisma.initiative.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      color: data.color ?? null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
    },
  }) as Promise<Initiative>
}

export async function updateInitiative(id: string, data: UpdateInitiativeInput): Promise<Initiative> {
  const updateData: Record<string, unknown> = { ...data }
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
  if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null
  return prisma.initiative.update({ where: { id }, data: updateData }) as Promise<Initiative>
}

export async function deleteInitiative(id: string): Promise<void> {
  await prisma.initiative.delete({ where: { id } })
}
