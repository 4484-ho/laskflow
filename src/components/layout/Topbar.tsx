interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-10 border-b border-neutral-800 flex items-center px-4 shrink-0">
      <span className="text-sm text-neutral-400">{title}</span>
    </header>
  )
}
