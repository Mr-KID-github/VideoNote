import { FileText } from 'lucide-react'
import type { NoteRecord } from '../../stores/noteLibraryStore'

interface NoteGridProps {
  notes: NoteRecord[]
  loading?: boolean
  emptyTitle: string
  emptyBody: string
  onOpen: (note: NoteRecord) => void
}

export function NoteGrid({ notes, loading = false, emptyTitle, emptyBody, onOpen }: NoteGridProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020] p-6">
        Loading notes...
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020] p-10 text-center">
        <FileText className="mx-auto mb-4 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <h3 className="text-lg font-semibold">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{emptyBody}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {notes.map((note) => (
        <button
          key={note.id}
          type="button"
          onClick={() => onOpen(note)}
          className="rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-primary-light dark:border-gray-700 dark:bg-[#202020] dark:hover:border-primary-dark"
        >
          <h3 className="font-semibold">{note.title}</h3>
          <p className="mt-3 line-clamp-4 text-sm text-gray-500 dark:text-gray-400">
            {note.content || 'No content yet.'}
          </p>
          <p className="mt-4 text-xs text-gray-400">
            {new Date(note.updatedAt || note.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </button>
      ))}
    </div>
  )
}
