import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Edit3, Eye, MoreHorizontal, Save, Share2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { MarkdownContent } from '../components/Markdown/MarkdownContent'
import { useI18n } from '../lib/i18n'
import { type NoteShareRecord, useNoteLibraryStore } from '../stores/noteLibraryStore'

export function NoteEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { copy, locale } = useI18n()
  const { loadNoteById, updateNote, createShareLink, getShareLink, disableShareLink } = useNoteLibraryStore()
  const [isPreview, setIsPreview] = useState(false)
  const [localTitle, setLocalTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareState, setShareState] = useState<NoteShareRecord | null>(null)
  const [shareMessage, setShareMessage] = useState('')
  const [shareError, setShareError] = useState('')
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const [error, setError] = useState('')

  const shareCopy = {
    title: locale.startsWith('zh') ? 'LAN share' : 'LAN sharing',
    description: 'Generate a backend-hosted public link that other devices on your LAN can open directly.',
    generate: 'Generate and copy',
    copy: 'Copy link',
    disable: 'Disable sharing',
    disabled: 'Sharing is currently disabled.',
    copied: 'Share link copied to clipboard',
    copyFailed: 'Copy failed. Please copy the link manually.',
    createFailed: 'Failed to create share link',
    disableFailed: 'Failed to disable sharing',
    disabledSuccess: 'Sharing disabled. The old link is no longer accessible.',
  }

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

      const existingShare = await getShareLink(note.id)
      if (!active || !existingShare) {
        return
      }

      setShareState(existingShare)
    }

    void loadNote()

    return () => {
      active = false
    }
  }, [copy.noteEditor.missingId, copy.noteEditor.notFound, getShareLink, id, loadNoteById])

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

  const copyShareUrl = async (url: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        setShareMessage(shareCopy.copied)
        setShareError('')
        return
      }
    } catch (copyError) {
      console.error('Failed to copy share url:', copyError)
    }

    setShareMessage('')
    setShareError(shareCopy.copyFailed)
  }

  const handleShare = async () => {
    if (!id) {
      return
    }

    setSharePanelOpen(true)
    setShareLoading(true)
    setShareMessage('')
    setShareError('')

    const nextShareState = await createShareLink(id)
    setShareLoading(false)

    if (!nextShareState?.shareUrl) {
      setShareError(shareCopy.createFailed)
      return
    }

    setShareState(nextShareState)
    await copyShareUrl(nextShareState.shareUrl)
  }

  const handleDisableShare = async () => {
    if (!id) {
      return
    }

    setShareLoading(true)
    setShareMessage('')
    setShareError('')

    const nextShareState = await disableShareLink(id)
    setShareLoading(false)

    if (!nextShareState) {
      setShareError(shareCopy.disableFailed)
      return
    }

    setShareState(nextShareState)
    setShareMessage(shareCopy.disabledSuccess)
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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/notes')}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={localTitle}
            onChange={(event) => setLocalTitle(event.target.value)}
            placeholder={copy.noteEditor.untitled}
            className="w-64 border-none bg-transparent text-lg font-medium outline-none focus:ring-0"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setIsPreview(false)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
                !isPreview ? 'bg-white shadow-sm dark:bg-[#202020]' : 'text-gray-500'
              }`}
            >
              <Edit3 className="h-4 w-4" />
              {copy.common.edit}
            </button>
            <button
              onClick={() => setIsPreview(true)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
                isPreview ? 'bg-white shadow-sm dark:bg-[#202020]' : 'text-gray-500'
              }`}
            >
              <Eye className="h-4 w-4" />
              {copy.common.preview}
            </button>
          </div>

          <button
            onClick={() => void handleSave()}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={saving ? copy.noteEditor.saving : copy.noteEditor.save}
          >
            <Save className="h-5 w-5" />
          </button>
          <button
            onClick={handleExport}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={copy.noteEditor.export}
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={() => void handleShare()}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={copy.noteEditor.share}
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {sharePanelOpen ? (
        <div className="border-b border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="font-medium">{shareCopy.title}</div>
              <p className="text-xs text-sky-800/80 dark:text-sky-200/80">{shareCopy.description}</p>
              {shareState?.shareEnabled && shareState.shareUrl ? (
                <input
                  readOnly
                  value={shareState.shareUrl}
                  className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none dark:border-sky-900/50 dark:bg-slate-900 dark:text-slate-100 md:min-w-[420px]"
                />
              ) : (
                <p className="text-xs text-sky-800/80 dark:text-sky-200/80">{shareCopy.disabled}</p>
              )}
              {shareMessage ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">{shareMessage}</p>
              ) : null}
              {shareError ? <p className="text-xs text-red-600 dark:text-red-300">{shareError}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleShare()}
                disabled={shareLoading}
                className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {shareLoading ? copy.common.loading : shareCopy.generate}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (shareState?.shareUrl) {
                    void copyShareUrl(shareState.shareUrl)
                  }
                }}
                disabled={!shareState?.shareUrl || shareLoading}
                className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-medium text-sky-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-sky-800/50 dark:text-sky-100 dark:hover:bg-sky-950/50"
              >
                {shareCopy.copy}
              </button>
              <button
                type="button"
                onClick={() => void handleDisableShare()}
                disabled={!shareState?.shareEnabled || shareLoading}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                {shareCopy.disable}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        <div className={`flex flex-1 flex-col ${isPreview ? 'hidden md:flex' : 'flex'}`}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="flex-1 w-full resize-none bg-white p-4 font-mono text-sm outline-none dark:bg-[#191919]"
            placeholder={copy.noteEditor.editorPlaceholder}
          />
        </div>

        <div
          className={`flex-1 overflow-auto border-l border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-[#202020] ${
            !isPreview ? 'hidden md:flex' : 'flex'
          }`}
        >
          <MarkdownContent
            content={content || copy.noteEditor.previewEmpty}
            className="prose w-full max-w-none p-6 dark:prose-invert"
          />
        </div>
      </div>
    </div>
  )
}
