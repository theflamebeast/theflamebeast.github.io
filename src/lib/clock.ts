// ICU puts U+202F (narrow no-break space) before AM/PM; text that compares or wraps expects a space.
export function formatLocalTime(date: Date, timeZone = 'America/New_York'): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  })
    .format(date)
    .replace(/ /g, ' ');
}
