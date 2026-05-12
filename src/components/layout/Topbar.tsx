interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-10 border-b border-neutral-200 flex items-center px-4 shrink-0 bg-white">
      <span className="text-sm text-neutral-600">{title}</span>
    </header>
  )
}
