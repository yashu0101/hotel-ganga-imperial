"use client";
import { useState } from "react";
import { useApp } from "@/lib/context";
import type { LaunchGroup, LaunchItem } from "@/lib/hotel-content";
import Icon from "./icons";
import { fill } from "./format";
import type { Section } from "./Sidebar";

// Setup: whether new requests reach staff (the notification outbox) and the launch checklist
// of guest-facing details that are still missing. The public site hides those gaps instead
// of showing placeholders, so this is where they stay visible.
export interface NotificationStatus {
  configured: boolean;
  pending: number;
  delivered: number;
  failed?: number;
  scheduledJobs?: boolean;
  retentionMonths?: number;
}

const GROUPS: LaunchGroup[] = ["contact", "policies", "privacy", "rooms", "content"];
/** Where staff fix each kind of item. Contact details are environment variables, so they have no section. */
const FIX_IN: Partial<Record<LaunchItem["key"], Section>> = {
  times: "settings",
  responseTime: "settings",
  legalEntity: "settings",
  privacyContact: "settings",
  retention: "settings",
  privacyReviewed: "settings",
  roomFacts: "rooms",
  roomPhoto: "rooms",
  roomRate: "rooms",
  offer: "offers",
  package: "banquet",
  dining: "dining",
};

/** A checklist item in the admin's language. */
export function launchItemLabel(t: (key: string) => string, item: LaunchItem) {
  const facts = (item.facts ?? []).map(f => t("admin.f." + f).toLowerCase()).join(", ");
  return fill(t("admin.check." + item.key), { name: item.name ?? "", facts });
}

export default function SetupView({
  items,
  status,
  statusError,
  onRetry,
  go,
}: {
  /** The launch checklist (launchChecklist in hotel-content.ts). */
  items: LaunchItem[];
  status: NotificationStatus | null;
  statusError: boolean;
  onRetry: (requeue: boolean) => Promise<void>;
  go: (section: Section) => void;
}) {
  const { t } = useApp();
  const [busy, setBusy] = useState(false);
  const failed = status?.failed ?? 0;

  async function retry(requeue: boolean) {
    setBusy(true);
    try {
      await onRetry(requeue);
    } finally {
      setBusy(false);
    }
  }

  const state = (ok: boolean, okText: string, offText: string) => (
    <span className={"adm-state " + (ok ? "ok" : "off")}>
      <Icon name={ok ? "check" : "alert"} size={16} />
      {ok ? okText : offText}
    </span>
  );

  return (
    <div className="adm-setup">
      <section className="adm-panel" aria-labelledby="notify-title">
        <header className="adm-panel-head">
          <h2 id="notify-title">{t("admin.notifications")}</h2>
        </header>
        <div className="adm-panel-body">
          <p className="adm-lead">{t("admin.notificationsIntro")}</p>
          {statusError && (
            <p className="adm-alert" role="alert">
              {t("admin.notificationsUnavailable")}
            </p>
          )}
          {!status && !statusError && <p className="adm-muted">{t("admin.loadingShort")}</p>}
          {status && (
            <>
              <dl className="adm-facts wide">
                <div>
                  <dt>{t("admin.deliveryConnection")}</dt>
                  <dd>{state(status.configured, t("admin.connected"), t("admin.notSetUp"))}</dd>
                </div>
                <div>
                  <dt>{t("admin.automaticRetries")}</dt>
                  <dd>{state(status.scheduledJobs !== false, t("admin.running"), t("admin.notSetUp"))}</dd>
                </div>
                <div>
                  <dt>{t("admin.waitingToSend")}</dt>
                  <dd className="num">{status.pending}</dd>
                </div>
                <div>
                  <dt>{t("admin.sent")}</dt>
                  <dd className="num">{status.delivered}</dd>
                </div>
                <div>
                  <dt>{t("admin.stopped")}</dt>
                  <dd className="num">{failed}</dd>
                </div>
              </dl>
              {!status.configured && <p className="adm-hint">{t("admin.notConfiguredHint")}</p>}
              {status.configured && status.pending > 0 && <p className="adm-hint">{t("admin.retryHint")}</p>}
              {status.scheduledJobs === false && (
                <p className="adm-alert" role="status">
                  {t("admin.noScheduledJobs")}
                  {(status.retentionMonths ?? 0) > 0 &&
                    " " + fill(t("admin.retentionWarning"), { months: status.retentionMonths! })}
                </p>
              )}
              {failed > 0 && (
                <p className="adm-alert" role="status">
                  {fill(t("admin.failedHint"), { n: failed })}
                </p>
              )}
              <div className="adm-actions">
                <button
                  type="button"
                  className="adm-btn"
                  disabled={busy || !status.configured || status.pending === 0}
                  onClick={() => retry(false)}
                >
                  {busy ? t("admin.retrying") : t("admin.retryPending")}
                </button>
                {failed > 0 && (
                  <button
                    type="button"
                    className="adm-btn"
                    disabled={busy || !status.configured}
                    onClick={() => retry(true)}
                  >
                    {t("admin.retryFailed")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="adm-panel" aria-labelledby="launch-title">
        <header className="adm-panel-head">
          <h2 id="launch-title">{t("admin.launchChecklist")}</h2>
          <span className="adm-count">{items.length}</span>
        </header>
        <div className="adm-panel-body">
          {items.length === 0 ? (
            <div className="adm-empty">
              <Icon name="check" size={28} />
              <p>{t("admin.launchComplete")}</p>
            </div>
          ) : (
            <>
              <p className="adm-lead">{t("admin.launchIntro")}</p>
              {GROUPS.map(group => {
                const list = items.filter(i => i.group === group);
                if (!list.length) return null;
                return (
                  <div key={group} className="adm-check-group">
                    <h3>{t("admin.launch." + group)}</h3>
                    <p className="adm-hint">{t("admin.launch." + group + "Hint")}</p>
                    <ul className="adm-checklist">
                      {list.map(item => {
                        const section = FIX_IN[item.key];
                        return (
                          <li key={item.key + ":" + (item.name ?? "")}>
                            <span className="box" aria-hidden="true" />
                            <span>
                              {launchItemLabel(t, item)}
                              {/* Contact details are set in hosting: show the variable to set. */}
                              {item.env && <code>{item.env}</code>}
                            </span>
                            {section && (
                              <button type="button" className="adm-btn small" onClick={() => go(section)}>
                                {t("admin.fix")}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
