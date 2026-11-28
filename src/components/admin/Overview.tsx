"use client";
import { useState } from "react";
import { useApp } from "@/lib/context";
import type { Booking, Offer } from "@/lib/types";
import Icon from "./icons";
import { ContactLinks, type RequestRow } from "./RequestTable";
import { useNow } from "./ui";
import {
  counted,
  dueToLeave,
  elapsed,
  fill,
  formatDay,
  hotelDay,
  LATE_AFTER_MINUTES,
  localeFor,
  requestType,
} from "./format";
import type { Section } from "./Sidebar";

// The first screen staff see: who is waiting for a reply (oldest first), who arrives and
// leaves today, and anything in setup that needs attention.
interface Props {
  bookings: Booking[];
  requests: RequestRow[];
  enquiries: RequestRow[];
  offers: Offer[];
  /** Notices to show above everything else (setup problems, lists that failed to load). */
  notices: { id: string; text: string; action?: { label: string; section: Section } }[];
  go: (section: Section, id?: string) => void;
  onStatus: (row: RequestRow, status: string) => Promise<void>;
  bookingRow: (b: Booking) => RequestRow;
}

const QUEUE_LIMIT = 8;

function waitTone(minutes: number) {
  return minutes > LATE_AFTER_MINUTES ? "late" : minutes > 120 ? "due" : "fresh";
}

export default function Overview({ bookings, requests, enquiries, offers, notices, go, onStatus, bookingRow }: Props) {
  const { t, lang } = useApp();
  const locale = localeFor(lang);
  const [busy, setBusy] = useState<string | null>(null);
  const now = useNow();
  const today = hotelDay(),
    tomorrow = hotelDay(1);

  const queue = [...requests.filter(r => r.status === "pending"), ...enquiries.filter(r => r.status === "new")].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );
  const arriving = (day: string) => bookings.filter(b => b.bookingStatus === "confirmed" && b.checkin === day);
  const leaving = bookings.filter(b => dueToLeave(b, today));
  const inHouse = bookings.filter(b => b.bookingStatus === "checked-in");
  const upcoming = bookings.filter(b => b.bookingStatus === "confirmed" && b.checkin >= today);

  async function mark(b: Booking, status: string) {
    setBusy(b.id);
    try {
      await onStatus(bookingRow(b), status);
    } finally {
      setBusy(null);
    }
  }

  const figures: [string, number, Section][] = [
    [t("admin.fig.waiting"), queue.length, "requests"],
    [t("admin.fig.arrivingToday"), arriving(today).length, "requests"],
    [t("admin.fig.inHouse"), inHouse.length, "requests"],
    [t("admin.fig.upcoming"), upcoming.length, "calendar"],
    [t("admin.fig.activeOffers"), offers.filter(o => o.active).length, "offers"],
  ];

  const deskList = (list: Booking[], empty: string, action?: { status: string; label: string }) =>
    list.length ? (
      <ul className="adm-desk-list">
        {list.map(b => (
          <li key={b.id}>
            <button type="button" className="adm-link-row" onClick={() => go("requests", b.id)}>
              <strong>{b.name}</strong>
              <span>
                {requestType(t, b.roomType)}
                {(b.roomsRequested || 1) > 1 && " × " + b.roomsRequested}
              </span>
              <span className="adm-muted">{counted(t, "admin.guestsCount", b.guests)}</span>
            </button>
            {action && (
              <button
                type="button"
                className="adm-btn small"
                disabled={busy === b.id}
                onClick={() => mark(b, action.status)}
              >
                {action.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <p className="adm-muted adm-desk-empty">{empty}</p>
    );

  return (
    <div className="adm-overview">
      {notices.map(n => (
        <div key={n.id} className="adm-notice" role="status">
          <Icon name="alert" />
          <p>{n.text}</p>
          {n.action && (
            <button type="button" className="adm-btn small" onClick={() => go(n.action!.section)}>
              {n.action.label}
            </button>
          )}
        </div>
      ))}

      <dl className="adm-figures">
        {figures.map(([label, value, section]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              <button type="button" onClick={() => go(section)}>
                {value}
              </button>
            </dd>
          </div>
        ))}
      </dl>

      <div className="adm-overview-grid">
        <section className="adm-panel adm-queue" aria-labelledby="queue-title">
          <header className="adm-panel-head">
            <h2 id="queue-title">{t("admin.waitingForReply")}</h2>
            <span className="adm-count">{queue.length}</span>
          </header>
          {queue.length === 0 ? (
            <div className="adm-empty">
              <Icon name="check" size={28} />
              <p>{t("admin.queueEmpty")}</p>
            </div>
          ) : (
            <ol className="adm-queue-list">
              {queue.slice(0, QUEUE_LIMIT).map(r => {
                const wait = elapsed(r.createdAt, locale, now);
                return (
                  <li key={r.id}>
                    <div className={"adm-wait " + waitTone(wait.minutes)}>
                      <strong>{wait.text}</strong>
                      <span>{t("admin.waiting")}</span>
                    </div>
                    <button
                      type="button"
                      className="adm-queue-main"
                      onClick={() => go(r.kind === "booking" ? "requests" : "enquiries", r.id)}
                    >
                      <span className="name">{r.name}</span>
                      <span className="what">
                        <span>
                          {r.what ? requestType(t, r.what) : t("admin.enquiry")}
                          {(r.rooms || 1) > 1 && " × " + r.rooms}
                        </span>
                        {r.checkin && (
                          <span>
                            {formatDay(r.checkin, locale, { day: "numeric", month: "short" })}
                            {r.checkout && " – " + formatDay(r.checkout, locale, { day: "numeric", month: "short" })}
                          </span>
                        )}
                        {r.guests > 0 && <span>{counted(t, "admin.guestsCount", r.guests)}</span>}
                      </span>
                    </button>
                    <ContactLinks row={r} compact />
                  </li>
                );
              })}
            </ol>
          )}
          {queue.length > QUEUE_LIMIT && (
            <footer className="adm-panel-foot">
              <button type="button" className="adm-btn" onClick={() => go("requests")}>
                {fill(t("admin.seeAllWaiting"), { n: queue.length })}
              </button>
            </footer>
          )}
        </section>

        <section className="adm-panel adm-desk" aria-labelledby="desk-title">
          <header className="adm-panel-head">
            <h2 id="desk-title">{t("admin.atTheDesk")}</h2>
          </header>
          <h3>
            <Icon name="arrive" />
            {t("admin.arrivingToday")}
          </h3>
          {deskList(arriving(today), t("admin.noArrivals"), {
            status: "checked-in",
            label: t("admin.markCheckedIn"),
          })}
          <h3>
            <Icon name="leave" />
            {t("admin.leavingToday")}
          </h3>
          {deskList(leaving, t("admin.noDepartures"), { status: "checked-out", label: t("admin.markCheckedOut") })}
          <h3>
            <Icon name="calendar" />
            {fill(t("admin.arrivingOn"), {
              day: formatDay(tomorrow, locale, { weekday: "long", day: "numeric", month: "short" }),
            })}
          </h3>
          {deskList(arriving(tomorrow), t("admin.noArrivals"))}
          <p className="adm-hint">{t("admin.deskHint")}</p>
        </section>
      </div>
    </div>
  );
}
