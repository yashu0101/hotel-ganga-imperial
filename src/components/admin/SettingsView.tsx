"use client";
import { useState, type FormEvent } from "react";
import { useApp } from "@/lib/context";
import type { HotelSettings } from "@/lib/types";
import { adminRequest, errorText } from "./api";
import { useAdminUI } from "./ui";

// Hotel policies and privacy-notice facts. Guests see them on /guest-information, the room pages and /privacy, and
// blank ones are hidden from guests and listed in the launch checklist. Only changed fields are sent.
type Key = keyof HotelSettings;
type Spec = { key: Key; kind?: "text" | "textarea" | "number" | "list" | "email"; full?: boolean };
const GROUPS: { title: string; hint: string; fields: Spec[] }[] = [
  {
    title: "admin.settings.policies",
    hint: "admin.settings.policiesHint",
    fields: [
      { key: "checkIn" },
      { key: "checkOut" },
      { key: "responseTime", full: true },
      { key: "cancellation", kind: "textarea", full: true },
      { key: "deposits", kind: "textarea", full: true },
      { key: "children", kind: "textarea", full: true },
      { key: "identification", kind: "textarea", full: true },
      { key: "accessibility", kind: "textarea", full: true },
    ],
  },
  {
    title: "admin.settings.privacy",
    hint: "admin.settings.privacyHint",
    fields: [
      { key: "legalEntity", full: true },
      { key: "privacyContactName" },
      { key: "privacyContactEmail", kind: "email" },
      { key: "retentionMonths", kind: "number" },
      { key: "privacyLastUpdated" },
      { key: "providers", kind: "list", full: true },
    ],
  },
];

type Draft = Record<Key, string>;
const toDraft = (s: HotelSettings): Draft =>
  Object.fromEntries(
    Object.entries(s).map(([k, v]) => [k, Array.isArray(v) ? v.join("\n") : String(v ?? "")]),
  ) as Draft;
const listOf = (text: string) =>
  text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

export default function SettingsView({
  settings,
  onSaved,
}: {
  settings: HotelSettings;
  onSaved: (settings: HotelSettings) => void;
}) {
  const { t } = useApp();
  const { notify } = useAdminUI();
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saved = toDraft(settings);
  const changed = (Object.keys(draft) as Key[]).filter(k => draft[k] !== saved[k]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!changed.length) return;
    const body = Object.fromEntries(
      changed.map(k => [
        k,
        k === "providers" ? listOf(draft[k]) : k === "retentionMonths" ? Number(draft[k] || 0) : draft[k],
      ]),
    );
    setSaving(true);
    setError("");
    try {
      const { item } = await adminRequest<{ item: HotelSettings }>("/api/settings", "PATCH", body);
      onSaved(item);
      setDraft(toDraft(item));
      notify(t("admin.settings.saved"));
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="adm-settings" onSubmit={save} noValidate>
      {GROUPS.map(group => (
        <section key={group.title} className="adm-panel" aria-labelledby={group.title}>
          <header className="adm-panel-head">
            <h2 id={group.title}>{t(group.title)}</h2>
          </header>
          <div className="adm-panel-body">
            <p className="adm-lead">{t(group.hint)}</p>
            <div className="adm-form">
              {group.fields.map(f => {
                const id = "setting-" + f.key,
                  hintId = id + "-hint";
                const common = {
                  id,
                  value: draft[f.key],
                  "aria-describedby": hintId,
                  onChange: (e: { target: { value: string } }) => setDraft(d => ({ ...d, [f.key]: e.target.value })),
                };
                return (
                  <div key={f.key} className={"adm-field" + (f.full ? " full" : "")}>
                    <label htmlFor={id}>{t("admin.setting." + f.key)}</label>
                    {f.kind === "textarea" || f.kind === "list" ? (
                      <textarea {...common} rows={f.kind === "list" ? 3 : 2} />
                    ) : (
                      <input
                        {...common}
                        type={f.kind === "number" ? "number" : f.kind === "email" ? "email" : "text"}
                        min={f.kind === "number" ? 0 : undefined}
                        max={f.kind === "number" ? 120 : undefined}
                      />
                    )}
                    <p className="adm-hint" id={hintId}>
                      {t("admin.setting." + f.key + "Hint")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
      <div className="adm-settings-foot">
        {error && (
          <p className="adm-form-error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="adm-btn" disabled={!changed.length || saving} onClick={() => setDraft(saved)}>
          {t("admin.discard")}
        </button>
        <button type="submit" className="adm-btn primary" disabled={!changed.length || saving}>
          {saving ? t("admin.saving") : t("admin.settings.save")}
        </button>
      </div>
    </form>
  );
}
