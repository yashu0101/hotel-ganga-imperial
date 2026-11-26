// Input validation for admin edits. Every writable field is declared here with its type and
// limits; anything else in a request body is rejected, so the admin API cannot write
// arbitrary fields (ids, timestamps, unknown keys) into storage.
export type Rule =
  | { type: "string"; max: number; required?: boolean; default?: string }
  | { type: "boolean"; default: boolean }
  | { type: "int"; min: number; max: number; default: number }
  | { type: "date" }
  | { type: "enum"; values: readonly string[]; default: string }
  | { type: "list"; maxItems: number; itemMax: number }
  | { type: "imagePath"; default: string };
export type Schema = Record<string, Rule>;
export type Parsed = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function check(key: string, rule: Rule, value: unknown): { value: unknown } | { error: string } {
  switch (rule.type) {
    case "string": {
      if (typeof value !== "string") return { error: `${key} must be text` };
      const v = value.trim();
      if (rule.required && !v) return { error: `${key} is required` };
      return v.length > rule.max ? { error: `${key} must be ${rule.max} characters or fewer` } : { value: v };
    }
    case "boolean":
      return typeof value === "boolean" ? { value } : { error: `${key} must be true or false` };
    case "int":
      return Number.isInteger(value) && (value as number) >= rule.min && (value as number) <= rule.max
        ? { value }
        : { error: `${key} must be a whole number from ${rule.min} to ${rule.max}` };
    case "date":
      return value === "" || (typeof value === "string" && DATE.test(value) && !isNaN(Date.parse(value)))
        ? { value }
        : { error: `${key} must be a date (YYYY-MM-DD) or empty` };
    case "enum":
      return typeof value === "string" && rule.values.includes(value)
        ? { value }
        : { error: `${key} must be one of: ${rule.values.join(", ")}` };
    case "list": {
      if (
        !Array.isArray(value) ||
        value.length > rule.maxItems ||
        value.some(i => typeof i !== "string" || i.trim().length > rule.itemMax)
      )
        return { error: `${key} must be a list of up to ${rule.maxItems} short items` };
      return { value: value.map((i: string) => i.trim()).filter(Boolean) };
    }
    case "imagePath":
      return typeof value === "string" && /^\/images\/[\w.-]+\.(jpe?g|png|webp|avif)$/i.test(value)
        ? { value }
        : { error: `${key} must be an image in /images/` };
  }
}

function fallback(rule: Rule): unknown {
  if (rule.type === "date") return "";
  if (rule.type === "list") return [];
  if (rule.type === "string") return rule.default ?? "";
  return rule.default;
}

/** Validate a request body. `partial` (updates) only checks the fields that are present. */
export function parseInput(schema: Schema, body: unknown, { partial = false } = {}): Parsed {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Expected a JSON object" };
  const input = body as Record<string, unknown>;
  const unknown = Object.keys(input).filter(k => !(k in schema));
  if (unknown.length) return { ok: false, error: `Unknown field: ${unknown.join(", ")}` };
  const data: Record<string, unknown> = {};
  for (const [key, rule] of Object.entries(schema)) {
    if (!(key in input) || input[key] === undefined) {
      if (partial) continue;
      if (rule.type === "string" && rule.required) return { ok: false, error: `${key} is required` };
      data[key] = fallback(rule);
      continue;
    }
    const result = check(key, rule, input[key]);
    if ("error" in result) return { ok: false, error: result.error };
    data[key] = result.value;
  }
  if (partial && !Object.keys(data).length) return { ok: false, error: "Nothing to update" };
  return { ok: true, data };
}

export const ROOM_SCHEMA: Schema = {
  name: { type: "string", max: 80, required: true },
  text: { type: "string", max: 600 },
  image: { type: "imagePath", default: "/images/image-14.jpeg" },
  rate: { type: "string", max: 40 },
  sample: { type: "boolean", default: false },
  hidden: { type: "boolean", default: false },
};
export const OFFER_SCHEMA: Schema = {
  title: { type: "string", max: 100, required: true },
  description: { type: "string", max: 500 },
  discount: { type: "string", max: 40 },
  code: { type: "string", max: 30 },
  validFrom: { type: "date" },
  validTo: { type: "date" },
  active: { type: "boolean", default: true },
};
export const BANQUET_SCHEMA: Schema = {
  name: { type: "string", max: 100, required: true },
  description: { type: "string", max: 600 },
  capacity: { type: "string", max: 60 },
  price: { type: "string", max: 40 },
  includes: { type: "list", maxItems: 20, itemMax: 80 },
  active: { type: "boolean", default: true },
};
export const DINING_CATEGORIES = ["breakfast", "lunch", "dinner", "room-service", "event-catering"] as const;
export const DINING_SCHEMA: Schema = {
  name: { type: "string", max: 100, required: true },
  description: { type: "string", max: 400 },
  price: { type: "string", max: 40 },
  category: { type: "enum", values: DINING_CATEGORIES, default: "dinner" },
  active: { type: "boolean", default: true },
};
export const REVIEW_SCHEMA: Schema = {
  name: { type: "string", max: 80, required: true },
  rating: { type: "int", min: 1, max: 5, default: 5 },
  text: { type: "string", max: 800 },
  city: { type: "string", max: 60 },
  active: { type: "boolean", default: true },
};
export const BOOKING_STATUSES = ["pending", "confirmed", "checked-in", "checked-out", "cancelled"] as const;
export const BOOKING_UPDATE_SCHEMA: Schema = {
  bookingStatus: { type: "enum", values: BOOKING_STATUSES, default: "pending" },
};
export const ENQUIRY_STATUSES = ["new", "contacted", "confirmed", "cancelled"] as const;
export const ENQUIRY_UPDATE_SCHEMA: Schema = { status: { type: "enum", values: ENQUIRY_STATUSES, default: "new" } };
