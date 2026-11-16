/** decodeURIComponent that returns the raw value instead of throwing on malformed input (e.g. `%E0`). */
export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
