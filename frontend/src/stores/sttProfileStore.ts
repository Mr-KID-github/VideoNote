import { create } from 'zustand'
import {
  createSTTProfile,
  deleteSTTProfile,
  fetchSTTProfiles,
  setDefaultSTTProfile,
  updateSTTProfile,
  type STTProfile,
  type STTProfileDraft,
} from '../lib/sttProfiles'

export type { STTProfile, STTProfileDraft, STTProviderType } from '../lib/sttProfiles'

interface STTProfileState {
  profiles: STTProfile[]
  loading: boolean
  saving: boolean
  error: string
  selectedProfileId: string
  loadProfiles: () => Promise<void>
  createProfile: (draft: STTProfileDraft) => Promise<STTProfile>
  updateProfile: (id: string, draft: Partial<STTProfileDraft>) => Promise<STTProfile>
  deleteProfile: (id: string) => Promise<void>
  setDefaultProfile: (id: string) => Promise<STTProfile>
  selectProfile: (id: string) => void
  reset: () => void
}

const emptyState = {
  profiles: [] as STTProfile[],
  loading: false,
  saving: false,
  error: '',
  selectedProfileId: '',
}

const syncDefaultSelection = (profiles: STTProfile[], currentId: string) => {
  if (currentId && profiles.some((profile) => profile.id === currentId)) {
    return currentId
  }
  return profiles.find((profile) => profile.isDefault)?.id || ''
}

const mergeProfile = (profiles: STTProfile[], updated: STTProfile) =>
  [updated, ...profiles.filter((profile) => profile.id !== updated.id)].map((profile) => (
    updated.isDefault && profile.id !== updated.id ? { ...profile, isDefault: false } : profile
  ))

export const useSTTProfileStore = create<STTProfileState>((set, get) => ({
  ...emptyState,
  loadProfiles: async () => {
    set({ loading: true, error: '' })
    try {
      const profiles = await fetchSTTProfiles()
      set((state) => ({
        profiles,
        loading: false,
        selectedProfileId: syncDefaultSelection(profiles, state.selectedProfileId),
      }))
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load STT profiles',
      })
    }
  },
  createProfile: async (draft) => {
    set({ saving: true, error: '' })
    try {
      const created = await createSTTProfile(draft)
      const profiles = mergeProfile(get().profiles, created)
      set({
        profiles,
        saving: false,
        selectedProfileId: syncDefaultSelection(profiles, created.id),
      })
      return created
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to create STT profile',
      })
      throw error
    }
  },
  updateProfile: async (id, draft) => {
    set({ saving: true, error: '' })
    try {
      const updated = await updateSTTProfile(id, draft)
      const profiles = get().profiles.map((profile) => (
        profile.id === id ? updated : updated.isDefault ? { ...profile, isDefault: false } : profile
      ))
      set({
        profiles,
        saving: false,
        selectedProfileId: syncDefaultSelection(profiles, get().selectedProfileId),
      })
      return updated
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to update STT profile',
      })
      throw error
    }
  },
  deleteProfile: async (id) => {
    set({ saving: true, error: '' })
    try {
      await deleteSTTProfile(id)
      const nextSelectedId = get().selectedProfileId === id ? '' : get().selectedProfileId
      const profiles = get().profiles.filter((profile) => profile.id !== id)
      set({
        profiles,
        saving: false,
        selectedProfileId: syncDefaultSelection(profiles, nextSelectedId),
      })
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to delete STT profile',
      })
      throw error
    }
  },
  setDefaultProfile: async (id) => {
    set({ saving: true, error: '' })
    try {
      const updated = await setDefaultSTTProfile(id)
      const profiles = get().profiles.map((profile) => ({
        ...profile,
        isDefault: profile.id === updated.id,
      }))
      set({ profiles, saving: false, selectedProfileId: updated.id })
      return updated
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to set default STT profile',
      })
      throw error
    }
  },
  selectProfile: (id) => set({ selectedProfileId: id }),
  reset: () => set(emptyState),
}))
