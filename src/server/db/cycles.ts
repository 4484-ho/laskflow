import { prisma } from '@/server/db/prisma'
import type { Cycle, CycleStatus, CreateCycleInput } from '@/types'

interface UpdateCycleInput {
  title?: string
  description?: string | null
  status?: CycleStatus
  startDate?: string
  endDate?: string
}

export async function getCycles(): Promise<Cycle[]> {
  return prisma.cycle.findMany({ orderBy: { startDate: 'desc' } }) as Promise<Cycle[]>
}

export async function getCycle(id: string): Promise<Cycle | null> {
  return prisma.cycle.findUnique({ where: { id } }) as Promise<Cycle | null>
}

export async function createCycle(data: CreateCycleInput): Promise<Cycle> {
  return prisma.cycle.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
  }) as Promise<Cycle>
}

export async function updateCycle(id: string, data: UpdateCycleInput): Promise<Cycle> {
  const updateData: Record<string, unknown> = { ...data }
  if (data.startDate) updateData.startDate = new Date(data.startDate)
  if (data.endDate) updateData.endDate = new Date(data.endDate)
  return prisma.cycle.update({ where: { id }, data: updateData }) as Promise<Cycle>
}

export async function deleteCycle(id: string): Promise<void> {
  await prisma.cycle.delete({ where: { id } })
}
