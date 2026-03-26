type RuntimeConfig = {
  VITE_API_BASE_URL?: string
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

declare global {
  interface Window {
    __VINOTE_CONFIG__?: RuntimeConfig
  }
}

const runtimeConfig: RuntimeConfig =
  typeof window !== 'undefined' ? window.__VINOTE_CONFIG__ || {} : {}

export function readRuntimeConfig(key: keyof RuntimeConfig) {
  const runtimeValue = runtimeConfig[key]
  if (runtimeValue && runtimeValue.trim()) {
    return runtimeValue
  }

  return import.meta.env[key] || ''
}
