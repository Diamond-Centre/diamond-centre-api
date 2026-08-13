export function formatDate(value: unknown): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value);
}

/** Normalize PG TIME / string to `HH:MM`. */
export function formatTime(value: unknown): string {
  if (value == null) return "09:00";
  if (typeof value === "string") {
    const m = value.match(/^(\d{1,2}):(\d{2})/);
    if (m) {
      return `${m[1].padStart(2, "0")}:${m[2]}`;
    }
    return value.slice(0, 5);
  }
  if (value instanceof Date) {
    const h = String(value.getHours()).padStart(2, "0");
    const min = String(value.getMinutes()).padStart(2, "0");
    return `${h}:${min}`;
  }
  return "09:00";
}

export function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

/** Calendar date (YYYY-MM-DD) in the server's local timezone. */
export function todayDate(): string {
  return formatDate(new Date());
}

/** True when the calendar date is strictly before today. */
export function isDateBeforeToday(value: unknown): boolean {
  return formatDate(value) < todayDate();
}
