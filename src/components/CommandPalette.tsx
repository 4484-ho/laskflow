'use client'

import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { useUiStore } from '@/stores/uiStore'

interface SearchResults {
  issues: Array<{ id: string; identifier: string; title: string; status: string }>
  projects: Array<{ id: string; title: string }>
  initiatives: Array<{ id: string; title: string }>
  cycles: Array<{ id: string; title: string }>
}

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, openCreateIssueModal } = useUiStore()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({
    issues: [], projects: [], initiatives: [], cycles: [],
  })

  const emptyResults = useMemo<SearchResults>(
    () => ({ issues: [], projects: [], initiatives: [], cycles: [] }),
    [],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useUiStore.getState().openCommandPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!query.trim()) return
    const controller = new AbortController()
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then(setResults)
      .catch(() => {})
    return () => controller.abort()
  }, [query])

  const activeResults = query.trim() ? results : emptyResults

  const hasResults =
    activeResults.issues.length + activeResults.projects.length +
    activeResults.initiatives.length + activeResults.cycles.length > 0

  return (
    <Command.Dialog
      open={commandPaletteOpen}
      onOpenChange={(open) => { if (!open) closeCommandPalette() }}
      label="Command palette"
      shouldFilter={false}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
    >
      <div className="w-[560px] rounded-lg border border-neutral-200 bg-white shadow-2xl overflow-hidden">
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search issues, projects, cycles..."
          className="w-full bg-transparent px-4 py-3 text-sm text-neutral-900 outline-none border-b border-neutral-200 placeholder:text-neutral-500"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Group heading="Actions" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
            <Command.Item
              onSelect={() => { closeCommandPalette(); openCreateIssueModal() }}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-neutral-900 cursor-pointer data-[selected=true]:bg-neutral-100"
            >
              + Create new issue
            </Command.Item>
          </Command.Group>

          {query.trim() && !hasResults && (
            <Command.Empty className="py-6 text-center text-sm text-neutral-500">
              No results for &ldquo;{query}&rdquo;
            </Command.Empty>
          )}

          {activeResults.issues.length > 0 && (
            <Command.Group heading="Issues" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
              {activeResults.issues.map((issue) => (
                <Command.Item
                  key={issue.id}
                  onSelect={() => { closeCommandPalette(); router.push(`/issues?selected=${issue.id}`) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-neutral-900 cursor-pointer data-[selected=true]:bg-neutral-100"
                >
                  <span className="text-neutral-500 font-mono text-xs">{issue.identifier}</span>
                  <span>{issue.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {activeResults.projects.length > 0 && (
            <Command.Group heading="Projects" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
              {activeResults.projects.map((p) => (
                <Command.Item
                  key={p.id}
                  onSelect={() => { closeCommandPalette(); router.push(`/projects/${p.id}`) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-neutral-900 cursor-pointer data-[selected=true]:bg-neutral-100"
                >
                  {p.title}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {activeResults.initiatives.length > 0 && (
            <Command.Group heading="Initiatives" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
              {activeResults.initiatives.map((i) => (
                <Command.Item
                  key={i.id}
                  onSelect={() => { closeCommandPalette(); router.push(`/initiatives/${i.id}`) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-neutral-900 cursor-pointer data-[selected=true]:bg-neutral-100"
                >
                  {i.title}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {activeResults.cycles.length > 0 && (
            <Command.Group heading="Cycles" className="text-[10px] uppercase tracking-wider text-neutral-500 px-2 py-1">
              {activeResults.cycles.map((c) => (
                <Command.Item
                  key={c.id}
                  onSelect={() => { closeCommandPalette(); router.push(`/cycles/${c.id}`) }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-neutral-900 cursor-pointer data-[selected=true]:bg-neutral-100"
                >
                  {c.title}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  )
}
