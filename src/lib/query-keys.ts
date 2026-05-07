export const queryKeys = {
  issues: {
    all: ['issues'] as const,
    list: (filters: Record<string, string | undefined> = {}) =>
      [...queryKeys.issues.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.issues.all, 'detail', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
  },
  initiatives: {
    all: ['initiatives'] as const,
    list: () => [...queryKeys.initiatives.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.initiatives.all, 'detail', id] as const,
  },
  cycles: {
    all: ['cycles'] as const,
    list: () => [...queryKeys.cycles.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.cycles.all, 'detail', id] as const,
  },
}
