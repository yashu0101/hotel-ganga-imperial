"use client";
import { useApp } from "@/lib/context";
import type { AuditEntry } from "@/lib/types";
import Icon from "./icons";
import { describeChange, formatMoment, localeFor } from "./format";

// Who changed what in the dashboard, newest first. Requests are named by their reference, never by guest details.
// With one shared staff login every entry shows the same account; separate logins would tell staff apart.
export default function ActivityView({
  entries,
  failed,
  onRefresh,
}: {
  /** null while loading. */
  entries: AuditEntry[] | null;
  failed: boolean;
  onRefresh: () => void;
}) {
  const { t, lang } = useApp();
  const locale = localeFor(lang);
  const known = (prefix: string, value: string) => {
    const text = t(prefix + value);
    return text === prefix + value ? value : text;
  };
  return (
    <section className="adm-panel">
      <header className="adm-panel-head">
        <h2>{t("admin.activityTitle")}</h2>
        <button type="button" className="adm-btn small" onClick={onRefresh}>
          {t("admin.refresh")}
        </button>
      </header>
      <div className="adm-panel-body">
        <p className="adm-lead">{t("admin.activityIntro")}</p>
        {failed ? (
          <p className="adm-alert" role="alert">
            {t("admin.unavailable")}
          </p>
        ) : !entries ? (
          <p className="adm-muted" role="status">
            {t("admin.loadingShort")}
          </p>
        ) : entries.length === 0 ? (
          <div className="adm-empty">
            <Icon name="list" size={28} />
            <p>{t("admin.activityEmpty")}</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">{t("admin.when")}</th>
                  <th scope="col">{t("admin.who")}</th>
                  <th scope="col">{t("admin.what")}</th>
                  <th scope="col">{t("admin.details")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td className="nowrap">{formatMoment(e.at, locale)}</td>
                    <td>{e.actor}</td>
                    <td>
                      {known("admin.action.", e.action)}
                      <span className="sub">{known("admin.target.", e.target)}</span>
                    </td>
                    <td>{describeChange(t, e.summary)}</td>
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
