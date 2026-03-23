import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export type LanguageCode = 'en' | 'zh-CN'

const isLanguageCode = (value: unknown): value is LanguageCode => value === 'en' || value === 'zh-CN'

const detectBrowserLanguage = (): LanguageCode => {
  if (typeof navigator === 'undefined') {
    return 'en'
  }

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  return candidates.some((value) => value.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en'
}

const upsertLanguagePreference = async (userId: string, language: LanguageCode) => {
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        language,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    throw error
  }
}

const loadLanguagePreference = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('language')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

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
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await upsertLanguagePreference(user.id, language)
          }
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
          const remoteLanguage = await loadLanguagePreference(userId)
          if (remoteLanguage) {
            set({ language: remoteLanguage, syncing: false })
            return
          }

          await upsertLanguagePreference(userId, get().language)
        } catch (error) {
          console.error('Failed to sync language preference:', error)
        } finally {
          set({ syncing: false })
        }
      },
    }),
    {
      name: 'videonote-language',
      partialize: (state) => ({ language: state.language }),
    }
  )
)
