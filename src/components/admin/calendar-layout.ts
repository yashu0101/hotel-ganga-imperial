// Month-grid layout for the admin calendar: Monday-first weeks, and bookings packed into lanes
// within each week so overlapping stays sit on separate rows. Dates are YYYY-MM-DD strings.

const DAY = 86_400_000;
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const ms = (day: string) => Date.parse(day + "T00:00:00Z");

/** The weeks (Monday to Sunday) that cover a month, given as YYYY-MM. */
export function monthWeeks(month: string): string[][] {
  const first = ms(month + "-01");
  const [year, mon] = month.split("-").map(Number);
  const last = Date.UTC(year, mon, 0);
  let cursor = first - ((new Date(first).getUTCDay() + 6) % 7) * DAY;
  const weeks: string[][] = [];
  while (cursor <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => toDay(cursor + i * DAY)));
    cursor += 7 * DAY;
  }
  return weeks;
}

export interface LaneItem {
  id: string;
  /** First night (or the event day). */
  start: string;
  /** Last night, inclusive. */
  end: string;
}
export interface Segment {
  id: string;
  lane: number;
  /** Day index in the week, 0 = Monday. */
  from: number;
  to: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/**
 * Places the items that touch this week into lanes: earliest first, longer first on the same day, each in the
 * first lane that is free by then. Items that do not fit in `maxLanes` are counted per day in `hidden`.
 */
export function layoutWeek(week: string[], items: LaneItem[], maxLanes: number) {
  const first = week[0],
    last = week[6];
  const pieces = items
    .filter(item => item.start <= last && item.end >= first)
    .map((item, order) => {
      const start = item.start < first ? first : item.start,
        end = item.end > last ? last : item.end;
      return {
        id: item.id,
        order,
        from: week.indexOf(start),
        to: week.indexOf(end),
        continuesBefore: item.start < first,
        continuesAfter: item.end > last,
      };
    })
    .sort((a, b) => a.from - b.from || b.to - b.from - (a.to - a.from) || a.order - b.order);

  const laneEnds: number[] = [];
  const segments: Segment[] = [];
  const hidden = Array<number>(7).fill(0);
  for (const { id, from, to, continuesBefore, continuesAfter } of pieces) {
    let lane = laneEnds.findIndex(end => end < from);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = to;
    if (lane < maxLanes) segments.push({ id, lane, from, to, continuesBefore, continuesAfter });
    else for (let d = from; d <= to; d++) hidden[d]++;
  }
  return { segments, hidden };
}

/**
 * The room type a booking is for, matched by id (or, for older requests, by name) against every room type,
 * including hidden ones: hiding a room from the website doesn't move the guests already booked into it.
 */
export function roomFor<R extends { id?: string; name: string }>(
  b: { roomId?: string; roomType: string },
  rooms: R[],
): R | undefined {
  return rooms.find(r => (b.roomId ? b.roomId === r.id : b.roomType === r.name));
}

/**
 * The last day a booking occupies. A room stay ends the night before check-out; an event's end date is a day of
 * the event; a booking without an end date is a single day.
 */
export function lastDay(b: { checkin: string; checkout: string }, roomStay: boolean) {
  if (!b.checkout || b.checkout <= b.checkin) return b.checkin;
  if (!roomStay) return b.checkout;
  return new Date(ms(b.checkout) - DAY).toISOString().slice(0, 10);
}
