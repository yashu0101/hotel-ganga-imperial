"use client";
import { useState, type ReactNode } from "react";
import { useApp } from "@/lib/context";
import { adminRequest, errorText } from "./api";
import Icon from "./icons";
import { fill } from "./format";
import { Modal, useAdminUI } from "./ui";

// One editor for every admin-managed collection (rooms, offers, packages, dining, reviews):
// a list with an on-site switch per item, and a side drawer with the fields in groups.
// Fields are declared per collection; the server validates them again. The list only changes
// after the server confirms a create, update or delete.
export interface FieldSpec {
  key: string;
  label: string;
  kind: "text" | "textarea" | "date" | "checkbox" | "select" | "list" | "number" | "image";
  /** Fields are shown in groups, in the order the groups first appear. */
  group?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
  full?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean;
}
export interface CollectionConfig<T> {
  endpoint: string;
  addLabel: string;
  /** "Edit room", "New offer"… */
  editTitle: string;
  newTitle: string;
  intro?: string;
  empty: string;
  fields: FieldSpec[];
  itemName: (item: T) => string;
  subtitle?: (item: T) => ReactNode;
  image?: (item: T) => string | undefined;
  columns: { label: string; cell: (item: T) => ReactNode; numeric?: boolean }[];
  /** The on-site switch. `hidden` is inverted: the switch shows whether guests can see it. */
  toggle?: { key: "active" | "hidden"; label: string; summary?: "onSite" | "active" };
}
type Item = { id?: string } & Record<string, unknown>;

function initialValues(fields: FieldSpec[], item?: Item) {
  return Object.fromEntries(
    fields.map(f => {
      const v = item?.[f.key];
      if (f.kind === "list") return [f.key, Array.isArray(v) ? v.join(", ") : ""];
      if (f.kind === "checkbox") return [f.key, typeof v === "boolean" ? v : (f.defaultValue ?? false)];
      return [f.key, v ?? f.defaultValue ?? ""];
    }),
  );
}
const splitList = (v: unknown) =>
  String(v ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
function toPayload(fields: FieldSpec[], values: Record<string, unknown>) {
  return Object.fromEntries(
    fields.map(f => {
      const v = values[f.key];
      if (f.kind === "list") return [f.key, splitList(v)];
      if (f.kind === "number") return [f.key, Number(v)];
      if (f.kind === "checkbox") return [f.key, !!v];
      return [f.key, String(v ?? "")];
    }),
  );
}

function Field({ f, value, set }: { f: FieldSpec; value: unknown; set: (v: unknown) => void }) {
  const id = "field-" + f.key,
    hintId = f.hint ? id + "-hint" : undefined;
  if (f.kind === "checkbox")
    return (
      <div className="adm-field full">
        <label className="adm-check">
          <input type="checkbox" checked={!!value} onChange={e => set(e.target.checked)} aria-describedby={hintId} />
          <span>{f.label}</span>
        </label>
        {f.hint && (
          <p className="adm-hint" id={hintId}>
            {f.hint}
          </p>
        )}
      </div>
    );
  const common = {
    id,
    value: String(value ?? ""),
    required: f.required,
    placeholder: f.placeholder,
    "aria-describedby": hintId,
  };
  return (
    <div className={"adm-field" + (f.full || f.kind === "image" ? " full" : "")}>
      <label htmlFor={id}>
        {f.label}
        {f.required && <span aria-hidden="true"> *</span>}
      </label>
      {f.kind === "textarea" ? (
        <textarea {...common} rows={4} onChange={e => set(e.target.value)} />
      ) : f.kind === "select" ? (
        <select {...common} onChange={e => set(e.target.value)}>
          {f.options!.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : f.kind === "image" ? (
        <div className="adm-image-field">
          {/* Admin previews use plain img so any configured path renders without image optimisation. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={String(value)} alt="" /> : <span className="adm-thumb-empty" />}
          <input {...common} type="text" onChange={e => set(e.target.value)} />
        </div>
      ) : (
        <input
          {...common}
          type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"}
          min={f.min}
          max={f.max}
          onChange={e => set(e.target.value)}
        />
      )}
      {f.kind === "list" && splitList(value).length > 0 && (
        <ul className="adm-tags" aria-label={f.label}>
          {splitList(value).map((tag, i) => (
            <li key={i}>{tag}</li>
          ))}
        </ul>
      )}
      {f.hint && (
        <p className="adm-hint" id={hintId}>
          {f.hint}
        </p>
      )}
    </div>
  );
}

function ItemDrawer({
  fields,
  item,
  title,
  onSubmit,
  onClose,
}: {
  fields: FieldSpec[];
  item?: Item;
  title: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useApp();
  const { confirm } = useAdminUI();
  const [initial] = useState(() => initialValues(fields, item));
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const groups = [...new Set(fields.map(f => f.group ?? ""))];

  async function close() {
    if (busy) return;
    if (
      dirty &&
      !(await confirm({
        title: t("admin.discardTitle"),
        body: t("admin.discardBody"),
        action: t("admin.discard"),
        danger: true,
      }))
    )
      return;
    onClose();
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(toPayload(fields, values)).finally(() => setBusy(false));
    if (ok) onClose();
  }

  return (
    <Modal className="adm-drawer" labelledBy="adm-drawer-title" onClose={close}>
      <form className="adm-drawer-inner" onSubmit={submit}>
        <header className="adm-drawer-head">
          <h2 id="adm-drawer-title">{title}</h2>
          <button type="button" className="adm-icon-btn" onClick={close} aria-label={t("admin.close")}>
            <Icon name="close" />
          </button>
        </header>
        <div className="adm-drawer-body">
          {groups.map(group => (
            <fieldset key={group} className="adm-fieldset">
              {group && <legend>{group}</legend>}
              <div className="adm-form">
                {fields
                  .filter(f => (f.group ?? "") === group)
                  .map(f => (
                    <Field key={f.key} f={f} value={values[f.key]} set={v => setValues(s => ({ ...s, [f.key]: v }))} />
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
        <footer className="adm-drawer-foot">
          <span className="adm-muted">{dirty ? t("admin.unsaved") : ""}</span>
          <button className="adm-btn" type="button" onClick={close} disabled={busy}>
            {t("admin.cancel")}
          </button>
          <button className="adm-btn primary" type="submit" disabled={busy}>
            {busy ? t("admin.saving") : t("admin.saveChanges")}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export default function CollectionEditor<T extends Item>({
  config,
  items,
  setItems,
}: {
  config: CollectionConfig<T>;
  items: T[];
  setItems: (items: T[]) => void;
}) {
  const { t } = useApp();
  const { notify, confirm } = useAdminUI();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fail = (e: unknown) => notify(errorText(t, e), "error");
  const current = editing && editing !== "new" ? items.find(i => i.id === editing) : undefined;

  async function create(payload: Record<string, unknown>) {
    try {
      const { item } = await adminRequest<{ item: T }>(config.endpoint, "POST", payload);
      setItems([...items, item]);
      notify(t("admin.saved"));
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  }
  async function update(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    try {
      const { item } = await adminRequest<{ item: T }>(config.endpoint, "PATCH", { id, ...payload });
      setItems(items.map(i => (i.id === id ? item : i)));
      notify(t("admin.saved"));
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusyId(null);
    }
  }
  async function remove(item: T) {
    const ok = await confirm({
      title: fill(t("admin.deleteTitle"), { name: config.itemName(item) }),
      body: t("admin.deleteBody"),
      action: t("admin.delete"),
      danger: true,
    });
    if (!ok) return;
    setBusyId(item.id!);
    try {
      await adminRequest(config.endpoint + "?id=" + encodeURIComponent(item.id!), "DELETE");
      setItems(items.filter(i => i.id !== item.id));
      notify(t("admin.deleted"));
    } catch (e) {
      fail(e);
    } finally {
      setBusyId(null);
    }
  }

  const toggle = config.toggle;
  const shown = (item: T) => (toggle!.key === "hidden" ? !item.hidden : !!item.active);

  return (
    <>
      <div className="adm-section-bar">
        <div className="adm-section-text">
          {config.intro && <p className="adm-lead">{config.intro}</p>}
          {toggle && items.length > 0 && (
            <p className="adm-meta-line">
              {fill(t(toggle.summary === "active" ? "admin.activeSummary" : "admin.onSiteSummary"), {
                on: items.filter(shown).length,
                n: items.length,
              })}
            </p>
          )}
        </div>
        <button type="button" className="adm-btn primary" onClick={() => setEditing("new")}>
          <Icon name="plus" />
          {config.addLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="adm-empty boxed">
          <Icon name="list" size={28} />
          <p>{config.empty}</p>
          <button type="button" className="adm-btn" onClick={() => setEditing("new")}>
            <Icon name="plus" />
            {config.addLabel}
          </button>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table adm-collection">
            <thead>
              <tr>
                <th scope="col">{t("admin.name")}</th>
                {config.columns.map(c => (
                  <th key={c.label} scope="col" className={c.numeric ? "num" : undefined}>
                    {c.label}
                  </th>
                ))}
                {toggle && <th scope="col">{toggle.label}</th>}
                <th scope="col">
                  <span className="sr-only">{t("admin.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const name = config.itemName(item),
                  image = config.image?.(item);
                return (
                  <tr key={item.id} className={toggle && !shown(item) ? "is-off" : undefined}>
                    <td>
                      <div className="adm-item-name">
                        {config.image &&
                          (image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt="" className="adm-thumb" />
                          ) : (
                            <span className="adm-thumb adm-thumb-empty" />
                          ))}
                        <div>
                          <button type="button" className="adm-row-open" onClick={() => setEditing(item.id!)}>
                            {name}
                          </button>
                          {config.subtitle && <span className="sub">{config.subtitle(item)}</span>}
                        </div>
                      </div>
                    </td>
                    {config.columns.map(c => (
                      <td key={c.label} className={c.numeric ? "num" : undefined}>
                        {c.cell(item)}
                      </td>
                    ))}
                    {toggle && (
                      <td>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={shown(item)}
                          aria-label={toggle.label + ": " + name}
                          className="adm-switch"
                          disabled={busyId === item.id}
                          onClick={() =>
                            update(item.id!, { [toggle.key]: toggle.key === "hidden" ? shown(item) : !item.active })
                          }
                        >
                          <span className="track" aria-hidden="true" />
                          <span className="state">{shown(item) ? t("admin.on") : t("admin.off")}</span>
                        </button>
                      </td>
                    )}
                    <td className="adm-row-actions">
                      <button
                        type="button"
                        className="adm-icon-btn"
                        onClick={() => setEditing(item.id!)}
                        aria-label={t("admin.edit") + ": " + name}
                        title={t("admin.edit")}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        type="button"
                        className="adm-icon-btn danger"
                        disabled={busyId === item.id}
                        onClick={() => remove(item)}
                        aria-label={t("admin.delete") + ": " + name}
                        title={t("admin.delete")}
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing === "new" && (
        <ItemDrawer fields={config.fields} title={config.newTitle} onSubmit={create} onClose={() => setEditing(null)} />
      )}
      {current && (
        <ItemDrawer
          key={current.id}
          fields={config.fields}
          item={current}
          title={config.editTitle + ": " + config.itemName(current)}
          onSubmit={p => update(current.id!, p)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
