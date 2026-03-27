import { resolveContentUrl } from './videoLinks'

export interface KeyMoment {
  anchorId: string
  title: string
  timestampLabel: string
  seconds: number
  imageUrl?: string
  excerpt?: string
  level: number
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/
const TIMESTAMP_LINK_RE = /\[(\d{1,2}:\d{2})(?:-\d{1,2}:\d{2})?\]\(([^)]+)\)/
const IMAGE_RE = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/

export function slugifyHeadingText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
}

export function parseKeyMoments(content: string) {
  const lines = content.split('\n')
  const sections: Array<{ level: number; heading: string; body: string[] }> = []
  let current: { level: number; heading: string; body: string[] } | null = null

  for (const line of lines) {
    const headingMatch = line.match(HEADING_RE)
    if (headingMatch) {
      if (current) {
        sections.push(current)
      }
      current = {
        level: headingMatch[1].length,
        heading: headingMatch[2],
        body: [],
      }
      continue
    }

    if (current) {
      current.body.push(line)
    }
  }

  if (current) {
    sections.push(current)
  }

  const moments: KeyMoment[] = []

  for (const section of sections) {
    if (section.level < 2) {
      continue
    }

      const timestampMatch = findTimestampMatch(section.heading, section.body)
      if (!timestampMatch) {
        continue
      }

      const plainHeading = stripMarkdown(section.heading)
      const imageUrl = findImage(section.body)
      const excerpt = findExcerpt(section.body)

      moments.push({
        anchorId: slugifyHeadingText(plainHeading),
        title: plainHeading.replace(timestampMatch.label, '').trim(),
        timestampLabel: timestampMatch.label,
        seconds: timestampMatch.seconds,
        imageUrl: imageUrl ? resolveContentUrl(imageUrl) : undefined,
        excerpt,
        level: section.level,
      })
  }

  return moments
}

export function findActiveKeyMoment(moments: KeyMoment[], currentTimestamp: number) {
  let active: KeyMoment | null = null

  for (const moment of moments) {
    if (moment.seconds <= currentTimestamp) {
      active = moment
      continue
    }
    break
  }

  return active
}

function findTimestampMatch(heading: string, body: string[]) {
  const headingMatch = heading.match(TIMESTAMP_LINK_RE)
  if (headingMatch) {
    return {
      label: headingMatch[1],
      seconds: parseSeconds(headingMatch[1], headingMatch[2]),
    }
  }

  for (const line of body) {
    const lineMatch = line.match(TIMESTAMP_LINK_RE)
    if (lineMatch) {
      return {
        label: lineMatch[1],
        seconds: parseSeconds(lineMatch[1], lineMatch[2]),
      }
    }
  }

  return null
}

function parseSeconds(label: string, href: string) {
  const queryMatch = href.match(/[?&](?:t|start|time_continue)=(\d+)/)
  if (queryMatch) {
    return Number.parseInt(queryMatch[1], 10)
  }

  const [minutes, seconds] = label.split(':').map((value) => Number.parseInt(value, 10))
  return minutes * 60 + seconds
}

function findImage(lines: string[]) {
  for (const line of lines) {
    const imageMatch = line.match(IMAGE_RE)
    if (imageMatch) {
      return imageMatch[1]
    }
  }
  return undefined
}

function findExcerpt(lines: string[]) {
  for (const line of lines) {
    if (!line.trim()) {
      continue
    }
    if (IMAGE_RE.test(line)) {
      continue
    }

    const excerpt = stripMarkdown(line)
    if (excerpt) {
      return excerpt.length > 140 ? `${excerpt.slice(0, 137)}...` : excerpt
    }
  }

  return undefined
}

function stripMarkdown(text: string) {
  return text
    .replace(TIMESTAMP_LINK_RE, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`>#]/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
