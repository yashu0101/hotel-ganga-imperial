import type { CollectionConfig } from "./CollectionEditor";
import { DINING_CATEGORIES } from "@/lib/validation";
import type { Room, Offer, BanquetPackage, DiningOption, Review } from "@/lib/types";

// Admin editor configuration per collection. Field limits mirror src/lib/validation.ts,
// which the API enforces.
type T = (key: string) => string;
const badge = (on: boolean, onText: string, offText: string, offClass = "inactive") => (
  <span className={`badge badge-${on ? "active" : offClass}`}>{on ? onText : offText}</span>
);

export const COLLECTIONS = (t: T) => ({
  rooms: {
    title: t("admin.roomTypes"),
    endpoint: "/api/rooms",
    addLabel: t("admin.addRoom"),
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "rate", label: "Nightly rate", kind: "text", placeholder: "e.g. ₹3,000/night" },
      { key: "text", label: "Description", kind: "textarea", full: true },
      {
        key: "image",
        label: "Image path",
        kind: "text",
        placeholder: "/images/image-14.jpeg",
        defaultValue: "/images/image-14.jpeg",
      },
      { key: "sample", label: "Representative photo (shows a disclosure label)", kind: "checkbox", defaultValue: true },
      { key: "hidden", label: t("admin.hidden"), kind: "checkbox" },
    ],
    itemName: r => r.name,
    image: r => r.image,
    summary: r => (
      <>
        <h3>
          {r.name}
          {r.hidden && badge(false, "", t("admin.hidden"), "hidden")}
        </h3>
        <p>{r.text}</p>
        <p>
          {r.rate || "On request"}
          {r.sample && " · representative photo"}
        </p>
      </>
    ),
    toggle: { key: "hidden", onLabel: t("admin.show"), offLabel: t("admin.hide") },
  } satisfies CollectionConfig<Room & Record<string, unknown>>,
  offers: {
    title: t("admin.offersTitle"),
    endpoint: "/api/offers",
    addLabel: t("admin.addOffer"),
    fields: [
      { key: "title", label: "Title", kind: "text", required: true },
      { key: "discount", label: "Badge text", kind: "text", placeholder: "e.g. 20% off" },
      { key: "description", label: "Description", kind: "textarea", full: true },
      { key: "validFrom", label: "Valid from", kind: "date" },
      { key: "validTo", label: "Valid to", kind: "date" },
      { key: "active", label: t("admin.active"), kind: "checkbox", defaultValue: true },
    ],
    itemName: o => o.title,
    summary: o => (
      <>
        <h3>
          {o.title}
          {badge(o.active, t("admin.active"), t("admin.inactive"))}
        </h3>
        <p>{o.discount}</p>
        <p>{o.description}</p>
        {(o.validFrom || o.validTo) && (
          <p>
            {o.validFrom || "…"} → {o.validTo || "…"}
          </p>
        )}
      </>
    ),
    toggle: { key: "active", onLabel: t("admin.deactivate"), offLabel: t("admin.activate") },
  } satisfies CollectionConfig<Offer & Record<string, unknown>>,
  banquet: {
    title: t("admin.banquetPackages"),
    endpoint: "/api/banquet",
    addLabel: t("admin.addPackage"),
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "price", label: "Price", kind: "text", placeholder: "e.g. ₹1,50,000" },
      { key: "capacity", label: "Capacity", kind: "text", placeholder: "e.g. Up to 200 guests" },
      { key: "active", label: t("admin.active"), kind: "checkbox", defaultValue: true },
      { key: "description", label: "Description", kind: "textarea", full: true },
      {
        key: "includes",
        label: "Includes (comma separated)",
        kind: "list",
        full: true,
        placeholder: "Hall rental, Catering, Decoration",
      },
    ],
    itemName: p => p.name,
    summary: p => (
      <>
        <h3>
          {p.name}
          {badge(p.active, t("admin.active"), t("admin.inactive"))}
        </h3>
        <p>{[p.price, p.capacity].filter(Boolean).join(" · ")}</p>
        <p>{p.description}</p>
        {p.includes.length > 0 && <p>Includes: {p.includes.join(", ")}</p>}
      </>
    ),
    toggle: { key: "active", onLabel: t("admin.deactivate"), offLabel: t("admin.activate") },
  } satisfies CollectionConfig<BanquetPackage & Record<string, unknown>>,
  dining: {
    title: t("admin.diningOptions"),
    endpoint: "/api/dining",
    addLabel: t("admin.addOption"),
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "price", label: "Price", kind: "text", placeholder: "e.g. ₹800 per person" },
      {
        key: "category",
        label: "Category",
        kind: "select",
        defaultValue: "dinner",
        options: DINING_CATEGORIES.map(c => ({ value: c, label: c.replace("-", " ") })),
      },
      { key: "active", label: t("admin.active"), kind: "checkbox", defaultValue: true },
      { key: "description", label: "Description", kind: "textarea", full: true },
    ],
    itemName: d => d.name,
    summary: d => (
      <>
        <h3>
          {d.name}
          {badge(d.active, t("admin.active"), t("admin.inactive"))}
        </h3>
        <p>
          {d.category.replace("-", " ")}
          {d.price && " · " + d.price}
        </p>
        <p>{d.description}</p>
      </>
    ),
    toggle: { key: "active", onLabel: t("admin.deactivate"), offLabel: t("admin.activate") },
  } satisfies CollectionConfig<DiningOption & Record<string, unknown>>,
  reviews: {
    title: t("admin.reviews"),
    endpoint: "/api/reviews",
    addLabel: t("admin.addReview"),
    note: t("admin.reviewsNote"),
    fields: [
      { key: "name", label: "Guest name", kind: "text", required: true },
      { key: "rating", label: "Rating (1–5)", kind: "number", min: 1, max: 5, defaultValue: 5 },
      { key: "city", label: "City", kind: "text" },
      { key: "active", label: t("admin.active"), kind: "checkbox", defaultValue: true },
      { key: "text", label: "Review", kind: "textarea", full: true },
    ],
    itemName: r => r.name,
    summary: r => (
      <>
        <h3>
          {r.name}
          {badge(r.active, t("admin.active"), t("admin.inactive"))}
        </h3>
        <p>
          {"★".repeat(r.rating)}
          {r.city && " · " + r.city}
        </p>
        <p>{r.text}</p>
      </>
    ),
    toggle: { key: "active", onLabel: t("admin.deactivate"), offLabel: t("admin.activate") },
  } satisfies CollectionConfig<Review & Record<string, unknown>>,
});
