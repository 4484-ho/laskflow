'use client'

import { useState } from 'react'
import type { Project } from '@/types'

interface ProjectListProps {
  projects: Project[]
  onCreated: () => void
}

export function ProjectList({ projects, onCreated }: ProjectListProps) {
  const [title, setTitle] = useState('')
  const [prefix, setPrefix] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !prefix.trim()) return
    setCreating(true)
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), prefix: prefix.trim() }),
    })
    setTitle('')
    setPrefix('')
    setCreating(false)
    onCreated()
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          placeholder="Project name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
        <input
          placeholder="Prefix (e.g. FE)"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value.toUpperCase())}
          maxLength={5}
          className="w-28 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none font-mono"
        />
        <button
          type="submit"
          disabled={!title.trim() || !prefix.trim() || creating}
          className="px-4 py-1.5 rounded-md bg-neutral-700 hover:bg-neutral-600 text-sm text-neutral-100 disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="font-mono text-xs text-neutral-500 w-12">{p.prefix}</span>
            <span className="text-sm text-neutral-100">{p.title}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              p.status === 'active' ? 'bg-green-900/40 text-green-400' : 'bg-neutral-800 text-neutral-500'
            }`}>{p.status}</span>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-neutral-500 px-1">No projects yet.</p>
        )}
      </div>
    </div>
  )
}
