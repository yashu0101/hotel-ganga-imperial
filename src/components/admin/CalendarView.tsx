"use client";

import { useState } from "react";
import { useApp } from "@/lib/context";
import type { Booking, Room } from "@/lib/types";
import { BOOKING_STATUSES } from "@/lib/validation";
import type { BookingDraft } from "./BookingForm";
import { lastDay, layoutWeek, monthWeeks, roomFor } from "./calendar-layout";
import { counted, fill, formatDay, HALL, hotelDay, localeFor, requestType } from "./format";
import Icon from "./icons";
import { RequestDetail, type RequestRow } from "./RequestTable";
import { StatusBadge, toneOf } from "./status";
import { Modal } from "./ui";

// Month view of bookings. Each stay is a bar across its nights (check-in up to the night before check-out);
// events and dining requests are one-day chips. Bookings never reserve rooms, so overlapping bars are normal:
// staff decide. Clicking an empty part of a day adds a booking for that date.
const ACTIVE = new Set(["pending", "confirmed", "checked-in"]);
const MAX_LANES = 3;
const EVENTS = "__events";
const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  bookings: Booking[];
  rooms: Room[];
  bookingRow: (b: Booking) => RequestRow;
  onAdd: (draft: BookingDraft) => void;
  onStatus: (row: RequestRow, status: string) => Promise<void>;
  onDelete: (row: RequestRow) => Promise<boolean>;
}

export default function CalendarView({ bookings, rooms, bookingRow, onAdd, onStatus, onDelete }: Props) {
  const { t, lang } = useApp();
  const locale = localeFor(lang);
  const today = hotelDay();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [filter, setFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const visibleRooms = rooms.filter(r => !r.hidden);
  const roomKey = (r: Room) => r.id || r.slug;
  // Requests match their room by id; older requests without one match by the name they were sent with.
  // Hidden room types still hold their booked guests, so bookings match against every room type.
  const roomOf = (b: Booking) => roomFor(b, rooms);
  const lastNight = (b: Booking) => lastDay(b, !!roomOf(b));
  const shown = bookings.filter(b => {
    if (!ACTIVE.has(b.bookingStatus) || !b.checkin) return false;
    if (!filter) return true;
    const room = roomOf(b);
    return filter === EVENTS ? !room : !!room && roomKey(room) === filter;
  });
  const byId = new Map(shown.map(b => [b.id, b]));
  const covering = (day: string) => shown.filter(b => b.checkin <= day && lastNight(b) >= day);
  const roomsOn = (day: string) => covering(day).reduce((n, b) => n + (roomOf(b) ? b.roomsRequested || 1 : 0), 0);

  const weeks = monthWeeks(month);
  const [year, mon] = month.split("-").map(Number);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(year, mon - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };
  const monthLabel = formatDay(month + "-01", locale, { month: "long", year: "numeric" });
  const dayLong = (day: string) => formatDay(day, locale, { weekday: "long", day: "numeric", month: "long" });
  const short = (day: string) => formatDay(day, locale, { day: "numeric", month: "short" });
  const draftType = filter && filter !== EVENTS ? "room:" + filter : filter === EVENTS ? HALL : undefined;
  const add = (date: string) => onAdd({ date, type: draftType });
  const describe = (b: Booking) =>
    [
      b.name,
      requestType(t, b.roomType) + ((b.roomsRequested || 1) > 1 ? " × " + b.roomsRequested : ""),
      b.checkout ? `${short(b.checkin)} – ${short(b.checkout)}` : short(b.checkin),
      t("admin.status." + b.bookingStatus),
    ].join(", ");
  const opened = openId ? bookings.find(b => b.id === openId) : undefined;

  return (
    <section aria-label={t("admin.nav.calendar")} className="adm-month">
      <div className="adm-cal-bar">
        <div className="adm-cal-nav">
          <button type="button" className="adm-icon-btn" onClick={() => shift(-1)} aria-label={t("admin.prevMonth")}>
            <Icon name="left" />
          </button>
          <h2>{monthLabel}</h2>
          <button type="button" className="adm-icon-btn" onClick={() => shift(1)} aria-label={t("admin.nextMonth")}>
            <Icon name="right" />
          </button>
          <button
            type="button"
            className="adm-btn small"
            disabled={month === today.slice(0, 7)}
            onClick={() => setMonth(today.slice(0, 7))}
          >
            {t("admin.thisMonth")}
          </button>
        </div>
        <div className="adm-cal-tools">
          <label className="adm-inline-select">
            <span>{t("admin.showLabel")}</span>
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">{t("admin.allRoomTypes")}</option>
              {visibleRooms.map(r => (
                <option key={roomKey(r)} value={roomKey(r)}>
                  {r.name}
                </option>
              ))}
              <option value={EVENTS}>{t("admin.otherRequests")}</option>
            </select>
          </label>
          <button type="button" className="adm-btn primary" onClick={() => add(today)}>
            <Icon name="plus" />
            {t("admin.newBooking")}
          </button>
        </div>
      </div>

      <ul className="adm-legend adm-month-legend">
        {["pending", "confirmed", "checked-in"].map(s => (
          <li key={s} className={"tone-" + toneOf(s)}>
            <i aria-hidden="true" />
            {t("admin.status." + s)}
          </li>
        ))}
        <li className="hint">{t("admin.calHint")}</li>
      </ul>

      <div className="adm-month-grid">
        <div className="adm-month-head" aria-hidden="true">
          {weeks[0].map(day => (
            <span key={day}>{formatDay(day, locale, { weekday: "short" })}</span>
          ))}
        </div>
        {weeks.map(week => {
          const { segments, hidden } = layoutWeek(
            week,
            shown.map(b => ({ id: b.id, start: b.checkin, end: lastNight(b) })),
            MAX_LANES,
          );
          return (
            <div key={week[0]} className="adm-month-week">
              {week.map((day, i) => {
                const past = day < today,
                  outside = day.slice(0, 7) !== month,
                  load = roomsOn(day);
                return (
                  <div
                    key={day}
                    className={
                      "adm-day" +
                      (past ? " past" : "") +
                      (outside ? " outside" : "") +
                      (day === today ? " today" : "") +
                      ([5, 6].includes(i) ? " weekend" : "")
                    }
                    style={{ gridColumn: i + 1 }}
                  >
                    {!past && (
                      <button
                        type="button"
                        className="adm-day-add"
                        onClick={() => add(day)}
                        aria-label={fill(t("admin.addOn"), { day: dayLong(day) })}
                      >
                        <span aria-hidden="true">
                          <Icon name="plus" size={14} />
                          {t("admin.addBooking")}
                        </span>
                      </button>
                    )}
                    <div className="adm-day-top">
                      <button
                        type="button"
                        className="adm-day-num"
                        onClick={() => setOpenDay(day)}
                        aria-label={dayLong(day)}
                      >
                        {Number(day.slice(8))}
                      </button>
                      {load > 0 && <span className="adm-day-load">{counted(t, "admin.roomsShort", load)}</span>}
                    </div>
                  </div>
                );
              })}
              {segments.map(s => {
                const b = byId.get(s.id)!;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={
                      "adm-bar tone-" +
                      toneOf(b.bookingStatus) +
                      (s.continuesBefore ? " cont-before" : "") +
                      (s.continuesAfter ? " cont-after" : "") +
                      (roomOf(b) ? "" : " event")
                    }
                    style={{ gridColumn: `${s.from + 1} / ${s.to + 2}`, gridRow: s.lane + 2 }}
                    onClick={() => setOpenId(b.id)}
                    title={describe(b)}
                    aria-label={describe(b)}
                  >
                    {!roomOf(b) && <Icon name="banquet" size={13} />}
                    <span className="who">{b.name}</span>
                    {(b.roomsRequested || 1) > 1 && <span className="qty">× {b.roomsRequested}</span>}
                  </button>
                );
              })}
              {hidden.map((n, i) =>
                n > 0 ? (
                  <button
                    key={"more" + i}
                    type="button"
                    className="adm-more"
                    style={{ gridColumn: i + 1, gridRow: MAX_LANES + 2 }}
                    onClick={() => setOpenDay(week[i])}
                  >
                    {fill(t("admin.moreCount"), { n })}
                  </button>
                ) : null,
              )}
            </div>
          );
        })}
      </div>

      {openDay && (
        <Modal className="adm-drawer narrow" labelledBy="adm-day-title" onClose={() => setOpenDay(null)}>
          <div className="adm-drawer-inner">
            <header className="adm-drawer-head">
              <h2 id="adm-day-title">{dayLong(openDay)}</h2>
              <button
                type="button"
                className="adm-icon-btn"
                onClick={() => setOpenDay(null)}
                aria-label={t("admin.close")}
              >
                <Icon name="close" />
              </button>
            </header>
            <div className="adm-drawer-body">
              {covering(openDay).length === 0 ? (
                <p className="adm-muted adm-day-empty">{t("admin.noBookingsDay")}</p>
              ) : (
                <ul className="adm-desk-list adm-day-list">
                  {covering(openDay).map(b => (
                    <li key={b.id}>
                      <button
                        type="button"
                        className="adm-link-row"
                        onClick={() => {
                          setOpenDay(null);
                          setOpenId(b.id);
                        }}
                      >
                        <strong>{b.name}</strong>
                        <span>
                          {requestType(t, b.roomType)}
                          {(b.roomsRequested || 1) > 1 && " × " + b.roomsRequested}
                        </span>
                        <span className="adm-muted">
                          {short(b.checkin)}
                          {b.checkout && " – " + short(b.checkout)}
                        </span>
                      </button>
                      <StatusBadge status={b.bookingStatus} label={t("admin.status." + b.bookingStatus)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {openDay >= today && (
              <footer className="adm-drawer-foot">
                <span />
                <button
                  type="button"
                  className="adm-btn primary"
                  onClick={() => {
                    const day = openDay;
                    setOpenDay(null);
                    add(day);
                  }}
                >
                  <Icon name="plus" />
                  {t("admin.addOnThisDay")}
                </button>
              </footer>
            )}
          </div>
        </Modal>
      )}

      {opened && (
        <Modal className="adm-drawer narrow" labelledBy="adm-detail-title" onClose={() => setOpenId(null)}>
          <RequestDetail
            row={bookingRow(opened)}
            statuses={BOOKING_STATUSES}
            asDrawer
            onClose={() => setOpenId(null)}
            onStatus={onStatus}
            onDelete={async row => {
              if (await onDelete(row)) setOpenId(null);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
