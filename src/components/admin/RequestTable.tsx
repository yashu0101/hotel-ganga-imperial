"use client";
import { useMemo, useState } from "react";
import { telHref, whatsappHref } from "@/lib/contact";
import { adminRequest, type Notify } from "./api";

// Reservation requests and (older) enquiries share this table: search, status filter,
// one-tap call / WhatsApp / email, status changes and deletes that only apply once the
// server confirms them.
export interface RequestRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  what: string;
  extra?: string;
  checkin: string;
  checkout: string;
  guests: number;
  status: string;
  createdAt: string;
}
interface Props {
  rows: RequestRow[];
  statuses: readonly string[];
  endpoint: string;
  statusField: "bookingStatus" | "status";
  onChange: (rows: RequestRow[]) => void;
  notify: Notify;
  t: (key: string) => string;
}

const reference = (id: string) => id.slice(0, 8).toUpperCase();
const fmt = (d: string) =>
  d
    ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

export default function RequestTable({ rows, statuses, endpoint, statusField, onChange, notify, t }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase(),
      digits = q.replace(/\D/g, "");
    return rows.filter(
      r =>
        (!status || r.status === status) &&
        (!q ||
          [r.name, r.email, r.what, reference(r.id)].some(v => v.toLowerCase().includes(q)) ||
          (digits.length >= 3 && r.phone.replace(/\D/g, "").includes(digits))),
    );
  }, [rows, query, status]);

  async function setRowStatus(row: RequestRow, value: string) {
    setBusy(row.id);
    try {
      await adminRequest(endpoint, "PATCH", { id: row.id, [statusField]: value });
      onChange(rows.map(r => (r.id === row.id ? { ...r, status: value } : r)));
      notify(t("admin.saved"));
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setBusy(null);
    }
  }
  async function remove(row: RequestRow) {
    if (!window.confirm(t("admin.confirmDelete").replace("{name}", `${row.name} (${reference(row.id)})`))) return;
    setBusy(row.id);
    try {
      await adminRequest(endpoint + "?id=" + encodeURIComponent(row.id), "DELETE");
      onChange(rows.filter(r => r.id !== row.id));
      notify(t("admin.deleted"));
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="adm-toolbar">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("admin.search")}
          aria-label={t("admin.search")}
        />
        <select value={status} onChange={e => setStatus(e.target.value)} aria-label={t("admin.status")}>
          <option value="">{t("admin.allStatuses")}</option>
          {statuses.map(s => (
            <option key={s} value={s}>
              {t("admin.status." + s)}
            </option>
          ))}
        </select>
        <span className="meta">
          {visible.length} / {rows.length}
        </span>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>{t("admin.guest")}</th>
              <th>{t("admin.contact")}</th>
              <th>{t("admin.room")}</th>
              <th>{t("admin.dates")}</th>
              <th>{t("admin.guests")}</th>
              <th>{t("admin.status")}</th>
              <th>
                <span className="sr-only">{t("admin.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r => {
              const tel = telHref(r.phone),
                wa = whatsappHref(
                  r.phone,
                  `Hello ${r.name}, this is Hotel Ganga Imperial about your request ${reference(r.id)}.`,
                );
              return (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <span className="sub">
                      {t("admin.reference")} {reference(r.id)} · {fmt(r.createdAt.slice(0, 10))}
                    </span>
                  </td>
                  <td>
                    {r.phone}
                    {r.email && <span className="sub">{r.email}</span>}
                    <span className="contact-links">
                      {tel && <a href={tel}>{t("admin.call")}</a>}
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer">
                          {t("admin.whatsapp")} <span aria-hidden="true">↗</span>
                        </a>
                      )}
                      {r.email && <a href={"mailto:" + r.email}>{t("admin.email")}</a>}
                    </span>
                  </td>
                  <td>
                    {r.what}
                    {r.extra && <span className="requests">{r.extra}</span>}
                  </td>
                  <td>
                    {fmt(r.checkin)}
                    {r.checkout && <span className="sub">→ {fmt(r.checkout)}</span>}
                  </td>
                  <td>{r.guests}</td>
                  <td>
                    <select
                      value={r.status}
                      disabled={busy === r.id}
                      onChange={e => setRowStatus(r, e.target.value)}
                      aria-label={t("admin.status") + ": " + r.name}
                    >
                      {statuses.map(s => (
                        <option key={s} value={s}>
                          {t("admin.status." + s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button className="adm-btn danger" disabled={busy === r.id} onClick={() => remove(r)}>
                      {t("admin.delete")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && (
        <p className="adm-note" style={{ marginTop: 16 }}>
          {rows.length ? t("admin.noMatches") : t("admin.empty")}
        </p>
      )}
    </>
  );
}
