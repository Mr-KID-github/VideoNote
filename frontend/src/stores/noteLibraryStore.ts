import { create } from 'zustand'
import { supabase } from '../lib/supabase'

type NoteRow = {
  id: string
  title: string
  content: string
  video_url: string | null
  source_type: string | null
  task_id: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface NoteRecord {
  id: string
  title: string
  content: string
  videoUrl?: string
  sourceType?: string
  taskId?: string
  status: string
  createdAt: string
  updatedAt: string
}

interface NoteLibraryState {
  notes: NoteRecord[]
  loading: boolean
  error: string
  loadNotes: () => Promise<void>
  loadNoteById: (id: string) => Promise<NoteRecord | null>
  saveNote: (title: string, content: string, videoUrl?: string) => Promise<NoteRecord | null>
  updateNote: (id: string, title: string, content: string) => Promise<NoteRecord | null>
  deleteNote: (id: string) => Promise<void>
  reset: () => void
}

const initialState = {
  notes: [] as NoteRecord[],
  loading: false,
  error: '',
}

const mapRow = (row: NoteRow): NoteRecord => ({
  id: row.id,
  title: row.title,
  content: row.content ?? '',
  videoUrl: row.video_url ?? undefined,
  sourceType: row.source_type ?? undefined,
  taskId: row.task_id ?? undefined,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const useNoteLibraryStore = create<NoteLibraryState>((set, get) => ({
  ...initialState,
  loadNotes: async () => {
    set({ loading: true, error: '' })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ notes: [], loading: false })
        return
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      set({ notes: (data as NoteRow[] | null)?.map(mapRow) ?? [], loading: false })
    } catch (error) {
      console.error('Failed to load notes:', error)
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load notes',
      })
    }
  },
  loadNoteById: async (id) => {
    const existing = get().notes.find((note) => note.id === id)
    if (existing) {
      return existing
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      const note = mapRow(data as NoteRow)
      set((state) => ({
        notes: state.notes.some((item) => item.id === note.id) ? state.notes : [note, ...state.notes],
      }))
      return note
    } catch (error) {
      console.error('Failed to load note:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to load note',
      })
      return null
    }
  },
  saveNote: async (title, content, videoUrl) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User is not logged in')
      }

      const { data, error } = await supabase
        .from('notes')
        .insert({
          title,
          content,
          video_url: videoUrl || null,
          source_type: videoUrl ? 'video' : 'file',
          status: 'done',
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      const note = mapRow(data as NoteRow)
      set((state) => ({
        notes: [note, ...state.notes.filter((item) => item.id !== note.id)],
        error: '',
      }))
      return note
    } catch (error) {
      console.error('Failed to save note:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to save note',
      })
      return null
    }
  },
  updateNote: async (id, title, content) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update({ title, content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }

      const note = mapRow(data as NoteRow)
      set((state) => ({
        notes: state.notes.map((item) => (item.id === id ? note : item)),
        error: '',
      }))
      return note
    } catch (error) {
      console.error('Failed to update note:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to update note',
      })
      return null
    }
  },
  deleteNote: async (id) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      set((state) => ({
        notes: state.notes.filter((item) => item.id !== id),
        error: '',
      }))
    } catch (error) {
      console.error('Failed to delete note:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to delete note',
      })
    }
  },
  reset: () => set(initialState),
}))
