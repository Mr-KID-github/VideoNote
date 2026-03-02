import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  initialize: () => Promise<void>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
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

        supabase.auth.onAuthStateChange((_event, session) => {
          set({ session, user: session?.user ?? null })
        })
      },
      signUp: async (email, password) => {
        set({ loading: true })
        const { error } = await supabase.auth.signUp({ email, password })
        set({ loading: false })
        return { error }
      },
      signIn: async (email, password) => {
        set({ loading: true })
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        set({ loading: false })
        return { error }
      },
      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null })
      },
    }),
    {
      name: 'videonote-auth',
      partialize: (state) => ({ session: state.session }),
    }
  )
)
