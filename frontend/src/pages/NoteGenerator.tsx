import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Wand2 } from 'lucide-react'
import { FileUploader } from '../components/NoteGenerator/FileUploader'
import { GenerateProgress } from '../components/NoteGenerator/GenerateProgress'
import { useI18n } from '../lib/i18n'
import { apiJson } from '../lib/api'
import { useModelProfileStore } from '../stores/modelProfileStore'
import { useNoteGenerationStore } from '../stores/noteGenerationStore'
import { useNoteLibraryStore } from '../stores/noteLibraryStore'

type TaskResponse = { task_id: string }
type SummaryMode = 'default' | 'accurate' | 'oneshot'
type TaskStatusResponse = {
  status: string
  message: string
  result?: {
    task_id: string
    title: string
    markdown: string
  }
}

export function NoteGenerator() {
  const [videoUrl, setVideoUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('default')
  const [, setTaskId] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { copy, language } = useI18n()

  const {
    status,
    progress,
    currentStep,
    error,
    setStatus,
    setProgress,
    setCurrentStep,
    setError,
    reset,
  } = useNoteGenerationStore()
  const { saveNote } = useNoteLibraryStore()
  const { profiles, selectedProfileId, selectProfile, loadProfiles } = useModelProfileStore()
  const navigate = useNavigate()

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  const pollTaskStatus = (id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const data = await apiJson<TaskStatusResponse>(`/api/task/${id}`)

        if (data.status === 'success') {
          clearInterval(pollRef.current!)
          setProgress(100)
          setCurrentStep('success')
          setStatus('success')

          const note = await saveNote(
            data.result?.title || '',
            data.result?.markdown || '',
            videoUrl,
            data.result?.task_id || id,
          )
          if (note) {
            navigate(`/note/${note.id}`)
            return
          }

          setStatus('failed')
          setError(copy.generator.saveFailed)
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!)
          setStatus('failed')
          setError(data.message || 'Generation failed')
        } else if (data.status === 'transcribing') {
          setCurrentStep('transcribing')
          setProgress(50)
        } else if (data.status === 'summarizing') {
          setCurrentStep('summarizing')
          setProgress(80)
        } else if (data.status === 'screenshots') {
          setCurrentStep('screenshots')
          setProgress(90)
        }
      } catch (pollError) {
        console.error('Failed to poll task status:', pollError)
      }
    }, 2000)
  }

  const handleGenerate = async () => {
    if (!videoUrl && !selectedFile) return

    reset()
    setStatus('uploading')
    setCurrentStep('uploading')
    setProgress(10)

    try {
      if (selectedFile) {
        throw new Error(copy.generator.browserOnlyError)
      }

      setCurrentStep('downloading')
      setProgress(20)

      const data = await apiJson<TaskResponse>('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl,
          summary_mode: summaryMode,
          output_language: language,
          model_profile_id: selectedProfileId || undefined,
        }),
      })

      setTaskId(data.task_id)
      setStatus('processing')
      setCurrentStep('transcribing')
      setProgress(30)
      pollTaskStatus(data.task_id)
    } catch (generationError) {
      setStatus('failed')
      setError(generationError instanceof Error ? generationError.message : copy.generator.unknownError)
    }
  }

  useEffect(() => () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
    }
  }, [])

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId)
  const defaultProfile = profiles.find((profile) => profile.isDefault)
  const summaryModeOptions: Array<{ value: SummaryMode; label: string; description: string }> =
    language === 'zh-CN'
      ? [
          {
            value: 'default',
            label: '默认总结模式',
            description: '短内容一次性整理，长内容自动切换到分段整理后再合并。',
          },
          {
            value: 'accurate',
            label: '精确总结模式',
            description: '先分段提炼，再统一整合，优先保证覆盖率和稳定性。',
          },
          {
            value: 'oneshot',
            label: '一次性总结模式',
            description: '把全部转录一次性交给模型，优先保留统一文风。',
          },
        ]
      : [
          {
            value: 'default',
            label: 'Default summary mode',
            description: 'Short transcripts use one-shot summarization; long transcripts switch to chunk-first merging automatically.',
          },
          {
            value: 'accurate',
            label: 'Accurate summary mode',
            description: 'Summarize in chunks first, then merge globally for better coverage and stability.',
          },
          {
            value: 'oneshot',
            label: 'One-shot summary mode',
            description: 'Send the whole transcript in one pass and preserve a single writing style.',
          },
        ]
  const selectedSummaryMode = summaryModeOptions.find((option) => option.value === summaryMode)

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold">{copy.generator.title}</h2>
      </div>

      <div className="space-y-6">
        <FileUploader
          videoUrl={videoUrl}
          onVideoUrlChange={setVideoUrl}
          onFileSelect={setSelectedFile}
          fileUploadEnabled={false}
        />

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020]">
          <label className="block text-sm font-medium mb-2">{copy.generator.modelProfileLabel}</label>
          <select
            value={selectedProfileId}
            onChange={(event) => selectProfile(event.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] outline-none focus:ring-2 focus:ring-primary-light"
          >
            <option value="">{copy.generator.systemDefaultModel}</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} / {profile.modelName}
                {profile.isDefault ? ' (default)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {copy.generator.activeModelPrefix}
            {selectedProfile
              ? copy.generator.activeModelSelected(selectedProfile.name, selectedProfile.modelName)
              : defaultProfile
                ? copy.generator.activeModelDefault(defaultProfile.name, defaultProfile.modelName)
                : copy.generator.activeModelBackend}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#202020]">
          <label className="block text-sm font-medium mb-2">
            {language === 'zh-CN' ? '总结模式' : 'Summary mode'}
          </label>
          <select
            value={summaryMode}
            onChange={(event) => setSummaryMode(event.target.value as SummaryMode)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#191919] outline-none focus:ring-2 focus:ring-primary-light"
          >
            {summaryModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {selectedSummaryMode?.description}
          </p>
        </div>

        <button
          onClick={() => void handleGenerate()}
          disabled={status !== 'idle' || (!videoUrl && !selectedFile)}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-primary-light dark:bg-primary-dark text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 className="w-5 h-5" />
          {status === 'idle' ? copy.generator.start : copy.generator.generating}
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
