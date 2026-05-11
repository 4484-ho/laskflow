import { z } from 'zod'

export const issueStatusSchema = z.enum([
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
])

export const issuePrioritySchema = z.enum(['urgent', 'high', 'medium', 'low', 'none'])

export const initiativeStatusSchema = z.enum(['active', 'completed', 'archived'])
export const projectStatusSchema = z.enum(['active', 'paused', 'completed', 'archived'])
export const cycleStatusSchema = z.enum(['upcoming', 'active', 'completed'])

const isoDateString = z.string().datetime({ offset: true }).or(z.string().date())

export const issueListQuerySchema = z.object({
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  projectId: z.string().min(1).optional(),
  cycleId: z.string().min(1).optional(),
  initiativeId: z.string().min(1).optional(),
  sort: z.enum(['sortOrder', 'priority', 'createdAt', 'updatedAt']).optional(),
})

export const createIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string().min(1),
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  cycleId: z.string().min(1).optional(),
  parentId: z.string().min(1).optional(),
  labels: z.array(z.string()).optional(),
  dueDate: isoDateString.optional(),
  estimate: z.number().nonnegative().optional(),
})

export const updateIssueSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  projectId: z.string().min(1).nullable().optional(),
  cycleId: z.string().min(1).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(),
  labels: z.array(z.string()).optional(),
  dueDate: isoDateString.nullable().optional(),
  estimate: z.number().nonnegative().nullable().optional(),
})

export const createProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  prefix: z
    .string()
    .min(1)
    .max(8)
    .regex(/^[A-Z][A-Z0-9]*$/, 'prefix must be uppercase alphanumeric'),
  color: z.string().optional(),
  initiativeId: z.string().min(1).optional(),
})

export const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: projectStatusSchema.optional(),
  initiativeId: z.string().min(1).nullable().optional(),
})

export const createInitiativeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  startDate: isoDateString.optional(),
  targetDate: isoDateString.optional(),
})

export const updateInitiativeSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: initiativeStatusSchema.optional(),
  startDate: isoDateString.nullable().optional(),
  targetDate: isoDateString.nullable().optional(),
})

export const createCycleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: isoDateString,
  endDate: isoDateString,
})

export const updateCycleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: cycleStatusSchema.optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
})

export const moveIssueSchema = z.object({
  beforeId: z.string().min(1).nullable().optional(),
  afterId: z.string().min(1).nullable().optional(),
})
