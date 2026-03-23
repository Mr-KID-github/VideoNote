import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { NoteGrid } from '../components/Notes/NoteGrid'
import { useNoteLibraryStore } from '../stores/noteLibraryStore'

export function Notes() {
  const navigate = useNavigate()
  const { copy } = useI18n()
  const { notes, loading, loadNotes } = useNoteLibraryStore()

  useEffect(() => {
    void loadNotes()
  }, [loadNotes])

  return (
    <div className="space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-bold">{copy.notes.title}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {copy.notes.body}
        </p>
      </div>

      <NoteGrid
        notes={notes}
        loading={loading}
        emptyTitle={copy.notes.emptyTitle}
        emptyBody={copy.notes.emptyBody}
        onOpen={(note) => navigate(`/note/${note.id}`)}
      />
    </div>
  )
}
