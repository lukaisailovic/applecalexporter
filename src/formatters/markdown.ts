import type { CalendarEvent } from '../types'

export function formatMarkdown(events: CalendarEvent[]): string {
  if (events.length === 0) {
    return '_No events found._'
  }

  const grouped = groupByDate(events)
  const lines: string[] = []

  for (const [dateKey, dayEvents] of grouped) {
    lines.push(`## ${dateKey}`)
    lines.push('')

    for (const event of dayEvents) {
      const timeStr = formatTimeRange(event)
      lines.push(`- **${timeStr}** ${event.title}`)

      if (event.location) {
        lines.push(`  - Location: ${event.location}`)
      }
      if (event.description) {
        const desc = cleanDescription(event.description)
        if (desc) {
          lines.push(`  - Notes: ${desc}`)
        }
      }
      if (event.url) {
        lines.push(`  - URL: ${event.url}`)
      }
      if (event.attendees && event.attendees.length > 0) {
        lines.push(`  - Attendees: ${event.attendees.join(', ')}`)
      }
      if (event.status && event.status !== 'confirmed') {
        lines.push(`  - Status: ${event.status}`)
      }
    }

    lines.push('')
  }

  return lines.join('\n').trimEnd()
}

function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()

  for (const event of events) {
    const dateKey = formatDateHeader(event.start)
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }
    grouped.get(dateKey)!.push(event)
  }

  return grouped
}

function formatDateHeader(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTimeRange(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All Day'
  }

  const startTime = formatTime(event.start)
  const endTime = formatTime(event.end)
  return `${startTime} - ${endTime}`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function cleanDescription(desc: string): string {
  let cleaned = desc
  // Remove Google Meet boilerplate block (between markers)
  cleaned = cleaned.replace(/-::~:~::[\s\S]*?::~:~::-/g, '')
  // Remove Google Meet join info that might be outside markers
  cleaned = cleaned.replace(/Join with Google Meet:[\s\S]*?Please do not edit this section\./gi, '')
  // Remove standalone meet links and dial info
  cleaned = cleaned.replace(/https:\/\/meet\.google\.com\/\S+/g, '')
  cleaned = cleaned.replace(/Or dial:.*?#/g, '')
  cleaned = cleaned.replace(/More phone numbers:.*$/gm, '')
  cleaned = cleaned.replace(/Learn more about Meet at:.*$/gm, '')
  // Collapse whitespace and newlines
  return cleaned.replace(/\s+/g, ' ').trim()
}
