#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty'
import { RRule, rrulestr } from 'rrule'
import { listCalendars, fetchEvents } from './calendar'
import { formatJSON } from './formatters/json'
import { formatMarkdown } from './formatters/markdown'
import type { CalendarEvent } from './types'

const main = defineCommand({
  meta: {
    name: 'applecalexporter',
    description: 'Export Apple Calendar events to JSON or Markdown',
  },
  args: {
    calendar: {
      type: 'string',
      alias: 'c',
      description: 'Calendar name',
    },
    days: {
      type: 'string',
      alias: 'd',
      default: '7',
      description: 'Days to export including today',
    },
    output: {
      type: 'string',
      alias: 'o',
      default: 'json',
      description: 'Output format: json | md',
    },
    file: {
      type: 'string',
      description: 'Write to file instead of stdout',
    },
    'list-calendars': {
      type: 'boolean',
      alias: 'l',
      description: 'List available calendar names',
    },
  },
  run: async ({ args }) => {
    if (args['list-calendars']) {
      const calendars = await listCalendars()
      if (calendars.length === 0) {
        console.log('No calendars found.')
      } else {
        console.log('Available calendars:')
        for (const name of calendars) {
          console.log(`  - ${name}`)
        }
      }
      return
    }

    if (!args.calendar) {
      console.error('Error: --calendar is required')
      console.error('Use --list-calendars to see available calendars')
      process.exit(1)
    }

    const days = parseInt(args.days, 10)
    if (isNaN(days) || days < 1) {
      console.error('Error: --days must be a positive integer')
      process.exit(1)
    }

    if (args.output !== 'json' && args.output !== 'md') {
      console.error('Error: --output must be "json" or "md"')
      process.exit(1)
    }

    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + days)

    const events = await fetchEvents(args.calendar, startDate, endDate)
    const expanded = expandRecurringEvents(events, startDate, endDate)
    const deduplicated = deduplicateEvents(expanded)

    const output = args.output === 'md' ? formatMarkdown(deduplicated) : formatJSON(deduplicated)

    if (args.file) {
      await Bun.write(args.file, output)
      console.error(`Written to ${args.file}`)
    } else {
      console.log(output)
    }
  },
})

function expandRecurringEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const result: CalendarEvent[] = []

  for (const event of events) {
    if (!event.recurrence) {
      if (event.start >= rangeStart && event.start < rangeEnd) {
        result.push(event)
      }
      continue
    }

    const duration = event.end.getTime() - event.start.getTime()
    const rule = rrulestr(`DTSTART:${toRRuleDateStr(event.start)}\nRRULE:${event.recurrence}`)
    const occurrences = rule.between(rangeStart, rangeEnd, true)

    for (const occurrence of occurrences) {
      if (occurrence >= rangeEnd) continue
      result.push({
        ...event,
        start: occurrence,
        end: new Date(occurrence.getTime() + duration),
      })
    }
  }

  return result
}

function toRRuleDateStr(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function deduplicateEvents<T extends { uid: string; start: Date }>(events: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []

  for (const event of events) {
    const key = `${event.uid}-${event.start.getTime()}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(event)
  }

  return result.sort((a, b) => a.start.getTime() - b.start.getTime())
}

runMain(main)
