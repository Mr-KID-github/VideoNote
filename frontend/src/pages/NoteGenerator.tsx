import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUploader } from '../components/NoteGenerator/FileUploader'
import { GenerateProgress } from '../components/NoteGenerator/GenerateProgress'
import { useNoteStore } from '../stores/noteStore'
import { Wand2, ArrowLeft } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8900'

export function NoteGenerator() {
  const [videoUrl, setVideoUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [, setTaskId] = useState('')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const { status, progress, currentStep, error, setStatus, setProgress, setCurrentStep, setError, setTitle, setContent, reset } = useNoteStore()
  const navigate = useNavigate()

  const handleGenerate = async () => {
    if (!videoUrl && !selectedFile) return

    reset()
    setStatus('uploading')
    setCurrentStep('uploading')
    setProgress(10)

    try {
      if (selectedFile) {
        // 本地文件模式 - 使用 FormData
        setCurrentStep('uploading')
        setProgress(20)

        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('title', selectedFile.name.replace(/\.[^/.]+$/, ''))
        formData.append('style', 'meeting')

        setCurrentStep('processing')
        setProgress(40)

        const response = await fetch(`${API_BASE}/api/generate_from_file_sync`, {
          method: 'POST',
          body: formData,
        })

        setProgress(80)
        setCurrentStep('summarizing')

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.detail || '生成失败')
        }

        const data = await response.json()
        setTitle(data.title || selectedFile.name)
        setContent(data.markdown || '')
        setProgress(100)
        setStatus('success')

        // 跳转到笔记编辑页面
        setTimeout(() => {
          navigate('/')
        }, 1500)
      } else {
        // URL 模式 - 异步任务
        setCurrentStep('downloading')
        setProgress(20)

        const response = await fetch(`${API_BASE}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_url: videoUrl }),
        })

        const data = await response.json()
        setTaskId(data.task_id)
        setStatus('processing')
        setCurrentStep('transcribing')
        setProgress(30)

        // 轮询任务状态
        pollTaskStatus(data.task_id)
      }
    } catch (err) {
      setStatus('failed')
      setError(err instanceof Error ? err.message : '未知错误')
    }
  }

  const pollTaskStatus = async (id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/task/${id}`)
        const data = await response.json()

        if (data.status === 'success') {
          clearInterval(pollRef.current!)
          setProgress(100)
          setCurrentStep('success')
          setTitle(data.result?.title || '')
          setContent(data.result?.markdown || '')
          setStatus('success')

          // 跳转到笔记页面
          setTimeout(() => {
            navigate('/')
          }, 1500)
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!)
          setStatus('failed')
          setError(data.message || '处理失败')
        } else {
          // 更新进度
          if (data.status === 'transcribing') {
            setCurrentStep('transcribing')
            setProgress(50)
          } else if (data.status === 'summarizing') {
            setCurrentStep('summarizing')
            setProgress(80)
          }
        }
      } catch (err) {
        console.error('轮询错误:', err)
      }
    }, 2000)
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold">生成笔记</h2>
      </div>

      <div className="space-y-6">
        <FileUploader
          videoUrl={videoUrl}
          onVideoUrlChange={setVideoUrl}
          onFileSelect={setSelectedFile}
        />

        <button
          onClick={handleGenerate}
          disabled={status !== 'idle' || (!videoUrl && !selectedFile)}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-primary-light dark:bg-primary-dark text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 className="w-5 h-5" />
          {status === 'idle' ? '开始生成' : '生成中...'}
        </button>

        <GenerateProgress
          status={status}
          progress={progress}
          currentStep={currentStep}
          error={error}
        />
      </div>
    </div>
  )
}
