import type { Booking } from "@/lib/types";
import { BOOKING_STATUSES } from "@/lib/validation";

// Request volume only: no payments are taken on this site, so there is no revenue to chart.
const COLORS: Record<string, string> = {
  pending: "#E2C68E",
  confirmed: "#9ccbec",
  "checked-in": "#93e3a0",
  "checked-out": "#c4c4c4",
  cancelled: "#8d8d8d",
};

function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bar-chart">
      {data.map(d => (
        <div key={d.label} className="bar-col">
          <div className="bar-value">{d.value}</div>
          <div className="bar-fill" style={{ height: `${(d.value / max) * 130}px` }} />
          <div className="bar-label" title={d.label}>
            {d.label.length > 12 ? d.label.slice(0, 12) + "…" : d.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Analytics({ bookings, t }: { bookings: Booking[]; t: (key: string) => string }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const perDay = days.map(day => ({
    label: day.slice(5),
    value: bookings.filter(b => b.createdAt.slice(0, 10) === day).length,
  }));
  const perRoom = Object.entries(
    bookings.reduce<Record<string, number>>((acc, b) => ({ ...acc, [b.roomType]: (acc[b.roomType] || 0) + 1 }), {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const total = Math.max(bookings.length, 1);
  const shares = BOOKING_STATUSES.map(s => ({
    status: s,
    pct: (bookings.filter(b => b.bookingStatus === s).length / total) * 100,
  }));
  const arcs = shares
    .map((share, i) => ({ ...share, offset: shares.slice(0, i).reduce((sum, x) => sum + x.pct, 0) }))
    .filter(x => x.pct > 0);
  return (
    <>
      <h2>{t("admin.analytics")}</h2>
      <div className="chart-wrap">
        <div className="chart-card">
          <h3>{t("admin.bookingsOverTime")}</h3>
          <Bars data={perDay} />
        </div>
        <div className="chart-card">
          <h3>{t("admin.bookingStatus")}</h3>
          <div className="donut-wrap">
            <svg width="140" height="140" viewBox="0 0 42 42" role="img" aria-label={t("admin.bookingStatus")}>
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="#252d42" strokeWidth="6" />
              {arcs.map(a => (
                <circle
                  key={a.status}
                  cx="21"
                  cy="21"
                  r="15.9"
                  fill="none"
                  stroke={COLORS[a.status]}
                  strokeWidth="6"
                  strokeDasharray={`${a.pct} ${100 - a.pct}`}
                  strokeDashoffset={-a.offset}
                />
              ))}
            </svg>
            <div className="donut-legend">
              {BOOKING_STATUSES.map(s => (
                <span key={s}>
                  <i style={{ background: COLORS[s] }} />
                  {t("admin.status." + s)}: {bookings.filter(b => b.bookingStatus === s).length}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="chart-card">
          <h3>{t("admin.requestsByRoom")}</h3>
          {perRoom.length ? <Bars data={perRoom} /> : <p className="adm-note">{t("admin.empty")}</p>}
        </div>
      </div>
    </>
  );
}
