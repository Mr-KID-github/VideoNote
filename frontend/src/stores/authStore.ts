import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useModelProfileStore } from './modelProfileStore'
import { useNoteLibraryStore } from './noteLibraryStore'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  initialize: () => Promise<void>
  signUp: (email: string, password: string) => Promise<{ error: Error | null; session: Session | null; user: User | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: false,
      initialized: false,
      initialize: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        set({ session, user: session?.user ?? null, initialized: true })

        supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!nextSession) {
            useModelProfileStore.getState().reset()
            useNoteLibraryStore.getState().reset()
          }
          set({ session: nextSession, user: nextSession?.user ?? null })
        })
      },
      signUp: async (email, password) => {
        set({ loading: true })
        const { data, error } = await supabase.auth.signUp({ email, password })
        set({ loading: false })
        return { error, session: data.session, user: data.user }
      },
      signIn: async (email, password) => {
        set({ loading: true })
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        set({ loading: false })
        return { error }
      },
      signOut: async () => {
        await supabase.auth.signOut()
        useModelProfileStore.getState().reset()
        useNoteLibraryStore.getState().reset()
        set({ user: null, session: null })
      },
    }),
    {
      name: 'vinote-auth',
      partialize: (state) => ({ session: state.session }),
    }
  )
)
