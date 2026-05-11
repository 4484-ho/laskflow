'use client'

import dynamic from 'next/dynamic'
import '@mdxeditor/editor/style.css'

const MDXEditor = dynamic(
  async () => {
    const { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, markdownShortcutPlugin } =
      await import('@mdxeditor/editor')
    return function Editor({
      markdown,
      onChange,
    }: {
      markdown: string
      onChange: (value: string) => void
    }) {
      return (
        <MDXEditor
          markdown={markdown}
          onChange={onChange}
          plugins={[headingsPlugin(), listsPlugin(), quotePlugin(), markdownShortcutPlugin()]}
          contentEditableClassName="prose prose-invert prose-sm max-w-none min-h-[200px] focus:outline-none"
        />
      )
    }
  },
  { ssr: false, loading: () => <div className="text-xs text-neutral-500 p-2">Loading editor...</div> },
)

interface DescriptionEditorProps {
  issueId: string
  initialValue: string | null
  onSave: (value: string) => void
}

export function DescriptionEditor({ initialValue, onSave }: DescriptionEditorProps) {
  return (
    <div
      className="min-h-[200px] rounded border border-transparent hover:border-neutral-700 focus-within:border-neutral-600 transition-colors"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          const el = e.currentTarget.querySelector('[contenteditable]') as HTMLElement | null
          onSave(el?.textContent ?? '')
        }
      }}
    >
      <MDXEditor
        markdown={initialValue ?? ''}
        onChange={() => {}}
      />
    </div>
  )
}
