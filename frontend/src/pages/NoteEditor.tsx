import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Edit3, Eye, MoreHorizontal, Save, Share2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { MarkdownContent } from '../components/Markdown/MarkdownContent'
import { useNoteLibraryStore } from '../stores/noteLibraryStore'

export function NoteEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { loadNoteById, updateNote } = useNoteLibraryStore()
  const { copy } = useI18n()
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
        setError(copy.noteEditor.missingId)
        setLoading(false)
        return
      }

      const note = await loadNoteById(id)
      if (!active) {
        return
      }

      if (!note) {
        setError(copy.noteEditor.notFound)
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
      setError(copy.noteEditor.saveFailed)
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
          {copy.noteEditor.backToLibrary}
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
            placeholder={copy.noteEditor.untitled}
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
                {copy.common.edit}
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
                {copy.common.preview}
              </button>
          </div>

          <button
            onClick={() => void handleSave()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title={saving ? copy.noteEditor.saving : copy.noteEditor.save}
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title={copy.noteEditor.export}
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title={copy.noteEditor.share}
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
            placeholder={copy.noteEditor.editorPlaceholder}
          />
        </div>

        <div className={`flex-1 border-l border-gray-200 dark:border-gray-700 overflow-auto bg-gray-50 dark:bg-[#202020] ${!isPreview ? 'hidden md:flex' : 'flex'}`}>
          <MarkdownContent
            content={content || copy.noteEditor.previewEmpty}
            className="prose dark:prose-invert max-w-none p-6 w-full"
          />
        </div>
      </div>
    </div>
  )
}
