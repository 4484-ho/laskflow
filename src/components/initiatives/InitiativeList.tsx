'use client'
import { useState } from 'react'
import type { Initiative } from '@/types'

interface InitiativeListProps {
  initiatives: Initiative[]
  onCreated: () => void
}

export function InitiativeList({ initiatives, onCreated }: InitiativeListProps) {
  const [title, setTitle] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await fetch('/api/initiatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    })
    setTitle('')
    onCreated()
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          placeholder="Initiative name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
        <button type="submit" disabled={!title.trim()}
          className="px-4 py-1.5 rounded-md bg-neutral-700 hover:bg-neutral-600 text-sm disabled:opacity-40 transition-colors text-neutral-100">
          Add
        </button>
      </form>
      <div className="flex flex-col gap-2">
        {initiatives.map((i) => (
          <div key={i.id} className="px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-sm text-neutral-100">{i.title}</span>
          </div>
        ))}
        {initiatives.length === 0 && <p className="text-sm text-neutral-500">No initiatives yet.</p>}
      </div>
    </div>
  )
}
