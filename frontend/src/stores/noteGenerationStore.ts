import { create } from 'zustand'

export type NoteGenerationStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'failed'

interface NoteGenerationState {
  status: NoteGenerationStatus
  progress: number
  currentStep: string
  error: string
  setStatus: (status: NoteGenerationStatus) => void
  setProgress: (progress: number) => void
  setCurrentStep: (step: string) => void
  setError: (error: string) => void
  reset: () => void
}

const initialState = {
  status: 'idle' as NoteGenerationStatus,
  progress: 0,
  currentStep: '',
  error: '',
}

export const useNoteGenerationStore = create<NoteGenerationState>((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
