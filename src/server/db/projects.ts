import { prisma } from '@/server/db/prisma'
import type { Project, ProjectStatus, CreateProjectInput } from '@/types'

interface UpdateProjectInput {
  title?: string
  description?: string | null
  color?: string | null
  status?: ProjectStatus
  initiativeId?: string | null
}

export async function getProjects(): Promise<Project[]> {
  return prisma.project.findMany({ orderBy: { createdAt: 'asc' } }) as Promise<Project[]>
}

export async function getProject(id: string): Promise<Project | null> {
  return prisma.project.findUnique({ where: { id } }) as Promise<Project | null>
}

export async function createProject(data: CreateProjectInput): Promise<Project> {
  return prisma.project.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      prefix: data.prefix.toUpperCase(),
      color: data.color ?? null,
      initiativeId: data.initiativeId ?? null,
    },
  }) as Promise<Project>
}

export async function updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
  return prisma.project.update({ where: { id }, data }) as Promise<Project>
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } })
}
