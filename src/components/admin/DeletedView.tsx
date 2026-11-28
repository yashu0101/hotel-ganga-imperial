"use client";
import { useState } from "react";
import { useApp } from "@/lib/context";
import Icon from "./icons";
import type { RequestRow } from "./RequestTable";
import { fill, formatMoment, localeFor, reference, requestType } from "./format";
import { useAdminUI } from "./ui";

// Requests staff deleted. They stay here for 30 days and can be restored; then the daily job erases them. "Erase
// now" removes one at once, for example when a guest asks for their data to be deleted.
export type DeletedRow = RequestRow & { deletedAt: string };

export default function DeletedView({
  rows,
  failed,
  onRestore,
  onErase,
}: {
  /** null while loading. */
  rows: DeletedRow[] | null;
  failed: boolean;
  onRestore: (row: DeletedRow) => Promise<void>;
  onErase: (row: DeletedRow) => Promise<void>;
}) {
  const { t, lang } = useApp();
  const { confirm } = useAdminUI();
  const locale = localeFor(lang);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(row: DeletedRow, action: (row: DeletedRow) => Promise<void>) {
    setBusy(row.id);
    try {
      await action(row);
    } finally {
      setBusy(null);
    }
  }
  async function erase(row: DeletedRow) {
    const ok = await confirm({
      title: fill(t("admin.eraseTitle"), { name: row.name }),
      body: t("admin.eraseBody"),
      action: t("admin.eraseNow"),
      danger: true,
    });
    if (ok) await run(row, onErase);
  }

  if (failed)
    return (
      <p className="adm-alert" role="alert">
        {t("admin.unavailable")}
      </p>
    );
  if (!rows)
    return (
      <p className="adm-muted" role="status">
        {t("admin.loadingShort")}
      </p>
    );
  return (
    <section className="adm-panel">
      <div className="adm-panel-body">
        <p className="adm-lead">{t("admin.deletedIntro")}</p>
        {rows.length === 0 ? (
          <div className="adm-empty">
            <Icon name="trash" size={28} />
            <p>{t("admin.deletedEmpty")}</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">{t("admin.guest")}</th>
                  <th scope="col">{t("admin.room")}</th>
                  <th scope="col">{t("admin.deletedOn")}</th>
                  <th scope="col">
                    <span className="sr-only">{t("admin.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.kind + row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <span className="sub mono">{reference(row.id)}</span>
                    </td>
                    <td>{row.what ? requestType(t, row.what) : "–"}</td>
                    <td className="nowrap">{formatMoment(row.deletedAt, locale)}</td>
                    <td className="adm-row-actions">
                      <button
                        type="button"
                        className="adm-btn small"
                        disabled={busy === row.id}
                        onClick={() => run(row, onRestore)}
                      >
                        <Icon name="restore" size={16} />
                        {t("admin.restore")}
                        <span className="sr-only"> {row.name}</span>
                      </button>
                      <button
                        type="button"
                        className="adm-btn small danger"
                        disabled={busy === row.id}
                        onClick={() => erase(row)}
                      >
                        {t("admin.eraseNow")}
                        <span className="sr-only"> {row.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
