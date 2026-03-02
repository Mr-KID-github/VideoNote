import { create } from 'zustand'

export type NoteStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'failed'

interface NoteState {
  status: NoteStatus
  progress: number
  currentStep: string
  videoUrl: string
  title: string
  content: string
  error: string

  setStatus: (status: NoteStatus) => void
  setProgress: (progress: number) => void
  setCurrentStep: (step: string) => void
  setVideoUrl: (url: string) => void
  setTitle: (title: string) => void
  setContent: (content: string) => void
  setError: (error: string) => void
  reset: () => void
}

const initialState = {
  status: 'idle' as NoteStatus,
  progress: 0,
  currentStep: '',
  videoUrl: '',
  title: '',
  content: '',
  error: '',
}

export const useNoteStore = create<NoteState>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setVideoUrl: (videoUrl) => set({ videoUrl }),
  setTitle: (title) => set({ title }),
  setContent: (content) => set({ content }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
