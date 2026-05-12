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
          className="flex-1 bg-white border border-neutral-300 rounded-md px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-teal-500"
        />
        <button type="submit" disabled={!title.trim()}
          className="px-4 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-sm disabled:opacity-40 transition-colors text-white">
          Add
        </button>
      </form>
      <div className="flex flex-col gap-2">
        {initiatives.map((i) => (
          <div key={i.id} className="px-4 py-3 rounded-lg bg-white border border-neutral-200">
            <span className="text-sm text-neutral-900">{i.title}</span>
          </div>
        ))}
        {initiatives.length === 0 && <p className="text-sm text-neutral-500">No initiatives yet.</p>}
      </div>
    </div>
  )
}
