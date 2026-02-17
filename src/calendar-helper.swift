import EventKit
import Foundation

let store = EKEventStore()
let semaphore = DispatchSemaphore(value: 0)
var accessGranted = false

if #available(macOS 14.0, *) {
    store.requestFullAccessToEvents { granted, _ in
        accessGranted = granted
        semaphore.signal()
    }
} else {
    store.requestAccess(to: .event) { granted, _ in
        accessGranted = granted
        semaphore.signal()
    }
}
semaphore.wait()

guard accessGranted else {
    fputs("Calendar access denied. Grant access in System Settings > Privacy & Security > Calendars.\n", stderr)
    exit(1)
}

let args = CommandLine.arguments

if args.count == 2 && args[1] == "list" {
    let names = store.calendars(for: .event).map { $0.title }
    let data = try! JSONSerialization.data(withJSONObject: names)
    print(String(data: data, encoding: .utf8)!)
    exit(0)
}

guard args.count == 5 && args[1] == "fetch" else {
    fputs("Usage: calendar-helper list | fetch <calendar> <start-iso> <end-iso>\n", stderr)
    exit(1)
}

let calendarName = args[2]
let startISO = args[3]
let endISO = args[4]

let isoWithFrac = ISO8601DateFormatter()
isoWithFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

let isoNoFrac = ISO8601DateFormatter()
isoNoFrac.formatOptions = [.withInternetDateTime]

func parseISO(_ str: String) -> Date? {
    isoWithFrac.date(from: str) ?? isoNoFrac.date(from: str)
}

guard let startDate = parseISO(startISO), let endDate = parseISO(endISO) else {
    fputs("Invalid date format. Use ISO 8601.\n", stderr)
    exit(1)
}

guard let calendar = store.calendars(for: .event).first(where: { $0.title == calendarName }) else {
    let available = store.calendars(for: .event).map { $0.title }.joined(separator: ", ")
    fputs("Calendar not found: \(calendarName). Available: \(available)\n", stderr)
    exit(1)
}

let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: [calendar])
let events = store.events(matching: predicate)

let outFormatter = ISO8601DateFormatter()
outFormatter.formatOptions = [.withInternetDateTime]

var output: [[String: Any]] = []
for event in events {
    var dict: [String: Any] = [
        "uid": event.calendarItemIdentifier,
        "title": event.title ?? "(No Title)",
        "start": outFormatter.string(from: event.startDate),
        "end": outFormatter.string(from: event.endDate),
        "allDay": event.isAllDay
    ]

    if let location = event.location, !location.isEmpty {
        dict["location"] = location
    }
    if let notes = event.notes, !notes.isEmpty {
        dict["description"] = notes
    }
    if let url = event.url {
        dict["url"] = url.absoluteString
    }
    if let attendees = event.attendees {
        let names = attendees.compactMap { $0.name }.filter { !$0.isEmpty }
        if !names.isEmpty {
            dict["attendees"] = names
        }
    }

    switch event.status {
    case .confirmed: dict["status"] = "confirmed"
    case .tentative: dict["status"] = "tentative"
    case .canceled: dict["status"] = "cancelled"
    default: break
    }

    output.append(dict)
}

let data = try! JSONSerialization.data(withJSONObject: output)
print(String(data: data, encoding: .utf8)!)
