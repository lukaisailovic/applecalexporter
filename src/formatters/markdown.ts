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
        const desc = event.description.trim().replace(/\n/g, ' ')
        lines.push(`  - Notes: ${desc}`)
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
    const existing = grouped.get(dateKey) || []
    existing.push(event)
    grouped.set(dateKey, existing)
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
