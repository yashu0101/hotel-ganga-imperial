"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/lib/context";
import Icon from "./icons";
import type { Notify } from "./api";

// Dashboard-wide feedback: toasts (confirmations fade, errors stay until dismissed) and a
// confirmation dialog that replaces window.confirm for destructive actions.
export interface ConfirmOptions {
  title: string;
  body?: string;
  action: string;
  danger?: boolean;
}
interface AdminUI {
  notify: Notify;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}
const Ctx = createContext<AdminUI>({ notify: () => {}, confirm: async () => false });
export const useAdminUI = () => useContext(Ctx);

/**
 * A native modal <dialog>: focus is trapped and restored by the browser, Esc closes it.
 * Mount it only while it should be open. Clicking the backdrop counts as closing.
 */
export function Modal({
  onClose,
  className,
  labelledBy,
  children,
}: {
  onClose: () => void;
  className: string;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      onClick={e => {
        if (e.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export function AdminUIProvider({ children }: { children: ReactNode }) {
  const { t } = useApp();
  const [toast, setToast] = useState<{ message: string; kind: "ok" | "error"; key: number } | null>(null);
  const timer = useRef(0);
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);
  // The toast region is a manual popover, shown again for every toast, so it sits in the top layer above any open
  // modal <dialog> (drawers, the confirm dialog). Otherwise an error raised from a drawer would be hidden behind it.
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = region.current;
    if (!el?.showPopover) return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      if (toast) el.showPopover();
    } catch {
      // Not connected yet, or popovers unsupported: the region still shows in normal page flow.
    }
  }, [toast]);

  const notify = useCallback<Notify>((message, kind = "ok") => {
    window.clearTimeout(timer.current);
    setToast({ message, kind, key: Date.now() });
    if (kind === "ok") timer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>(resolve => setPending({ ...options, resolve })),
    [],
  );
  const answer = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <Ctx.Provider value={{ notify, confirm }}>
      {children}
      {pending && (
        <Modal className="adm-confirm" labelledBy="adm-confirm-title" onClose={() => answer(false)}>
          <div className="adm-confirm-body">
            <h2 id="adm-confirm-title">{pending.title}</h2>
            {pending.body && <p>{pending.body}</p>}
            <div className="adm-confirm-actions">
              <button type="button" className="adm-btn" onClick={() => answer(false)} autoFocus>
                {t("admin.cancel")}
              </button>
              <button
                type="button"
                className={"adm-btn " + (pending.danger ? "danger-solid" : "primary")}
                onClick={() => answer(true)}
              >
                {pending.action}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Screen readers hear toasts from these regions, which are always in the page. The visible toast below is a
          popover (shown only while there is one), and live regions that appear with their content often go unread. */}
      <div className="sr-only" role="status">
        {toast?.kind === "ok" ? toast.message : ""}
      </div>
      <div className="sr-only" role="alert">
        {toast?.kind === "error" ? toast.message : ""}
      </div>
      <div ref={region} popover="manual" className="adm-toast-region">
        {toast && (
          <div key={toast.key} className={"adm-toast " + toast.kind}>
            <Icon name={toast.kind === "error" ? "alert" : "check"} />
            <span>{toast.message}</span>
            {toast.kind === "error" && (
              <button type="button" className="adm-toast-close" onClick={() => setToast(null)}>
                {t("admin.dismiss")}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

/** The current time, refreshed every minute so "waiting 3 hr" and "2 hr ago" stay current. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
