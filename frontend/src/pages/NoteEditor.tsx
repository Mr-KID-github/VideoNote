import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, Edit3, Eye, MoreHorizontal, Save, Share2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { MarkdownContent } from '../components/Markdown/MarkdownContent'
import { KeyMomentsRail } from '../components/Notes/KeyMomentsRail'
import { VideoReferencePanel } from '../components/Notes/VideoReferencePanel'
import { findActiveKeyMoment, parseKeyMoments, type KeyMoment } from '../lib/markdownKeyMoments'
import { useI18n } from '../lib/i18n'
import { type NoteShareRecord, useNoteLibraryStore } from '../stores/noteLibraryStore'

type WorkspaceMode = 'write' | 'split' | 'preview'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function NoteEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { copy, locale } = useI18n()
  const { loadNoteById, updateNote, createShareLink, getShareLink, disableShareLink } = useNoteLibraryStore()
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('split')
  const [editorWidth, setEditorWidth] = useState(40)
  const [localTitle, setLocalTitle] = useState('')
  const [content, setContent] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [taskId, setTaskId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareState, setShareState] = useState<NoteShareRecord | null>(null)
  const [shareMessage, setShareMessage] = useState('')
  const [shareError, setShareError] = useState('')
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const [error, setError] = useState('')
  const [currentTimestamp, setCurrentTimestamp] = useState(0)
  const [jumpRequestId, setJumpRequestId] = useState(0)

  const keyMoments = parseKeyMoments(content)
  const activeMoment = findActiveKeyMoment(keyMoments, currentTimestamp)
  const localMediaUrl = id && taskId ? `/api/notes/${id}/media` : undefined
  const splitLabel = locale.startsWith('zh') ? '对照' : 'Split'
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
      setVideoUrl(note.videoUrl || '')
      setTaskId(note.taskId || '')
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

  const scrollPreviewToAnchor = (anchorId: string) => {
    const escape = window.CSS?.escape ?? ((value: string) => value)
    const target = previewRef.current?.querySelector<HTMLElement>(`#${escape(anchorId)}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const jumpToTimestamp = (seconds: number, anchorId?: string) => {
    setCurrentTimestamp(seconds)
    setJumpRequestId((value) => value + 1)

    if (workspaceMode === 'write') {
      setWorkspaceMode('preview')
    }

    if (anchorId) {
      requestAnimationFrame(() => {
        scrollPreviewToAnchor(anchorId)
      })
    }
  }

  const handleSelectMoment = (moment: KeyMoment) => {
    jumpToTimestamp(moment.seconds, moment.anchorId)
  }

  const handleEditorResizeStart = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (workspaceMode !== 'split' || !workspaceRef.current) {
      return
    }

    event.preventDefault()
    const rect = workspaceRef.current.getBoundingClientRect()

    const handlePointerMove = (moveEvent: MouseEvent) => {
      const nextWidth = ((moveEvent.clientX - rect.left) / rect.width) * 100
      setEditorWidth(clamp(nextWidth, 32, videoUrl ? 52 : 68))
    }

    const handlePointerUp = () => {
      document.removeEventListener('mousemove', handlePointerMove)
      document.removeEventListener('mouseup', handlePointerUp)
    }

    document.addEventListener('mousemove', handlePointerMove)
    document.addEventListener('mouseup', handlePointerUp)
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
    <div className="flex h-full flex-col bg-[#f1efe8] dark:bg-[#0f0f0f]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate('/notes')}
            className="rounded-xl p-2 hover:bg-white/80 dark:hover:bg-[#1b1b1b]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <input
              type="text"
              value={localTitle}
              onChange={(event) => setLocalTitle(event.target.value)}
              placeholder={copy.noteEditor.untitled}
              className="w-full min-w-[220px] border-none bg-transparent text-lg font-semibold outline-none focus:ring-0"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {keyMoments.length} key moments with direct timestamp jumps
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-white/80 p-1 shadow-sm dark:bg-[#1a1a1a]">
            <button
              type="button"
              onClick={() => setWorkspaceMode('write')}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                workspaceMode === 'write' ? 'bg-primary-light text-white dark:bg-primary-dark' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Edit3 className="h-4 w-4" />
                {copy.common.edit}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode('split')}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                workspaceMode === 'split' ? 'bg-primary-light text-white dark:bg-primary-dark' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {splitLabel}
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode('preview')}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                workspaceMode === 'preview' ? 'bg-primary-light text-white dark:bg-primary-dark' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {copy.common.preview}
              </span>
            </button>
          </div>

          <button
            onClick={() => void handleSave()}
            className="rounded-xl bg-white/80 p-2 shadow-sm hover:bg-white dark:bg-[#1a1a1a] dark:hover:bg-[#232323]"
            title={saving ? copy.noteEditor.saving : copy.noteEditor.save}
          >
            <Save className="h-5 w-5" />
          </button>
          <button
            onClick={handleExport}
            className="rounded-xl bg-white/80 p-2 shadow-sm hover:bg-white dark:bg-[#1a1a1a] dark:hover:bg-[#232323]"
            title={copy.noteEditor.export}
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={() => void handleShare()}
            className="rounded-xl bg-white/80 p-2 shadow-sm hover:bg-white dark:bg-[#1a1a1a] dark:hover:bg-[#232323]"
            title={copy.noteEditor.share}
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button className="rounded-xl bg-white/80 p-2 shadow-sm hover:bg-white dark:bg-[#1a1a1a] dark:hover:bg-[#232323]">
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

      {keyMoments.length > 0 ? (
        <div className="border-b border-gray-200 bg-white/70 px-4 py-3 xl:hidden dark:border-gray-800 dark:bg-[#151515]">
          <div className="flex gap-3 overflow-x-auto">
            {keyMoments.map((moment) => (
              <button
                key={`${moment.anchorId}-${moment.seconds}`}
                type="button"
                onClick={() => handleSelectMoment(moment)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left text-sm ${
                  activeMoment?.anchorId === moment.anchorId
                    ? 'border-primary-light bg-primary-light/10 dark:border-primary-dark dark:bg-primary-dark/10'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1b1b1b]'
                }`}
              >
                <div className="font-medium">{moment.timestampLabel}</div>
                <div className="mt-1 max-w-[180px] truncate text-xs text-gray-600 dark:text-gray-400">
                  {moment.title}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <KeyMomentsRail
          moments={keyMoments}
          activeAnchorId={activeMoment?.anchorId}
          onSelectMoment={handleSelectMoment}
        />

        <div className="flex min-w-0 flex-1 overflow-hidden" ref={workspaceRef}>
          {workspaceMode !== 'preview' ? (
            <section
              style={workspaceMode === 'split' ? { width: `${editorWidth}%` } : undefined}
              className={`flex min-w-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-[#111111] ${
                workspaceMode === 'split' ? 'shrink-0' : 'flex-1'
              }`}
            >
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                  Markdown
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Keep the source editable. Timestamp links stay visible in plain text.
                </p>
              </div>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-0 flex-1 resize-none bg-white px-4 py-4 font-mono text-[13px] leading-6 outline-none dark:bg-[#111111]"
                placeholder={copy.noteEditor.editorPlaceholder}
              />
            </section>
          ) : null}

          {workspaceMode === 'split' ? (
            <button
              type="button"
              onMouseDown={handleEditorResizeStart}
              className="hidden w-3 shrink-0 items-stretch justify-center bg-transparent lg:flex"
              aria-label="Resize editor and preview panes"
            >
              <span className="my-6 w-1 rounded-full bg-gray-300 dark:bg-gray-700" />
            </button>
          ) : null}

          {workspaceMode !== 'write' ? (
            <section className="flex min-w-0 flex-1 flex-col bg-[#fcfbf7] dark:bg-[#181818]">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                  Preview
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Key timestamps and screenshots should read like a guided re-watch path.
                </p>
              </div>
              <div className="flex min-h-0 flex-1 overflow-hidden">
                <div ref={previewRef} className="min-w-0 flex-1 overflow-auto">
                  <MarkdownContent
                    content={content || copy.noteEditor.previewEmpty}
                    className="prose w-full max-w-none px-6 py-6 dark:prose-invert lg:px-8"
                    videoUrl={videoUrl || undefined}
                    mediaUrl={localMediaUrl}
                    onVideoJump={(seconds) => {
                      jumpToTimestamp(seconds)
                    }}
                  />
                </div>

                {videoUrl ? (
                  <div className="hidden w-[320px] shrink-0 border-l border-gray-200 bg-white/80 p-4 xl:flex dark:border-gray-800 dark:bg-[#141414]">
                    <VideoReferencePanel
                      noteId={id}
                      taskId={taskId || undefined}
                      videoUrl={videoUrl}
                      currentTimestamp={currentTimestamp}
                      jumpRequestId={jumpRequestId}
                      activeMomentTitle={activeMoment?.title}
                      className="w-full"
                      onTimestampChange={setCurrentTimestamp}
                    />
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
