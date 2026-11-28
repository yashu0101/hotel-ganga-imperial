"use client";
import { useState } from "react";
import { useApp } from "@/lib/context";
import type { Booking, Room } from "@/lib/types";
import { BOOKING_STATUSES } from "@/lib/validation";
import { addDays, counted, daysBetween, fill, formatDay, hotelDay, localeFor } from "./format";
import { toneOf } from "./status";

// Request volume only: no payments are taken on this site, so there is no revenue to chart.
// Every chart has a table behind it (visually hidden or the chart itself), so nothing is
// carried by colour alone.
const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];
const STAYED = new Set(["confirmed", "checked-in", "checked-out"]);

function Bars({
  rows,
  caption,
  valueLabel,
}: {
  rows: { label: string; value: number }[];
  caption: string;
  valueLabel: string;
}) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <table className="adm-hbars">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{caption}</th>
          <th scope="col">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.label}>
            <th scope="row" title={r.label}>
              {r.label}
            </th>
            <td>
              <span className="track">
                <span className="fill" style={{ width: `${(r.value / max) * 100}%` }} />
              </span>
              <span className="value">{r.value}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Analytics({ bookings, rooms }: { bookings: Booking[]; rooms: Room[] }) {
  const { t, lang } = useApp();
  const locale = localeFor(lang);
  const [range, setRange] = useState<Range>(30);
  const today = hotelDay();
  const since = addDays(today, -(range - 1));
  const dayOf = (b: Booking) => hotelDay(0, Date.parse(b.createdAt));
  const inRange = bookings.filter(b => dayOf(b) >= since);
  const total = inRange.length;

  // Requests for a room count under its current name, even if it was renamed after they were sent.
  const roomName = (b: Booking) => rooms.find(r => r.id && r.id === b.roomId)?.name ?? b.roomType;
  const perDay = Array.from({ length: range }, (_, i) => {
    const day = addDays(since, i);
    return { day, value: inRange.filter(b => dayOf(b) === day).length };
  });
  const dayMax = Math.max(...perDay.map(d => d.value), 1);
  const yTop = dayMax <= 4 ? dayMax : Math.ceil(dayMax / 5) * 5;
  const perRoom = Object.entries(
    inRange.reduce<Record<string, number>>((acc, b) => ({ ...acc, [roomName(b)]: (acc[roomName(b)] || 0) + 1 }), {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const statusCounts = BOOKING_STATUSES.map(s => ({ status: s, n: inRange.filter(b => b.bookingStatus === s).length }));
  const leadBuckets: [string, (d: number) => boolean][] = [
    [t("admin.lead.soon"), d => d <= 1],
    [t("admin.lead.week"), d => d >= 2 && d <= 7],
    [t("admin.lead.month"), d => d >= 8 && d <= 30],
    [t("admin.lead.later"), d => d > 30],
  ];
  const withDates = inRange.filter(b => b.checkin);
  const lead = leadBuckets.map(([label, test]) => ({
    label,
    value: withDates.filter(b => test(daysBetween(dayOf(b), b.checkin))).length,
  }));
  const stays = inRange.map(b => daysBetween(b.checkin, b.checkout)).filter(n => n > 0);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const stayed = inRange.filter(b => STAYED.has(b.bookingStatus)).length;
  const cancelled = inRange.filter(b => b.bookingStatus === "cancelled").length;
  const avgStay = stays.length ? stays.reduce((a, b) => a + b, 0) / stays.length : 0;
  const number = (n: number, digits = 0) => n.toLocaleString(locale, { maximumFractionDigits: digits });
  const short = (d: string) => formatDay(d, locale, { day: "numeric", month: "short" });

  const tiles: [string, string, string?][] = [
    [t("admin.kpi.received"), number(total)],
    [t("admin.kpi.confirmed"), total ? pct(stayed) + "%" : "–", counted(t, "admin.kpi.ofReceived", stayed)],
    [t("admin.kpi.cancelled"), total ? pct(cancelled) + "%" : "–", counted(t, "admin.kpi.ofReceived", cancelled)],
    [t("admin.kpi.rooms"), number(inRange.reduce((s, b) => s + (b.roomsRequested || 1), 0))],
    [t("admin.kpi.avgStay"), avgStay ? fill(t("admin.nights"), { n: number(avgStay, 1) }) : "–"],
  ];

  return (
    <div className="adm-analytics">
      <div className="adm-filters" role="group" aria-label={t("admin.period")}>
        {RANGES.map(r => (
          <button key={r} type="button" className="adm-chip" aria-pressed={range === r} onClick={() => setRange(r)}>
            {fill(t("admin.lastDays"), { n: r })}
          </button>
        ))}
        <span className="adm-meta">{fill(t("admin.periodRange"), { from: short(since), to: short(today) })}</span>
      </div>

      <dl className="adm-tiles">
        {tiles.map(([label, value, note]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {value}
              {note && <span>{note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      {total === 0 ? (
        <div className="adm-empty">
          <p>{t("admin.noRequestsInPeriod")}</p>
        </div>
      ) : (
        <div className="adm-chart-grid">
          <section className="adm-panel adm-chart wide" aria-labelledby="chart-days">
            <header className="adm-panel-head">
              <h2 id="chart-days">{t("admin.chart.perDay")}</h2>
            </header>
            <div className="adm-columns" aria-hidden="true" data-range={range}>
              <div className="y">
                <span>{yTop}</span>
                <span>0</span>
              </div>
              <div className="plot">
                {perDay.map(d => (
                  <div key={d.day} className="col">
                    <span className="col-bar" style={{ height: `${(d.value / yTop) * 100}%` }} />
                    <span className="tip">
                      <strong>{d.value}</strong> {short(d.day)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="x">
                <span>{short(perDay[0].day)}</span>
                <span>{short(perDay[Math.floor(range / 2)].day)}</span>
                <span>{short(today)}</span>
              </div>
            </div>
            <div className="sr-only">
              <table>
                <caption>{t("admin.chart.perDay")}</caption>
                <tbody>
                  {perDay.map(d => (
                    <tr key={d.day}>
                      <th scope="row">{short(d.day)}</th>
                      <td>{d.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="adm-panel adm-chart wide" aria-labelledby="chart-status">
            <header className="adm-panel-head">
              <h2 id="chart-status">{t("admin.chart.status")}</h2>
            </header>
            <div
              className="adm-segbar"
              role="img"
              aria-label={statusCounts
                .filter(s => s.n)
                .map(s => `${t("admin.status." + s.status)} ${s.n} (${pct(s.n)}%)`)
                .join(", ")}
            >
              {statusCounts
                .filter(s => s.n)
                .map(s => (
                  <span
                    key={s.status}
                    className={"seg tone-" + toneOf(s.status)}
                    style={{ flexGrow: s.n }}
                    title={`${t("admin.status." + s.status)}: ${s.n}`}
                  >
                    {pct(s.n) >= 8 && <b>{pct(s.n)}%</b>}
                  </span>
                ))}
            </div>
            <ul className="adm-seg-legend">
              {statusCounts.map(s => (
                <li key={s.status}>
                  <i className={"tone-" + toneOf(s.status)} aria-hidden="true" />
                  {t("admin.status." + s.status)}
                  <strong>{s.n}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="adm-panel adm-chart" aria-labelledby="chart-rooms">
            <header className="adm-panel-head">
              <h2 id="chart-rooms">{t("admin.requestsByRoom")}</h2>
            </header>
            <Bars rows={perRoom} caption={t("admin.requestsByRoom")} valueLabel={t("admin.kpi.received")} />
          </section>

          <section className="adm-panel adm-chart" aria-labelledby="chart-lead">
            <header className="adm-panel-head">
              <h2 id="chart-lead">{t("admin.chart.lead")}</h2>
            </header>
            <Bars rows={lead} caption={t("admin.chart.lead")} valueLabel={t("admin.kpi.received")} />
            <p className="adm-hint">{t("admin.chart.leadHint")}</p>
          </section>
        </div>
      )}
    </div>
  );
}
