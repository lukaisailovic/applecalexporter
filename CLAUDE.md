# applecalexporter

CLI tool to export Apple Calendar events to JSON or Markdown via AppleScript.

## Commands

```bash
bun install           # Install deps
bun link              # Link globally as 'applecalexporter'
applecalexporter -h   # Show help
```

## Architecture

```
src/
├── index.ts          # CLI entry (citty), date filtering, deduplication
├── calendar.ts       # AppleScript execution via osascript
├── formatters/
│   ├── json.ts       # JSON output with ISO dates
│   └── markdown.ts   # Markdown grouped by date
└── types.ts          # CalendarEvent interface
```

## Key Details

- AppleScript queries Calendar.app and returns delimiter-separated data
- Recurring events: Apple Calendar returns occurrences, but also returns master events with original dates - filtering in JS is required
- Deduplication by `uid + start timestamp` handles edge cases
- Uses `citty` for CLI arg parsing with auto-generated help
