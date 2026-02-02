export interface CalendarEvent {
  uid: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  location?: string
  description?: string
  url?: string
  attendees?: string[]
  recurrence?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
}
