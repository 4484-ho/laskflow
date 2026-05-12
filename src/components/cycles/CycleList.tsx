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
          className="flex-1 min-w-40 bg-white border border-neutral-300 rounded-md px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-teal-500" />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="bg-white border border-neutral-300 rounded-md px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-teal-500" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="bg-white border border-neutral-300 rounded-md px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:border-teal-500" />
        <button type="submit" disabled={!title.trim() || !startDate || !endDate}
          className="px-4 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-sm disabled:opacity-40 transition-colors text-white">
          Add
        </button>
      </form>
      <div className="flex flex-col gap-2">
        {cycles.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border border-neutral-200">
            <span className="text-sm text-neutral-900 flex-1">{c.title}</span>
            <span className="text-xs text-neutral-500">{fmt(c.startDate)} – {fmt(c.endDate)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-teal-100 text-teal-800' : 'bg-neutral-100 text-neutral-600'}`}>{c.status}</span>
          </div>
        ))}
        {cycles.length === 0 && <p className="text-sm text-neutral-500">No cycles yet.</p>}
      </div>
    </div>
  )
}
