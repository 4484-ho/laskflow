'use client'
import { useState } from 'react'
import type { Cycle } from '@/types'

interface CycleListProps {
  cycles: Cycle[]
  onCreated: () => void
}

export function CycleList({ cycles, onCreated }: CycleListProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !startDate || !endDate) return
    await fetch('/api/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), startDate, endDate }),
    })
    setTitle(''); setStartDate(''); setEndDate('')
    onCreated()
  }

  const fmt = (d: string | Date) => new Date(d).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2">
        <input placeholder="Sprint name" value={title} onChange={(e) => setTitle(e.target.value)}
          className="flex-1 min-w-40 bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none" />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 focus:outline-none" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 text-sm text-neutral-100 focus:outline-none" />
        <button type="submit" disabled={!title.trim() || !startDate || !endDate}
          className="px-4 py-1.5 rounded-md bg-neutral-700 hover:bg-neutral-600 text-sm disabled:opacity-40 transition-colors text-neutral-100">
          Add
        </button>
      </form>
      <div className="flex flex-col gap-2">
        {cycles.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800">
            <span className="text-sm text-neutral-100 flex-1">{c.title}</span>
            <span className="text-xs text-neutral-500">{fmt(c.startDate)} – {fmt(c.endDate)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-900/40 text-green-400' : 'bg-neutral-800 text-neutral-500'}`}>{c.status}</span>
          </div>
        ))}
        {cycles.length === 0 && <p className="text-sm text-neutral-500">No cycles yet.</p>}
      </div>
    </div>
  )
}
