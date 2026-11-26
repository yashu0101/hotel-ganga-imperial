// One JSON line per event, so Vercel's log search and log drains (or any alerting attached to them) can filter on
// `level` and `event`. Never pass guest details here: only ids, routes and error messages.
type Fields = Record<string, string | number | boolean | undefined>;

function write(level: "error" | "warn", event: string, fields: Fields) {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else console.warn(line);
}
export function logError(event: string, error: unknown, fields: Fields = {}) {
  write("error", event, {
    ...fields,
    error: error instanceof Error ? error.name + ": " + error.message : String(error),
  });
}
export function logWarning(event: string, fields: Fields = {}) {
  write("warn", event, fields);
}
