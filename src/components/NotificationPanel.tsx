"use client";
import { useEffect, useState } from "react";
type Status = {
  configured: boolean;
  pending: number;
  delivered: number;
  failed?: number;
  scheduledJobs?: boolean;
  retentionMonths?: number;
};
export default function NotificationPanel() {
  const [state, setState] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const r = await fetch("/api/notifications");
      if (!r.ok) throw Error();
      setState(await r.json());
    } catch {
      setError("Notification status unavailable.");
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function retry(requeue: boolean) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requeue ? { action: "requeue" } : {}),
      });
      if (!r.ok) throw Error();
      await refresh();
    } catch {
      setError("Delivery could not be retried.");
    } finally {
      setBusy(false);
    }
  }
  const failed = state?.failed ?? 0;
  return (
    <div className="adm-card">
      <h3>Reservation notifications</h3>
      {state && (
        <>
          <p>
            {state.pending} pending · {state.delivered} handed to delivery service
            {failed > 0 && ` · ${failed} failed`}
          </p>
          <p>
            {state.configured
              ? "Signed delivery connection is configured. The receiving service handles staff alerts and guest acknowledgements."
              : "Delivery is not configured. Requests remain saved here; configure the webhook to send staff alerts and guest acknowledgements."}
          </p>
          {state.configured && state.pending > 0 && (
            <p className="small-note">
              Automatic retries wait longer after each failure (5 minutes, doubling up to 6 hours). Retrying here sends
              pending notifications straight away, except any sent in the last 5 minutes.
            </p>
          )}
          {state.scheduledJobs === false && (
            <p role="status">
              The scheduled job is not configured (CRON_SECRET must be at least 32 characters), so notifications are
              only retried when you press Retry
              {(state.retentionMonths ?? 0) > 0 &&
                `, and requests older than ${state.retentionMonths} months are not being deleted as the privacy notice promises`}
              .
            </p>
          )}
          {failed > 0 && (
            <p role="status">
              {failed} notification{failed === 1 ? "" : "s"} stopped after repeated delivery failures. Those requests
              are saved: contact the guests directly, fix the receiving service, then retry.
            </p>
          )}
          <button
            className="adm-btn"
            disabled={busy || !state.configured || state.pending === 0}
            onClick={() => retry(false)}
          >
            {busy ? "Retrying…" : "Retry pending notifications"}
          </button>
          {failed > 0 && (
            <button
              className="adm-btn"
              style={{ marginLeft: 8 }}
              disabled={busy || !state.configured}
              onClick={() => retry(true)}
            >
              Retry failed notifications
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
