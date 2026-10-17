/** Structured JSON logs (one line per event) for the hosting platform's log search. */
type Level = "info" | "warn" | "error";

export function log(level: Level, event: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
