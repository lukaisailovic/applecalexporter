import type { CalendarEvent } from './types'

const DELIMITER = '|||'
const FIELD_DELIMITER = '<<<>>>'

export async function listCalendars(): Promise<string[]> {
  const script = `
set wasRunning to application "Calendar" is running
set output to ""

tell application "Calendar"
  set calNames to {}
  repeat with cal in calendars
    set end of calNames to name of cal
  end repeat
  set AppleScript's text item delimiters to "${DELIMITER}"
  set output to calNames as text
end tell

if not wasRunning then quit application "Calendar"
return output
`
  const result = await runAppleScript(script)
  if (!result.trim()) return []
  return result.split(DELIMITER).map(s => s.trim()).filter(Boolean)
}

export async function fetchEvents(
  calendarName: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const script = `
set wasRunning to application "Calendar" is running

set startDate to current date
set year of startDate to ${startDate.getFullYear()}
set month of startDate to ${startDate.getMonth() + 1}
set day of startDate to ${startDate.getDate()}
set hours of startDate to ${startDate.getHours()}
set minutes of startDate to ${startDate.getMinutes()}
set seconds of startDate to ${startDate.getSeconds()}

set endDate to current date
set year of endDate to ${endDate.getFullYear()}
set month of endDate to ${endDate.getMonth() + 1}
set day of endDate to ${endDate.getDate()}
set hours of endDate to ${endDate.getHours()}
set minutes of endDate to ${endDate.getMinutes()}
set seconds of endDate to ${endDate.getSeconds()}
set output to ""

tell application "Calendar"
  set targetCal to null
  repeat with cal in calendars
    if name of cal is "${escapeAppleScript(calendarName)}" then
      set targetCal to cal
      exit repeat
    end if
  end repeat

  if targetCal is null then
    error "Calendar not found: ${escapeAppleScript(calendarName)}"
  end if

  set eventList to (every event of targetCal whose start date >= startDate and start date < endDate)

  repeat with e in eventList
    set eventUID to uid of e
    set eventSummary to summary of e
    set eventStart to start date of e
    set eventEnd to end date of e
    set eventAllDay to allday event of e

    try
      set eventLocation to location of e
      if eventLocation is missing value then set eventLocation to ""
    on error
      set eventLocation to ""
    end try

    try
      set eventDesc to description of e
      if eventDesc is missing value then set eventDesc to ""
    on error
      set eventDesc to ""
    end try

    try
      set eventUrl to url of e
      if eventUrl is missing value then set eventUrl to ""
    on error
      set eventUrl to ""
    end try

    try
      set eventRecurrence to recurrence of e
      if eventRecurrence is missing value then set eventRecurrence to ""
    on error
      set eventRecurrence to ""
    end try

    try
      set eventStatus to status of e
      if eventStatus is missing value then set eventStatus to "none"
    on error
      set eventStatus to "none"
    end try

    set attendeeNames to ""
    try
      set attendeeList to attendees of e
      if attendeeList is not missing value then
        repeat with a in attendeeList
          try
            set attendeeName to display name of a
            if attendeeName is not missing value then
              if attendeeNames is not "" then
                set attendeeNames to attendeeNames & ","
              end if
              set attendeeNames to attendeeNames & attendeeName
            end if
          end try
        end repeat
      end if
    end try

    set eventLine to eventUID & "${FIELD_DELIMITER}" & eventSummary & "${FIELD_DELIMITER}" & (eventStart as string) & "${FIELD_DELIMITER}" & (eventEnd as string) & "${FIELD_DELIMITER}" & eventAllDay & "${FIELD_DELIMITER}" & eventLocation & "${FIELD_DELIMITER}" & eventDesc & "${FIELD_DELIMITER}" & eventUrl & "${FIELD_DELIMITER}" & eventRecurrence & "${FIELD_DELIMITER}" & eventStatus & "${FIELD_DELIMITER}" & attendeeNames

    if output is "" then
      set output to eventLine
    else
      set output to output & "${DELIMITER}" & eventLine
    end if
  end repeat

end tell

if not wasRunning then quit application "Calendar"
return output
`

  const result = await runAppleScript(script)
  if (!result.trim()) return []

  return result.split(DELIMITER).map(parseEventLine).filter((e): e is CalendarEvent => e !== null)
}

function parseEventLine(line: string): CalendarEvent | null {
  const parts = line.split(FIELD_DELIMITER)
  if (parts.length < 5) return null

  const [uid, title, startStr, endStr, allDayStr, location, description, url, recurrence, status, attendeesStr] = parts

  return {
    uid: uid || crypto.randomUUID(),
    title: title || '(No Title)',
    start: parseAppleScriptDate(startStr!),
    end: parseAppleScriptDate(endStr!),
    allDay: allDayStr === 'true',
    location: location || undefined,
    description: description || undefined,
    url: url || undefined,
    recurrence: recurrence || undefined,
    status: parseStatus(status ?? ''),
    attendees: attendeesStr ? attendeesStr.split(',').filter(Boolean) : undefined,
  }
}

function parseStatus(status: string): CalendarEvent['status'] {
  const normalized = status.toLowerCase()
  if (normalized === 'confirmed') return 'confirmed'
  if (normalized === 'tentative') return 'tentative'
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled'
  return undefined
}

function parseAppleScriptDate(dateStr: string): Date {
  return new Date(dateStr.replace(' at ', ' '))
}

function escapeAppleScript(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function runAppleScript(script: string): Promise<string> {
  const proc = Bun.spawn(['osascript', '-e', script], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  if (exitCode !== 0) {
    throw new Error(`AppleScript error: ${stderr.trim() || 'Unknown error'}`)
  }

  return stdout.trim()
}
