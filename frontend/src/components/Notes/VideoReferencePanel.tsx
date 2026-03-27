import { useEffect, useRef } from 'react'
import { ExternalLink, PlayCircle } from 'lucide-react'
import {
  buildEmbedUrl,
  buildVideoJumpUrl,
  formatTimestampLabel,
  resolveContentUrl,
} from '../../lib/videoLinks'

interface VideoReferencePanelProps {
  noteId?: string
  taskId?: string
  videoUrl: string
  currentTimestamp: number
  jumpRequestId?: number
  activeMomentTitle?: string
  className?: string
  onTimestampChange?: (seconds: number) => void
}

export function VideoReferencePanel({
  noteId,
  taskId,
  videoUrl,
  currentTimestamp,
  jumpRequestId = 0,
  activeMomentTitle,
  className,
  onTimestampChange,
}: VideoReferencePanelProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const embedUrl = buildEmbedUrl(videoUrl, currentTimestamp)
  const jumpUrl = buildVideoJumpUrl(videoUrl, currentTimestamp)
  const timestampLabel = formatTimestampLabel(currentTimestamp)
  const audioUrl = noteId && taskId ? resolveContentUrl(`/api/notes/${noteId}/media`) : null

  useEffect(() => {
    if (!audioRef.current || !audioUrl || embedUrl || jumpRequestId === 0) {
      return
    }

    audioRef.current.currentTime = currentTimestamp
    if (currentTimestamp > 0) {
      void audioRef.current.play().catch(() => {
        // Keep the seek even if autoplay is blocked.
      })
    }
  }, [audioUrl, currentTimestamp, embedUrl, jumpRequestId])

  return (
    <aside className={className}>
      <div className="space-y-3 xl:sticky xl:top-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            Source Media
          </p>
          <h3 className="mt-1 text-base font-semibold">Jump from note to original context</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Current position: {timestampLabel}
          </p>
          {activeMomentTitle ? (
            <p className="mt-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:bg-[#222222] dark:text-gray-200">
              Active focus: {activeMomentTitle}
            </p>
          ) : null}
        </div>

        {embedUrl ? (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm dark:border-gray-700">
            <iframe
              key={`${embedUrl}-${jumpRequestId}`}
              src={embedUrl}
              title="Source video"
              allowFullScreen
              loading="lazy"
              className="aspect-video w-full"
            />
          </div>
        ) : audioUrl ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-[#111111]">
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              src={audioUrl}
              className="w-full"
              onTimeUpdate={(event) => {
                onTimestampChange?.(Math.floor(event.currentTarget.currentTime))
              }}
            />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Embedded video is unavailable for this source. Timestamp clicks will seek the extracted audio.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
            This source cannot be embedded here, but timestamp links still open the original page.
          </div>
        )}

        <a
          href={jumpUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-light px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-primary-dark"
        >
          <PlayCircle className="h-4 w-4" />
          Open at {timestampLabel}
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </aside>
  )
}
