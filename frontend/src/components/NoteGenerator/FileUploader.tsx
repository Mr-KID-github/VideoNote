import { useCallback, useState } from 'react'
import { Upload, Link as LinkIcon, FileAudio, X } from 'lucide-react'
import clsx from 'clsx'

interface FileUploaderProps {
  onVideoUrlChange: (url: string) => void
  onFileSelect: (file: File | null) => void
  videoUrl: string
}

export function FileUploader({ onVideoUrlChange, onFileSelect, videoUrl }: FileUploaderProps) {
  const [mode, setMode] = useState<'url' | 'file'>('url')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      setSelectedFile(files[0])
      onFileSelect(files[0])
    }
  }, [onFileSelect])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      setSelectedFile(files[0])
      onFileSelect(files[0])
    }
  }

  return (
    <div className="space-y-4">
      {/* 模式切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('url')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            mode === 'url'
              ? 'bg-primary-light dark:bg-primary-dark text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          <LinkIcon className="w-4 h-4" />
          视频链接
        </button>
        <button
          onClick={() => setMode('file')}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            mode === 'file'
              ? 'bg-primary-light dark:bg-primary-dark text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          <FileAudio className="w-4 h-4" />
          本地文件
        </button>
      </div>

      {/* URL 输入模式 */}
      {mode === 'url' && (
        <div>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            placeholder="粘贴视频链接 (YouTube/Bilibili/本地文件路径)..."
            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark focus:border-transparent outline-none transition-all"
          />
        </div>
      )}

      {/* 文件上传模式 */}
      {mode === 'file' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={clsx(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
            dragActive
              ? 'border-primary-light dark:border-primary-dark bg-primary-light/5 dark:bg-primary-dark/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            selectedFile ? 'py-4' : ''
          )}
        >
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileAudio className="w-8 h-8 text-primary-light dark:text-primary-dark" />
              <span className="font-medium">{selectedFile.name}</span>
              <button
                onClick={() => { setSelectedFile(null); onFileSelect(null) }}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                拖拽文件到此处，或点击选择
              </p>
              <p className="text-sm text-gray-400">
                支持 WAV, MP3, M4A, FLAC, OGG
              </p>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block mt-4 px-4 py-2 bg-primary-light dark:bg-primary-dark text-white rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              >
                选择文件
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}
