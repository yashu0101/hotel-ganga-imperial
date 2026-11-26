"use client";
import { useState, type ReactNode } from "react";
import { adminRequest, type Notify } from "./api";

// One editor for every admin-managed collection (rooms, offers, packages, dining, reviews).
// Fields are declared per collection; the server validates them again. The list only changes
// after the server confirms a create, update or delete.
export interface FieldSpec {
  key: string;
  label: string;
  kind: "text" | "textarea" | "date" | "checkbox" | "select" | "list" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
  full?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean;
}
export interface CollectionConfig<T> {
  title: string;
  endpoint: string;
  addLabel: string;
  fields: FieldSpec[];
  itemName: (item: T) => string;
  summary: (item: T) => ReactNode;
  image?: (item: T) => string | undefined;
  toggle?: { key: "active" | "hidden"; onLabel: string; offLabel: string };
  note?: string;
}
type Item = { id?: string } & Record<string, unknown>;
type Labels = {
  save: string;
  saving: string;
  cancel: string;
  edit: string;
  delete: string;
  confirmDelete: string;
  empty: string;
  saved: string;
  deleted: string;
};

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
function toPayload(fields: FieldSpec[], values: Record<string, unknown>) {
  return Object.fromEntries(
    fields.map(f => {
      const v = values[f.key];
      if (f.kind === "list")
        return [
          f.key,
          String(v)
            .split(",")
            .map(s => s.trim())
            .filter(Boolean),
        ];
      if (f.kind === "number") return [f.key, Number(v)];
      if (f.kind === "checkbox") return [f.key, !!v];
      return [f.key, String(v ?? "")];
    }),
  );
}

function ItemForm({
  fields,
  item,
  title,
  labels,
  onSubmit,
  onCancel,
}: {
  fields: FieldSpec[];
  item?: Item;
  title: string;
  labels: Labels;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => initialValues(fields, item));
  const [busy, setBusy] = useState(false);
  const set = (key: string, value: unknown) => setValues(v => ({ ...v, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(toPayload(fields, values));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="adm-card" onSubmit={submit}>
      <h3>{title}</h3>
      <div className="adm-form">
        {fields.map(f => {
          const id = "field-" + f.key;
          if (f.kind === "checkbox")
            return (
              <label key={f.key} className="check">
                <input type="checkbox" checked={!!values[f.key]} onChange={e => set(f.key, e.target.checked)} />{" "}
                {f.label}
              </label>
            );
          const common = { id, value: String(values[f.key] ?? ""), required: f.required, placeholder: f.placeholder };
          return (
            <div key={f.key} className={f.full ? "full" : undefined}>
              <label htmlFor={id}>
                {f.label}
                {f.required ? " *" : ""}
              </label>
              {f.kind === "textarea" ? (
                <textarea {...common} onChange={e => set(f.key, e.target.value)} />
              ) : f.kind === "select" ? (
                <select {...common} onChange={e => set(f.key, e.target.value)}>
                  {f.options!.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...common}
                  type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"}
                  min={f.min}
                  max={f.max}
                  onChange={e => set(f.key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="adm-actions">
        <button className="adm-btn primary" type="submit" disabled={busy}>
          {busy ? labels.saving : labels.save}
        </button>
        <button className="adm-btn" type="button" onClick={onCancel} disabled={busy}>
          {labels.cancel}
        </button>
      </div>
    </form>
  );
}

export default function CollectionEditor<T extends Item>({
  config,
  items,
  setItems,
  labels,
  notify,
}: {
  config: CollectionConfig<T>;
  items: T[];
  setItems: (items: T[]) => void;
  labels: Labels;
  notify: Notify;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fail = (e: unknown) => notify(e instanceof Error ? e.message : String(e), "error");

  async function create(payload: Record<string, unknown>) {
    try {
      const { item } = await adminRequest<{ item: T }>(config.endpoint, "POST", payload);
      setItems([...items, item]);
      setEditing(null);
      notify(labels.saved);
    } catch (e) {
      fail(e);
    }
  }
  async function update(id: string, payload: Record<string, unknown>, closeForm = true) {
    setBusyId(id);
    try {
      const { item } = await adminRequest<{ item: T }>(config.endpoint, "PATCH", { id, ...payload });
      setItems(items.map(i => (i.id === id ? item : i)));
      if (closeForm) setEditing(null);
      notify(labels.saved);
    } catch (e) {
      fail(e);
    } finally {
      setBusyId(null);
    }
  }
  async function remove(item: T) {
    if (!window.confirm(labels.confirmDelete.replace("{name}", config.itemName(item)))) return;
    setBusyId(item.id!);
    try {
      await adminRequest(config.endpoint + "?id=" + encodeURIComponent(item.id!), "DELETE");
      setItems(items.filter(i => i.id !== item.id));
      notify(labels.deleted);
    } catch (e) {
      fail(e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="adm-section-head">
        <h2>{config.title}</h2>
        <button className="adm-btn primary" onClick={() => setEditing("new")}>
          {config.addLabel}
        </button>
      </div>
      {config.note && <p className="adm-note">{config.note}</p>}
      {editing === "new" && (
        <ItemForm
          fields={config.fields}
          title={config.addLabel}
          labels={labels}
          onSubmit={create}
          onCancel={() => setEditing(null)}
        />
      )}
      {items.map(item =>
        editing === item.id ? (
          <ItemForm
            key={item.id}
            fields={config.fields}
            item={item}
            title={labels.edit + ": " + config.itemName(item)}
            labels={labels}
            onSubmit={p => update(item.id!, p)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={item.id} className="adm-card adm-item">
            {/* Admin previews use plain img so any configured path renders without image optimisation. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {config.image?.(item) && <img src={config.image(item)} alt="" />}
            <div>{config.summary(item)}</div>
            <div className="adm-item-actions">
              {config.toggle && (
                <button
                  className="adm-btn"
                  disabled={busyId === item.id}
                  onClick={() => update(item.id!, { [config.toggle!.key]: !item[config.toggle!.key] }, false)}
                >
                  {item[config.toggle.key] ? config.toggle.onLabel : config.toggle.offLabel}
                </button>
              )}
              <button className="adm-btn" onClick={() => setEditing(item.id!)}>
                {labels.edit}
              </button>
              <button className="adm-btn danger" disabled={busyId === item.id} onClick={() => remove(item)}>
                {labels.delete}
              </button>
            </div>
          </div>
        ),
      )}
      {items.length === 0 && editing !== "new" && <p className="adm-note">{labels.empty}</p>}
    </>
  );
}
