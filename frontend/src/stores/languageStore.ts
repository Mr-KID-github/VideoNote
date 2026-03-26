import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiJson } from '../lib/api'

export type LanguageCode = 'en' | 'zh-CN'

const isLanguageCode = (value: unknown): value is LanguageCode => value === 'en' || value === 'zh-CN'

const detectBrowserLanguage = (): LanguageCode => {
  if (typeof navigator === 'undefined') {
    return 'en'
  }

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  return candidates.some((value) => value.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en'
}

const upsertLanguagePreference = async (language: LanguageCode) => {
  return apiJson<{ language: LanguageCode }>('/api/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
  })
}

const loadLanguagePreference = async () => {
  const data = await apiJson<{ language: LanguageCode | null }>('/api/preferences')
  return isLanguageCode(data?.language) ? data.language : null
}

interface LanguageState {
  language: LanguageCode
  syncing: boolean
  setLanguage: (language: LanguageCode) => Promise<void>
  syncWithAccount: (userId?: string | null) => Promise<void>
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: detectBrowserLanguage(),
      syncing: false,
      setLanguage: async (language) => {
        set({ language })

        try {
          if (get().syncing) {
            return
          }
          await upsertLanguagePreference(language)
        } catch (error) {
          console.error('Failed to save language preference:', error)
        }
      },
      syncWithAccount: async (userId) => {
        if (!userId) {
          set({ syncing: false })
          return
        }

        set({ syncing: true })

        try {
          const remoteLanguage = await loadLanguagePreference()
          if (remoteLanguage) {
            set({ language: remoteLanguage, syncing: false })
            return
          }

          await upsertLanguagePreference(get().language)
        } catch (error) {
          console.error('Failed to sync language preference:', error)
        } finally {
          set({ syncing: false })
        }
      },
    }),
    {
      name: 'vinote-language',
      partialize: (state) => ({ language: state.language }),
    }
  )
)
