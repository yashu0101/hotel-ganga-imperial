import type { CollectionConfig } from "./CollectionEditor";
import { DINING_CATEGORIES } from "@/lib/validation";
import type { Room, Offer, BanquetPackage, DiningOption, Review } from "@/lib/types";

// Admin editor configuration per collection. Field limits mirror src/lib/validation.ts,
// which the API enforces. Labels follow the admin's language; placeholders are English
// examples because the public site, where this content appears, is English-only.
type T = (key: string) => string;
const day = (d: string, locale: string) =>
  d
    ? new Date(d + "T00:00:00Z").toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
const ROOM_FACTS = ["size", "bed", "occupancy", "bathroom", "location", "view"] as const;

/** A list column tagging unapproved sample content (listed in the launch checklist until staff untick it). */
const sampleColumn = <I extends { sample?: boolean }>(t: T) => ({
  label: t("admin.c.content"),
  cell: (item: I) => (item.sample ? <span className="adm-tag small">{t("admin.sampleTag")}</span> : "–"),
});

const dateRange = (from: string, to: string, locale: string) =>
  from || to ? `${day(from, locale) || "…"} – ${day(to, locale) || "…"}` : "";

export const COLLECTIONS = (t: T, locale: string) => ({
  rooms: {
    endpoint: "/api/rooms",
    addLabel: t("admin.addRoom"),
    newTitle: t("admin.newRoom"),
    editTitle: t("admin.editRoom"),
    intro: t("admin.roomsNote"),
    empty: t("admin.emptyRooms"),
    fields: [
      {
        key: "name",
        label: t("admin.f.name"),
        kind: "text",
        required: true,
        placeholder: "Deluxe Room",
        group: t("admin.g.basics"),
      },
      {
        key: "slug",
        label: t("admin.f.slug"),
        kind: "text",
        group: t("admin.g.basics"),
        placeholder: "deluxe-room",
        hint: t("admin.h.slug"),
      },
      { key: "rate", label: t("admin.f.rate"), kind: "text", placeholder: "₹3,000/night", group: t("admin.g.basics") },
      {
        key: "sampleRate",
        label: t("admin.f.sampleRate"),
        kind: "checkbox",
        group: t("admin.g.basics"),
        hint: t("admin.h.sampleContent"),
      },
      {
        key: "text",
        label: t("admin.f.description"),
        kind: "textarea",
        full: true,
        placeholder: "A warm, cove-lit room with a work desk and city view.",
        group: t("admin.g.basics"),
      },
      {
        key: "image",
        label: t("admin.f.image"),
        kind: "image",
        placeholder: "/images/image-49.jpeg",
        defaultValue: "/images/image-49.jpeg",
        group: t("admin.g.photo"),
      },
      {
        key: "sample",
        label: t("admin.f.sample"),
        kind: "checkbox",
        defaultValue: true,
        group: t("admin.g.photo"),
        hint: t("admin.h.sampleContent"),
      },
      {
        key: "size",
        label: t("admin.f.size"),
        kind: "text",
        placeholder: "28 m² (300 sq ft)",
        group: t("admin.g.facts"),
      },
      {
        key: "bed",
        label: t("admin.f.bed"),
        kind: "text",
        placeholder: "King bed or twin beds",
        group: t("admin.g.facts"),
      },
      {
        key: "occupancy",
        label: t("admin.f.occupancy"),
        kind: "text",
        placeholder: "2 adults and 1 child",
        group: t("admin.g.facts"),
      },
      {
        key: "bathroom",
        label: t("admin.f.bathroom"),
        kind: "text",
        placeholder: "Private bathroom with shower",
        group: t("admin.g.facts"),
      },
      {
        key: "location",
        label: t("admin.f.location"),
        kind: "text",
        placeholder: "Floors 2–4",
        group: t("admin.g.facts"),
      },
      {
        key: "view",
        label: t("admin.f.view"),
        kind: "text",
        placeholder: "City view",
        group: t("admin.g.facts"),
        hint: t("admin.h.facts"),
        full: true,
      },
      {
        key: "inRoom",
        label: t("admin.f.inRoom"),
        kind: "list",
        full: true,
        placeholder: "Air conditioning, Wi-Fi, Television",
        group: t("admin.g.inclusions"),
        hint: t("admin.h.list"),
      },
      {
        key: "services",
        label: t("admin.f.services"),
        kind: "list",
        full: true,
        placeholder: "Complimentary breakfast, Late checkout",
        group: t("admin.g.inclusions"),
      },
      { key: "hidden", label: t("admin.f.hidden"), kind: "checkbox", group: t("admin.g.visibility") },
    ],
    itemName: r => r.name,
    subtitle: r => "/rooms/" + r.slug,
    image: r => r.image,
    columns: [
      {
        label: t("admin.f.rate"),
        cell: r =>
          r.rate ? (
            <>
              {r.rate} {r.sampleRate && <span className="adm-tag small">{t("admin.sampleTag")}</span>}
            </>
          ) : (
            <span className="adm-muted">{t("admin.onRequest")}</span>
          ),
      },
      {
        label: t("admin.c.facts"),
        cell: r => {
          const known = ROOM_FACTS.filter(k => r[k]?.trim()).length;
          return (
            <span className={"adm-progress" + (known < ROOM_FACTS.length ? " incomplete" : "")}>
              <span className="meter" aria-hidden="true">
                <span style={{ width: `${(known / ROOM_FACTS.length) * 100}%` }} />
              </span>
              {known}/{ROOM_FACTS.length}
            </span>
          );
        },
      },
      {
        label: t("admin.c.photo"),
        cell: r => (r.sample ? <span className="adm-tag">{t("admin.representative")}</span> : t("admin.ownPhoto")),
      },
    ],
    toggle: { key: "hidden", label: t("admin.c.onSite") },
  } satisfies CollectionConfig<Room & Record<string, unknown>>,
  offers: {
    endpoint: "/api/offers",
    addLabel: t("admin.addOffer"),
    newTitle: t("admin.newOffer"),
    editTitle: t("admin.editOffer"),
    empty: t("admin.emptyOffers"),
    fields: [
      {
        key: "title",
        label: t("admin.f.title"),
        kind: "text",
        required: true,
        full: true,
        placeholder: "Early-bird stay",
      },
      { key: "discount", label: t("admin.f.badge"), kind: "text", placeholder: "20% off", hint: t("admin.h.badge") },
      { key: "code", label: t("admin.f.code"), kind: "text", placeholder: "EARLY20" },
      {
        key: "description",
        label: t("admin.f.description"),
        kind: "textarea",
        full: true,
        placeholder: "Book 30 days ahead and save on your stay.",
      },
      { key: "validFrom", label: t("admin.f.validFrom"), kind: "date" },
      { key: "validTo", label: t("admin.f.validTo"), kind: "date" },
      {
        key: "minAdvanceDays",
        label: t("admin.f.minAdvanceDays"),
        kind: "number",
        min: 0,
        max: 365,
        defaultValue: 0,
        hint: t("admin.h.minAdvanceDays"),
      },
      {
        key: "minNights",
        label: t("admin.f.minNights"),
        kind: "number",
        min: 0,
        max: 30,
        defaultValue: 0,
        hint: t("admin.h.minNights"),
      },
      { key: "active", label: t("admin.f.activeOffer"), kind: "checkbox", defaultValue: true },
      { key: "sample", label: t("admin.f.sampleContent"), kind: "checkbox", hint: t("admin.h.sampleContent") },
    ],
    itemName: o => o.title,
    subtitle: o => o.description,
    columns: [
      { label: t("admin.f.badge"), cell: o => o.discount || "–" },
      { label: t("admin.f.code"), cell: o => (o.code ? <code>{o.code}</code> : "–") },
      { label: t("admin.c.valid"), cell: o => dateRange(o.validFrom, o.validTo, locale) || t("admin.always") },
      sampleColumn<Offer>(t),
    ],
    toggle: { key: "active", label: t("admin.c.onSite") },
  } satisfies CollectionConfig<Offer & Record<string, unknown>>,
  banquet: {
    endpoint: "/api/banquet",
    addLabel: t("admin.addPackage"),
    newTitle: t("admin.newPackage"),
    editTitle: t("admin.editPackage"),
    empty: t("admin.emptyPackages"),
    fields: [
      {
        key: "name",
        label: t("admin.f.name"),
        kind: "text",
        required: true,
        full: true,
        placeholder: "Wedding package",
      },
      { key: "price", label: t("admin.f.price"), kind: "text", placeholder: "₹1,50,000" },
      { key: "capacity", label: t("admin.f.capacity"), kind: "text", placeholder: "Up to 200 guests" },
      {
        key: "description",
        label: t("admin.f.description"),
        kind: "textarea",
        full: true,
        placeholder: "Hall, catering and décor for your celebration.",
      },
      {
        key: "includes",
        label: t("admin.f.includes"),
        kind: "list",
        full: true,
        placeholder: "Hall rental, Catering, Decoration",
        hint: t("admin.h.list"),
      },
      { key: "active", label: t("admin.f.activePackage"), kind: "checkbox", defaultValue: true },
      { key: "sample", label: t("admin.f.sampleContent"), kind: "checkbox", hint: t("admin.h.sampleContent") },
    ],
    itemName: p => p.name,
    subtitle: p => p.includes.join(", "),
    columns: [
      { label: t("admin.f.price"), cell: p => p.price || "–" },
      { label: t("admin.f.capacity"), cell: p => p.capacity || "–" },
      sampleColumn<BanquetPackage>(t),
    ],
    toggle: { key: "active", label: t("admin.c.onSite") },
  } satisfies CollectionConfig<BanquetPackage & Record<string, unknown>>,
  dining: {
    endpoint: "/api/dining",
    addLabel: t("admin.addOption"),
    newTitle: t("admin.newOption"),
    editTitle: t("admin.editOption"),
    empty: t("admin.emptyDining"),
    fields: [
      {
        key: "name",
        label: t("admin.f.name"),
        kind: "text",
        required: true,
        full: true,
        placeholder: "North Indian thali",
      },
      {
        key: "category",
        label: t("admin.f.category"),
        kind: "select",
        defaultValue: "dinner",
        options: DINING_CATEGORIES.map(c => ({ value: c, label: t("admin.dining." + c) })),
      },
      { key: "price", label: t("admin.f.price"), kind: "text", placeholder: "₹800 per person" },
      {
        key: "description",
        label: t("admin.f.description"),
        kind: "textarea",
        full: true,
        placeholder: "Seasonal vegetables, dal, rice, rotis and dessert.",
      },
      { key: "active", label: t("admin.f.activeOption"), kind: "checkbox", defaultValue: true },
      { key: "sample", label: t("admin.f.sampleContent"), kind: "checkbox", hint: t("admin.h.sampleContent") },
    ],
    itemName: d => d.name,
    subtitle: d => d.description,
    columns: [
      { label: t("admin.f.category"), cell: d => t("admin.dining." + d.category) },
      { label: t("admin.f.price"), cell: d => d.price || "–" },
      sampleColumn<DiningOption>(t),
    ],
    toggle: { key: "active", label: t("admin.c.onSite") },
  } satisfies CollectionConfig<DiningOption & Record<string, unknown>>,
  reviews: {
    endpoint: "/api/reviews",
    addLabel: t("admin.addReview"),
    newTitle: t("admin.newReview"),
    editTitle: t("admin.editReview"),
    intro: t("admin.reviewsNote"),
    empty: t("admin.emptyReviews"),
    fields: [
      { key: "name", label: t("admin.f.guestName"), kind: "text", required: true, placeholder: "Anita S." },
      { key: "city", label: t("admin.f.city"), kind: "text", placeholder: "Varanasi" },
      { key: "rating", label: t("admin.f.rating"), kind: "number", min: 1, max: 5, defaultValue: 5 },
      {
        key: "text",
        label: t("admin.f.review"),
        kind: "textarea",
        full: true,
        placeholder: "The guest’s words, exactly as they wrote them.",
      },
      { key: "active", label: t("admin.f.activeReview"), kind: "checkbox", defaultValue: true },
    ],
    itemName: r => r.name,
    subtitle: r => r.text,
    columns: [
      {
        label: t("admin.f.rating"),
        cell: r => (
          <span className="adm-stars" aria-label={r.rating + " / 5"}>
            <span aria-hidden="true">{"★".repeat(r.rating) + "☆".repeat(Math.max(0, 5 - r.rating))}</span>
          </span>
        ),
      },
      { label: t("admin.f.city"), cell: r => r.city || "–" },
    ],
    toggle: { key: "active", label: t("admin.c.active"), summary: "active" },
  } satisfies CollectionConfig<Review & Record<string, unknown>>,
});
