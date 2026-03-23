import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plus } from 'lucide-react'
import { NoteGrid } from '../components/Notes/NoteGrid'
import { useNoteLibraryStore } from '../stores/noteLibraryStore'

export function Home() {
  const navigate = useNavigate()
  const { notes, loading, loadNotes } = useNoteLibraryStore()

  useEffect(() => {
    void loadNotes()
  }, [loadNotes])

  const recentNotes = notes.slice(0, 6)

  return (
    <div className="space-y-8 p-8">
      <section className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-gray-50 to-blue-50 p-8 dark:border-gray-700 dark:from-[#202020] dark:via-[#1f1f1f] dark:to-[#18263a]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Workspace</p>
            <h2 className="text-3xl font-bold">Keep your video notes in one flow.</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Generate from a video URL, save the result to Supabase, and continue editing in Markdown.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/generate')}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-light px-4 py-2.5 font-medium text-white transition-opacity hover:opacity-90 dark:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              New note
            </button>
            <button
              type="button"
              onClick={() => navigate('/notes')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 font-medium transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              View library
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Recent notes</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest saved items from your personal workspace.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="text-sm font-medium text-primary-light dark:text-primary-dark"
          >
            See all
          </button>
        </div>

        <NoteGrid
          notes={recentNotes}
          loading={loading}
          emptyTitle="No notes yet"
          emptyBody="Start with a video URL and your first generated note will show up here."
          onOpen={(note) => navigate(`/note/${note.id}`)}
        />
      </section>
    </div>
  )
}
