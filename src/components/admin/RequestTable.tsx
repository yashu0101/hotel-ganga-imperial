"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { telHref, whatsappHref } from "@/lib/contact";
import { useApp } from "@/lib/context";
import Icon from "./icons";
import { StatusBadge } from "./status";
import { useAdminUI, useNow } from "./ui";
import {
  ago,
  counted,
  daysBetween,
  fill,
  formatDay,
  formatMoment,
  LATE_AFTER_MINUTES,
  localeFor,
  reference,
  requestType,
} from "./format";

// Reservation requests and (older) enquiries share this view: status filters with counts,
// search, a sortable table, and a detail panel with one-tap call / WhatsApp / email and
// status changes. Changes come from the dashboard, which applies them only after the server
// confirms.
export interface RequestRow {
  id: string;
  kind: "booking" | "enquiry";
  name: string;
  phone: string;
  email: string;
  /** Room type (requests) or enquiry type. */
  what: string;
  rooms?: number;
  /** Special requests or the enquiry message. */
  extra?: string;
  /** The offer code the guest entered, with the offer's title. */
  coupon?: string;
  checkin: string;
  checkout: string;
  guests: number;
  status: string;
  createdAt: string;
  city?: string;
  country?: string;
  /** Added by staff from the dashboard rather than sent from the website. */
  staff?: boolean;
}
export const WAITING = new Set(["pending", "new"]);

interface Props {
  kind: "booking" | "enquiry";
  rows: RequestRow[];
  statuses: readonly string[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onStatus: (row: RequestRow, status: string) => Promise<void>;
  onDelete: (row: RequestRow) => Promise<void>;
  /** Shows a "New booking" button (requests only). */
  onAdd?: () => void;
  /** Where the CSV export downloads from (requests only). */
  exportHref?: string;
  /** Older requests are loaded on demand: shown while there may be more. */
  onLoadOlder?: () => Promise<void>;
  hasOlder?: boolean;
}

/** Rows per page: long lists stay quick to scroll and render. */
export const PAGE_SIZE = 50;

type Sort = "received" | "checkin";

export function whatsappMessage(row: RequestRow) {
  return `Hello ${row.name}, this is Hotel Ganga Imperial about your request ${reference(row.id)}.`;
}

/** Call, WhatsApp and email links for a guest; each appears only when the detail exists. */
export function ContactLinks({ row, compact = false }: { row: RequestRow; compact?: boolean }) {
  const { t } = useApp();
  const tel = telHref(row.phone),
    wa = whatsappHref(row.phone, whatsappMessage(row));
  const label = (text: string) => (compact ? <span className="sr-only">{text}</span> : text);
  return (
    <span className={"adm-contact" + (compact ? " compact" : "")}>
      {tel && (
        <a href={tel} className="adm-btn" title={compact ? t("admin.call") + " " + row.phone : undefined}>
          <Icon name="phone" />
          {label(t("admin.call"))}
          {compact && <span className="sr-only"> {row.name}</span>}
        </a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="adm-btn" title={compact ? "WhatsApp" : undefined}>
          <Icon name="chat" />
          {label(t("admin.whatsapp"))}
          {compact && <span className="sr-only"> {row.name}</span>}
        </a>
      )}
      {!compact && row.email && (
        <a href={"mailto:" + row.email} className="adm-btn">
          <Icon name="mail" />
          {t("admin.email")}
        </a>
      )}
    </span>
  );
}

export default function RequestTable({
  kind,
  rows,
  statuses,
  selectedId,
  onSelect,
  onStatus,
  onDelete,
  onAdd,
  exportHref,
  onLoadOlder,
  hasOlder = false,
}: Props) {
  const { t, lang } = useApp();
  const locale = localeFor(lang);
  const enquiries = kind === "enquiry";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<Sort>("received");
  const [page, setPage] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const now = useNow();
  // A new search, filter or sort starts again from the first page.
  const filter = (apply: () => void) => {
    apply();
    setPage(0);
  };
  async function loadOlder() {
    if (!onLoadOlder) return;
    setLoadingOlder(true);
    try {
      await onLoadOlder();
    } finally {
      setLoadingOlder(false);
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase(),
      digits = q.replace(/\D/g, "");
    const found = rows.filter(
      r =>
        (!status || r.status === status) &&
        (!q ||
          [r.name, r.email, r.what, requestType(t, r.what), r.city ?? "", reference(r.id)].some(v =>
            v.toLowerCase().includes(q),
          ) ||
          (digits.length >= 3 && r.phone.replace(/\D/g, "").includes(digits))),
    );
    return sort === "received"
      ? [...found].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [...found].sort((a, b) => (a.checkin || "9999").localeCompare(b.checkin || "9999"));
  }, [rows, query, status, sort, t]);
  const selected = rows.find(r => r.id === selectedId) ?? null;
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = visible.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  return (
    <div className={"adm-split" + (selected ? " has-detail" : "")}>
      <div className="adm-split-main">
        <div className="adm-filters" role="group" aria-label={t("admin.filterByStatus")}>
          {["", ...statuses].map(s => (
            <button
              key={s || "all"}
              type="button"
              className="adm-chip"
              aria-pressed={status === s}
              onClick={() => filter(() => setStatus(s))}
            >
              {s ? t("admin.status." + s) : t("admin.all")}
              <span className="n">{s ? counts[s] || 0 : rows.length}</span>
            </button>
          ))}
        </div>
        <div className="adm-toolbar">
          <label className="adm-search">
            <Icon name="search" />
            <span className="sr-only">{t("admin.search")}</span>
            <input
              type="search"
              value={query}
              onChange={e => filter(() => setQuery(e.target.value))}
              placeholder={t("admin.search")}
            />
          </label>
          <label className="adm-inline-select">
            <span>{t("admin.sortBy")}</span>
            <select value={sort} onChange={e => filter(() => setSort(e.target.value as Sort))}>
              <option value="received">{t("admin.sort.received")}</option>
              <option value="checkin">{t("admin.sort.checkin")}</option>
            </select>
          </label>
          <span className="adm-meta" aria-live="polite">
            {fill(t("admin.showingCount"), { shown: visible.length, total: rows.length })}
          </span>
          {exportHref && (
            <a className="adm-btn" href={exportHref} download title={t("admin.exportHint")}>
              <Icon name="download" />
              {t("admin.exportCsv")}
            </a>
          )}
          {onAdd && (
            <button type="button" className="adm-btn primary" onClick={onAdd}>
              <Icon name="plus" />
              {t("admin.newBooking")}
            </button>
          )}
        </div>

        {visible.length > 0 ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">{t("admin.guest")}</th>
                  <th scope="col">{t("admin.dates")}</th>
                  <th scope="col">{enquiries ? t("admin.type") : t("admin.room")}</th>
                  <th scope="col" className="num opt">
                    {t("admin.guests")}
                  </th>
                  <th scope="col" className="opt">
                    {t("admin.received")}
                  </th>
                  <th scope="col">{t("admin.status")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => {
                  const nights = daysBetween(r.checkin, r.checkout);
                  const late = WAITING.has(r.status) && now - Date.parse(r.createdAt) > LATE_AFTER_MINUTES * 60_000;
                  return (
                    <tr
                      key={r.id}
                      className={r.id === selectedId ? "is-selected" : undefined}
                      onClick={() => onSelect(r.id)}
                    >
                      <td>
                        <button
                          type="button"
                          className="adm-row-open"
                          aria-expanded={r.id === selectedId}
                          aria-controls="adm-detail"
                          onClick={e => {
                            e.stopPropagation();
                            onSelect(r.id === selectedId ? null : r.id);
                          }}
                        >
                          {r.name}
                        </button>
                        <span className="sub mono">
                          {reference(r.id)}
                          {r.staff && <span className="adm-tag small">{t("admin.byStaff")}</span>}
                        </span>
                      </td>
                      <td className="nowrap">
                        {r.checkin ? formatDay(r.checkin, locale, { day: "numeric", month: "short" }) : "–"}
                        {r.checkout && (
                          <>
                            {" – "}
                            {formatDay(r.checkout, locale, { day: "numeric", month: "short" })}
                          </>
                        )}
                        {nights > 0 && <span className="sub">{counted(t, "admin.nights", nights)}</span>}
                      </td>
                      <td>
                        {r.what ? requestType(t, r.what) : "–"}
                        {(r.rooms || 1) > 1 && (
                          <span className="sub">{fill(t("admin.roomsCount"), { n: r.rooms! })}</span>
                        )}
                        {r.extra && (
                          <span className="sub clamp" title={r.extra}>
                            {r.extra}
                          </span>
                        )}
                      </td>
                      <td className="num opt">{r.guests || "–"}</td>
                      <td className="nowrap opt">
                        <span className={late ? "adm-late" : undefined}>
                          {late && <Icon name="alert" size={15} />}
                          {ago(r.createdAt, locale, now)}
                          {late && <span className="sr-only"> ({t("admin.waitingLong")})</span>}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={r.status} label={t("admin.status." + r.status)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pages > 1 && (
              <nav className="adm-pager" aria-label={t("admin.pages")}>
                <button
                  type="button"
                  className="adm-btn small"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  <Icon name="left" size={16} />
                  {t("admin.previous")}
                </button>
                <span aria-live="polite">{fill(t("admin.pageOf"), { page: current + 1, pages })}</span>
                <button
                  type="button"
                  className="adm-btn small"
                  disabled={current >= pages - 1}
                  onClick={() => setPage(current + 1)}
                >
                  {t("admin.next")}
                  <Icon name="right" size={16} />
                </button>
              </nav>
            )}
          </div>
        ) : (
          <div className="adm-empty boxed">
            <Icon name={rows.length ? "search" : enquiries ? "enquiries" : "requests"} size={28} />
            <p>
              {rows.length ? t("admin.noMatches") : enquiries ? t("admin.emptyEnquiries") : t("admin.emptyRequests")}
            </p>
            {rows.length > 0 && (
              <button
                type="button"
                className="adm-btn"
                onClick={() =>
                  filter(() => {
                    setQuery("");
                    setStatus("");
                  })
                }
              >
                {t("admin.clearFilters")}
              </button>
            )}
          </div>
        )}
        {hasOlder && onLoadOlder && (
          <div className="adm-older">
            <p className="adm-hint">{t("admin.olderHint")}</p>
            <button type="button" className="adm-btn" disabled={loadingOlder} onClick={loadOlder}>
              {loadingOlder ? t("admin.loadingShort") : t("admin.loadOlder")}
            </button>
          </div>
        )}
      </div>
      {selected && (
        <RequestDetail
          key={selected.id}
          row={selected}
          statuses={statuses}
          onClose={() => onSelect(null)}
          onStatus={onStatus}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

/** One request in full. Shown beside the Requests table, or inside a drawer (calendar). */
export function RequestDetail({
  row,
  statuses,
  onClose,
  onStatus,
  onDelete,
  asDrawer = false,
}: {
  row: RequestRow;
  statuses: readonly string[];
  onClose: () => void;
  onStatus: Props["onStatus"];
  onDelete: Props["onDelete"];
  asDrawer?: boolean;
}) {
  const { t, lang } = useApp();
  const { confirm } = useAdminUI();
  const locale = localeFor(lang);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const nights = daysBetween(row.checkin, row.checkout);
  const long = { weekday: "short", day: "numeric", month: "short", year: "numeric" } as const;

  // Opening a request moves focus to it, so keyboard users land on what they opened.
  useEffect(() => heading.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function change(value: string) {
    setBusy(true);
    try {
      await onStatus(row, value);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    const ok = await confirm({
      title: fill(t("admin.deleteRequestTitle"), { name: row.name }),
      body: t("admin.deleteRequestBody"),
      action: t("admin.deleteRequest"),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await onDelete(row);
    } finally {
      setBusy(false);
    }
  }

  const facts: [string, React.ReactNode][] = [
    [t(row.checkout ? "admin.checkin" : "admin.date"), row.checkin ? formatDay(row.checkin, locale, long) : "–"],
    ...(row.checkout ? ([[t("admin.checkout"), formatDay(row.checkout, locale, long)]] as [string, string][]) : []),
    ...(nights > 0 ? ([[t("admin.length"), counted(t, "admin.nights", nights)]] as [string, string][]) : []),
    [
      row.kind === "enquiry" ? t("admin.type") : t("admin.room"),
      <>
        {row.what ? requestType(t, row.what) : "–"}
        {(row.rooms || 1) > 1 && " × " + fill(t("admin.roomsCount"), { n: row.rooms! })}
      </>,
    ],
    [t("admin.guests"), row.guests || "–"],
    ...((row.coupon ? [[t("admin.offerCode"), row.coupon]] : []) as [string, string][]),
    ...((row.city || row.country ? [[t("admin.from"), [row.city, row.country].filter(Boolean).join(", ")]] : []) as [
      string,
      string,
    ][]),
  ];

  return (
    <aside id="adm-detail" className={"adm-detail" + (asDrawer ? " in-drawer" : "")} aria-labelledby="adm-detail-title">
      <div className="adm-detail-head">
        <div>
          <h2 id="adm-detail-title" ref={heading} tabIndex={-1}>
            {row.name}
          </h2>
          <p className="adm-detail-meta">
            <StatusBadge status={row.status} label={t("admin.status." + row.status)} />
            <span>
              {t("admin.reference")} <strong className="mono">{reference(row.id)}</strong>
            </span>
          </p>
          <p className="adm-detail-received">
            {fill(t(row.staff ? "admin.addedOn" : "admin.receivedOn"), { when: formatMoment(row.createdAt, locale) })}
          </p>
        </div>
        <button type="button" className="adm-icon-btn" onClick={onClose} aria-label={t("admin.closeDetails")}>
          <Icon name="close" />
        </button>
      </div>

      <section className="adm-detail-block" aria-label={t("admin.contact")}>
        <p className="adm-detail-contact">
          <span className="mono">{row.phone || "–"}</span>
          {row.email && <span>{row.email}</span>}
        </p>
        <ContactLinks row={row} />
      </section>

      <section className="adm-detail-block">
        <h3>{row.kind === "enquiry" ? t("admin.enquiryDetails") : t("admin.stay")}</h3>
        <dl className="adm-facts">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="adm-detail-block">
        <h3>{row.kind === "enquiry" ? t("admin.message") : t("admin.specialRequests")}</h3>
        {row.extra ? <p className="adm-quote">{row.extra}</p> : <p className="adm-muted">{t("admin.none")}</p>}
      </section>

      <section className="adm-detail-block">
        <h3 id="adm-status-label">{t("admin.status")}</h3>
        <div className="adm-status-picker" role="group" aria-labelledby="adm-status-label">
          {statuses.map(s => (
            <button
              key={s}
              type="button"
              aria-pressed={row.status === s}
              disabled={busy}
              onClick={() => row.status !== s && change(s)}
            >
              <StatusBadge status={s} label={t("admin.status." + s)} />
            </button>
          ))}
        </div>
        <p className="adm-hint">{t("admin.statusHint")}</p>
      </section>

      <div className="adm-detail-foot">
        <button type="button" className="adm-btn danger" disabled={busy} onClick={remove}>
          <Icon name="trash" />
          {t("admin.deleteRequest")}
        </button>
      </div>
    </aside>
  );
}
