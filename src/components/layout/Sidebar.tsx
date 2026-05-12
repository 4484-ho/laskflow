'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleDot, Flag, FolderOpen, RefreshCw, Bot } from 'lucide-react'

const nav = [
  { href: '/issues', label: 'Issues', icon: CircleDot },
  { href: '/initiatives', label: 'Initiatives', icon: Flag },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/cycles', label: 'Cycles', icon: RefreshCw },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 h-screen flex flex-col border-r border-neutral-200 bg-white shrink-0">
      <div className="px-4 py-3 border-b border-neutral-200">
        <span className="font-semibold text-sm text-neutral-900">Taskflow</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              pathname.startsWith(href)
                ? 'bg-teal-50 text-teal-900'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t border-neutral-200">
        <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors">
          <Bot size={15} />
          AI Agent
        </button>
      </div>
    </aside>
  )
}
