import type { CalendarEvent } from './types'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'

const HELPER_VERSION = 1
const HELPER_BINARY = join(dirname(import.meta.dir), 'dist', `calendar-helper-v${HELPER_VERSION}`)
const SWIFT_SOURCE = join(dirname(import.meta.dir), 'src', 'calendar-helper.swift')

async function ensureHelper(): Promise<string> {
  if (existsSync(HELPER_BINARY)) return HELPER_BINARY

  const proc = Bun.spawn(['swiftc', '-o', HELPER_BINARY, SWIFT_SOURCE], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new Error(`Swift compilation failed: ${stderr.trim()}`)
  }

  return HELPER_BINARY
}

async function runHelper(args: string[]): Promise<string> {
  const binary = await ensureHelper()
  const proc = Bun.spawn([binary, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || 'Calendar helper error')
  }
  return stdout.trim()
}

export async function listCalendars(): Promise<string[]> {
  const result = await runHelper(['list'])
  return JSON.parse(result)
}

export async function fetchEvents(
  calendarName: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const result = await runHelper([
    'fetch',
    calendarName,
    startDate.toISOString(),
    endDate.toISOString(),
  ])

  const raw = JSON.parse(result) as Array<{
    uid: string
    title: string
    start: string
    end: string
    allDay: boolean
    location?: string
    description?: string
    url?: string
    attendees?: string[]
    status?: string
  }>

  return raw.map(e => ({
    uid: e.uid,
    title: e.title,
    start: new Date(e.start),
    end: new Date(e.end),
    allDay: e.allDay,
    location: e.location,
    description: e.description,
    url: e.url,
    attendees: e.attendees,
    status: parseStatus(e.status),
  }))
}

function parseStatus(status?: string): CalendarEvent['status'] {
  if (status === 'confirmed') return 'confirmed'
  if (status === 'tentative') return 'tentative'
  if (status === 'cancelled') return 'cancelled'
  return undefined
}
