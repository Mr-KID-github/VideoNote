import { createClient } from '@supabase/supabase-js'
import { readRuntimeConfig } from './runtimeConfig'

const supabaseUrl = readRuntimeConfig('VITE_SUPABASE_URL')
const supabaseAnonKey = readRuntimeConfig('VITE_SUPABASE_ANON_KEY')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
