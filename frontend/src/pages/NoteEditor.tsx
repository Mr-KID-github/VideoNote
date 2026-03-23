import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Edit3, Eye, MoreHorizontal, Save, Share2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { MarkdownContent } from '../components/Markdown/MarkdownContent'
import { useNoteLibraryStore } from '../stores/noteLibraryStore'

export function NoteEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { loadNoteById, updateNote } = useNoteLibraryStore()
  const [isPreview, setIsPreview] = useState(false)
  const [localTitle, setLocalTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadNote() {
      if (!id) {
        setError('Missing note id')
        setLoading(false)
        return
      }

      const note = await loadNoteById(id)
      if (!active) {
        return
      }

      if (!note) {
        setError('Note not found')
        setLoading(false)
        return
      }

      setLocalTitle(note.title)
      setContent(note.content)
      setError('')
      setLoading(false)
    }

    void loadNote()

    return () => {
      active = false
    }
  }, [id, loadNoteById])

  const handleSave = async () => {
    if (!id) {
      return
    }

    setSaving(true)
    const updated = await updateNote(id, localTitle, content)
    if (!updated) {
      setError('Failed to save note')
      setSaving(false)
      return
    }

    setLocalTitle(updated.title)
    setContent(updated.content)
    setError('')
    setSaving(false)
  }

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${localTitle || 'note'}.md`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-light"></div>
      </div>
    )
  }

  if (error && !content) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-medium">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/notes')}
          className="rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-700"
        >
          Back to library
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notes')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={localTitle}
            onChange={(event) => setLocalTitle(event.target.value)}
            placeholder="Untitled note"
            className="text-lg font-medium bg-transparent outline-none border-none focus:ring-0 w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setIsPreview(false)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                !isPreview
                  ? 'bg-white dark:bg-[#202020] shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setIsPreview(true)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                isPreview
                  ? 'bg-white dark:bg-[#202020] shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>

          <button
            onClick={() => void handleSave()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title={saving ? 'Saving...' : 'Save'}
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Export"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 flex flex-col ${isPreview ? 'hidden md:flex' : 'flex'}`}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="flex-1 w-full p-4 resize-none outline-none bg-white dark:bg-[#191919] font-mono text-sm"
            placeholder="# Start writing your note..."
          />
        </div>

        <div className={`flex-1 border-l border-gray-200 dark:border-gray-700 overflow-auto bg-gray-50 dark:bg-[#202020] ${!isPreview ? 'hidden md:flex' : 'flex'}`}>
          <MarkdownContent
            content={content || '*No content yet.*'}
            className="prose dark:prose-invert max-w-none p-6 w-full"
          />
        </div>
      </div>
    </div>
  )
}
