'use client'

import { useRef } from 'react'
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
          className="mdxeditor"
          contentEditableClassName="max-w-none min-h-[200px] focus:outline-none text-sm text-neutral-900 [&_a]:text-teal-700 [&_a:hover]:text-teal-800"
        />
      )
    }
  },
  { ssr: false, loading: () => <div className="text-xs text-neutral-500 p-2">Loading editor...</div> },
)

interface DescriptionEditorProps {
  initialValue: string | null
  onSave: (value: string) => void
}

export function DescriptionEditor({ initialValue, onSave }: DescriptionEditorProps) {
  const currentMarkdown = useRef(initialValue ?? '')

  return (
    <div
      className="min-h-[200px] rounded border border-transparent hover:border-neutral-300 focus-within:border-teal-500 transition-colors"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          onSave(currentMarkdown.current)
        }
      }}
    >
      <MDXEditor
        markdown={initialValue ?? ''}
        onChange={(val) => { currentMarkdown.current = val }}
      />
    </div>
  )
}
