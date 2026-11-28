// One colour per meaning, used by badges, the calendar and the analytics status bar:
// waiting (needs staff), agreed, in house, finished, stopped, and a neutral "in progress".
export type Tone = "waiting" | "agreed" | "inhouse" | "finished" | "stopped" | "neutral";

const TONES: Record<string, Tone> = {
  pending: "waiting",
  new: "waiting",
  contacted: "neutral",
  confirmed: "agreed",
  "checked-in": "inhouse",
  "checked-out": "finished",
  cancelled: "stopped",
};
export const toneOf = (status: string): Tone => TONES[status] ?? "neutral";

/** A status always shows its name; the colour dot only reinforces it. */
export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={"adm-status tone-" + toneOf(status)}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
