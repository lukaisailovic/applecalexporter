import type { CalendarEvent } from '../types'

export function formatJSON(events: CalendarEvent[]): string {
  return JSON.stringify(
    events.map(e => ({
      ...e,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
    })),
    null,
    2
  )
}
