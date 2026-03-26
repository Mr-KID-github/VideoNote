import { supabase } from './supabase'
import { readRuntimeConfig } from './runtimeConfig'

const API_BASE = readRuntimeConfig('VITE_API_BASE_URL')

export async function apiFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession()
  const headers = new Headers(init.headers ?? {})

  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`)
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  const response = await apiFetch(path, init)
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : payload?.detail || payload?.error_message || 'Request failed'
    throw new Error(message)
  }

  return payload as T
}
