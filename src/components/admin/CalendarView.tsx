"use client";

import { useState } from "react";
import type { Booking, Room } from "@/lib/types";

const pad = (n: number) => String(n).padStart(2, "0");
const ACTIVE = new Set(["pending", "confirmed", "checked-in"]);
const HELD = new Set(["confirmed", "checked-in"]);

/** Nights a stay covers: check-in up to, not including, check-out. Single-day requests cover the check-in day. */
function covers(b: Booking, day: string) {
  return b.checkin <= day && (b.checkout ? day < b.checkout : day === b.checkin);
}

/**
 * Month view of room requests. Requests do not reserve inventory, so cells show how many rooms are
 * requested per night (pending + confirmed), highlighting nights where some are confirmed.
 */
export default function CalendarView({ bookings, rooms }: { bookings: Booking[]; rooms: Room[] }) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = view.getFullYear(),
    month = view.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`);
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const roomNames = rooms.filter(r => !r.hidden).map(r => r.name);
  const active = bookings.filter(b => ACTIVE.has(b.bookingStatus) && roomNames.includes(b.roomType));

  const cell = (room: string, day: string) => {
    const hits = active.filter(b => b.roomType === room && covers(b, day));
    return {
      hits,
      rooms: hits.reduce((sum, b) => sum + (b.roomsRequested || 1), 0),
      held: hits.some(b => HELD.has(b.bookingStatus)),
    };
  };

  return (
    <section aria-label="Room request calendar">
      <div className="adm-cal-nav">
        <button className="adm-btn" onClick={() => setOffset(m => m - 1)} aria-label="Previous month">
          ←
        </button>
        <strong>{view.toLocaleString("en-IN", { month: "long", year: "numeric" })}</strong>
        <button className="adm-btn" onClick={() => setOffset(m => m + 1)} aria-label="Next month">
          →
        </button>
        {offset !== 0 && (
          <button className="adm-btn" onClick={() => setOffset(0)}>
            This month
          </button>
        )}
      </div>
      <div className="adm-cal-scroll">
        <table className="adm-table adm-cal">
          <thead>
            <tr>
              <th scope="col">Room</th>
              {days.map((d, i) => (
                <th key={d} scope="col" className={d === today ? "today" : undefined}>
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roomNames.map(room => (
              <tr key={room}>
                <th scope="row">{room}</th>
                {days.map(d => {
                  const c = cell(room, d);
                  return (
                    <td
                      key={d}
                      className={c.rooms ? (c.held ? "held" : "requested") : undefined}
                      title={c.hits
                        .map(b => `${b.name} · ${b.bookingStatus} (${b.checkin} → ${b.checkout || b.checkin})`)
                        .join("\n")}
                    >
                      {c.rooms || ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="adm-cal-legend">
        <span className="requested">Requested only</span>
        <span className="held">Includes confirmed or checked-in</span>
        Numbers are rooms requested per night. Requests do not reserve rooms until you confirm them.
      </p>
    </section>
  );
}
