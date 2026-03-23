import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { NoteGrid } from '../components/Notes/NoteGrid'
import { useNoteLibraryStore } from '../stores/noteLibraryStore'

export function Notes() {
  const navigate = useNavigate()
  const { notes, loading, loadNotes } = useNoteLibraryStore()

  useEffect(() => {
    void loadNotes()
  }, [loadNotes])

  return (
    <div className="space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-bold">My notes</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All saved notes from your current account.
        </p>
      </div>

      <NoteGrid
        notes={notes}
        loading={loading}
        emptyTitle="Your note library is empty"
        emptyBody="Generate a note or create one manually, then it will appear here."
        onOpen={(note) => navigate(`/note/${note.id}`)}
      />
    </div>
  )
}
