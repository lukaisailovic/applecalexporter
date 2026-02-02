# applecalexporter

CLI tool to export Apple Calendar events to JSON or Markdown.

## Install

```bash
bun install
bun link
```

## Usage

```bash
# List available calendars
applecalexporter --list-calendars

# Export next 7 days from "Work" calendar as JSON
applecalexporter -c "Work" -d 7

# Export next 14 days as Markdown
applecalexporter -c "Personal" -d 14 -o md > calendar.md

# Pipe to jq for filtering
applecalexporter -c "Work" -d 7 | jq '.[] | select(.allDay == false)'
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `-c, --calendar <name>` | Calendar name | required |
| `-d, --days <n>` | Days to export (including today) | 7 |
| `-o, --output <format>` | Output format: json, md | json |
| `--file <path>` | Write to file instead of stdout | - |
| `--list-calendars` | List available calendars | - |
| `-h, --help` | Show help | - |
