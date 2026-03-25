/**
 * Convert an ISO timestamp string to a local date string (YYYY-MM-DD)
 * using the given IANA timezone, or fall back to slicing the first 10
 * characters of the ISO string if no timezone is provided.
 */
export function toLocalDate(isoTimestamp: string, tz?: string): string {
  if (tz) {
    try {
      return new Date(isoTimestamp).toLocaleDateString("en-CA", { timeZone: tz });
    } catch {
      // Fall through to slice fallback
    }
  }
  return isoTimestamp.slice(0, 10);
}

/**
 * Return today's date as YYYY-MM-DD in the given timezone, or UTC if none.
 */
export function todayString(timezone?: string): string {
  return toLocalDate(new Date().toISOString(), timezone);
}
