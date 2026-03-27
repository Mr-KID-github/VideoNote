import { readRuntimeConfig } from './runtimeConfig'

const API_BASE = readRuntimeConfig('VITE_API_BASE_URL')

function normalizeSeconds(seconds: number) {
  return Math.max(0, Math.floor(seconds))
}

export function formatTimestampLabel(seconds: number) {
  const totalSeconds = normalizeSeconds(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function resolveContentUrl(url: string) {
  if (!url.startsWith('/')) {
    return url
  }
  return API_BASE ? `${API_BASE}${url}` : url
}

export function buildVideoJumpUrl(videoUrl: string, seconds: number) {
  const url = new URL(resolveContentUrl(videoUrl), window.location.origin)
  url.searchParams.set('t', String(normalizeSeconds(seconds)))
  return url.toString()
}

export function extractSecondsFromHref(href: string) {
  try {
    const url = new URL(href, window.location.origin)
    const value =
      url.searchParams.get('t') ||
      url.searchParams.get('start') ||
      url.searchParams.get('time_continue')

    if (!value) {
      return null
    }

    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? normalizeSeconds(parsed) : null
  } catch {
    return null
  }
}

function extractBilibiliBvid(pathname: string) {
  return pathname
    .split('/')
    .filter(Boolean)
    .find((part) => part.startsWith('BV'))
}

export function isSameVideoTarget(href: string, videoUrl: string) {
  try {
    const left = new URL(href, window.location.origin)
    const right = new URL(resolveContentUrl(videoUrl), window.location.origin)
    const leftHost = left.hostname.replace(/^www\./, '')
    const rightHost = right.hostname.replace(/^www\./, '')

    if (leftHost !== rightHost) {
      return false
    }

    if (leftHost.includes('youtu')) {
      return (
        left.searchParams.get('v') === right.searchParams.get('v') ||
        left.pathname.replace(/\//g, '') === right.pathname.replace(/\//g, '')
      )
    }

    if (leftHost.includes('bilibili') || leftHost.includes('b23.tv')) {
      return extractBilibiliBvid(left.pathname) === extractBilibiliBvid(right.pathname)
    }

    return `${left.origin}${left.pathname}` === `${right.origin}${right.pathname}`
  } catch {
    return false
  }
}

export function isLocalMediaHref(href: string) {
  try {
    const url = new URL(href, window.location.origin)
    return (
      url.pathname.includes('/api/notes/') && url.pathname.endsWith('/media')
    ) || (
      url.pathname.includes('/api/task/') && url.pathname.includes('/artifacts/media/')
    )
  } catch {
    return false
  }
}

export function buildEmbedUrl(videoUrl: string, seconds = 0) {
  try {
    const url = new URL(resolveContentUrl(videoUrl), window.location.origin)
    const host = url.hostname.replace(/^www\./, '')
    const offset = normalizeSeconds(seconds)

    if (isLocalMediaHref(url.toString())) {
      return null
    }

    if (host === 'youtu.be') {
      const videoId = url.pathname.replace(/^\/+/, '')
      return videoId ? `https://www.youtube.com/embed/${videoId}?start=${offset}` : null
    }

    if (host.includes('youtube.com')) {
      const videoId = url.searchParams.get('v')
      return videoId ? `https://www.youtube.com/embed/${videoId}?start=${offset}` : null
    }

    if (host.includes('bilibili.com') || host.includes('b23.tv')) {
      const bvid = extractBilibiliBvid(url.pathname)
      if (!bvid) {
        return null
      }
      return `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&as_wide=1&high_quality=1&danmaku=0&t=${offset}`
    }

    return null
  } catch {
    return null
  }
}
