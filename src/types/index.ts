export type IssueStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'cancelled'

export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none'
export type InitiativeStatus = 'active' | 'completed' | 'archived'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'
export type CycleStatus = 'upcoming' | 'active' | 'completed'

export interface Initiative {
  id: string
  title: string
  description: string | null
  status: InitiativeStatus
  color: string | null
  startDate: Date | null
  targetDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  title: string
  description: string | null
  initiativeId: string | null
  prefix: string
  color: string | null
  status: ProjectStatus
  issueCounter: number
  createdAt: Date
  updatedAt: Date
}

export interface Issue {
  id: string
  identifier: string
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  projectId: string
  cycleId: string | null
  parentId: string | null
  labels: string[]
  dueDate: Date | null
  estimate: number | null
  sortOrder: string
  createdAt: Date
  updatedAt: Date
}

export interface Cycle {
  id: string
  title: string
  description: string | null
  status: CycleStatus
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}

// API 入力型
export interface CreateIssueInput {
  title: string
  description?: string
  projectId: string
  status?: IssueStatus
  priority?: IssuePriority
  cycleId?: string
  parentId?: string
  labels?: string[]
  dueDate?: string
  estimate?: number
}

export interface UpdateIssueInput {
  title?: string
  description?: string | null
  status?: IssueStatus
  priority?: IssuePriority
  cycleId?: string | null
  parentId?: string | null
  labels?: string[]
  dueDate?: string | null
  estimate?: number | null
}

export interface CreateProjectInput {
  title: string
  description?: string
  prefix: string
  color?: string
  initiativeId?: string
}

export interface CreateInitiativeInput {
  title: string
  description?: string
  color?: string
  startDate?: string
  targetDate?: string
}

export interface CreateCycleInput {
  title: string
  description?: string
  startDate: string
  endDate: string
}
