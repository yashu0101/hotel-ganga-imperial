"use client";
import { useState } from "react";
import { useApp } from "@/lib/context";
import type { BanquetPackage, Booking, Offer, Room } from "@/lib/types";
import { adminRequest } from "./api";
import {
  addDays,
  clampCount,
  counted,
  daysBetween,
  DINING,
  formatDay,
  HALL,
  hotelDay,
  localeFor,
  PACKAGE_PREFIX,
} from "./format";
import Icon from "./icons";
import { StatusBadge } from "./status";
import { Modal, useAdminUI } from "./ui";

// Staff add a booking they took by phone, WhatsApp or at the desk. A side panel, so the calendar
// stays visible: pick the room or event from cards, see a live summary, save. The server applies
// the same rules as the website form; the guest gets no automatic message.
export interface BookingDraft {
  /** YYYY-MM-DD: check-in, or the event date. */
  date?: string;
  /** A type value: "room:<id or name>", "Banquet hall", "Banquet - <package>" or "Dining enquiry". */
  type?: string;
}

const roomValue = (r: Room) => "room:" + (r.id || r.name);
const LIMITS = { rooms: [1, 10], guests: [1, 20], eventGuests: [1, 300] } as const;

function Stepper({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  const { t } = useApp();
  const n = clampCount(value, min, max);
  return (
    <div className="adm-field">
      <label htmlFor={id}>{label}</label>
      <div className="adm-stepper">
        <button
          type="button"
          onClick={() => onChange(String(clampCount(n - 1, min, max)))}
          disabled={n <= min}
          aria-label={t("admin.decrease") + ": " + label}
        >
          <Icon name="minus" size={16} />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => onChange(String(n))}
        />
        <button
          type="button"
          onClick={() => onChange(String(clampCount(n + 1, min, max)))}
          disabled={n >= max}
          aria-label={t("admin.increase") + ": " + label}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}

export default function BookingForm({
  rooms,
  packages,
  offers = [],
  initial = {},
  onSaved,
  onClose,
}: {
  rooms: Room[];
  packages: BanquetPackage[];
  /** Offers with a code that are on the website today can be recorded, as a guest quoting one by phone. */
  offers?: Offer[];
  initial?: BookingDraft;
  onSaved: (booking: Booking) => void;
  onClose: () => void;
}) {
  const { t, lang } = useApp();
  const locale = localeFor(lang);
  const { confirm } = useAdminUI();
  const today = hotelDay();
  const visibleRooms = rooms.filter(r => !r.hidden),
    activePackages = packages.filter(p => p.active),
    codedOffers = offers.filter(
      o => o.active && o.code && (!o.validFrom || o.validFrom <= today) && (!o.validTo || today <= o.validTo),
    );
  const firstDate = initial.date && initial.date >= today ? initial.date : today;
  const start = {
    type: initial.type || (visibleRooms[0] ? roomValue(visibleRooms[0]) : HALL),
    roomsRequested: "1",
    checkin: firstDate,
    checkout: addDays(firstDate, 1),
    guests: "2",
    name: "",
    mobile: "",
    email: "",
    city: "",
    specialRequests: "",
    couponCode: "",
    bookingStatus: "confirmed",
  };
  const [values, setValues] = useState(start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof typeof start, value: string) => setValues(v => ({ ...v, [key]: value }));
  const room = visibleRooms.find(r => roomValue(r) === values.type);
  const pkg = activePackages.find(p => PACKAGE_PREFIX + p.name === values.type);
  const event = values.type === HALL || !!pkg;
  const [guestMin, guestMax] = event ? LIMITS.eventGuests : LIMITS.guests;
  const dirty = JSON.stringify(values) !== JSON.stringify(start);

  // Room stays need a check-out after check-in; moving check-in past it moves check-out along.
  const setCheckin = (day: string) =>
    setValues(v => ({ ...v, checkin: day, checkout: v.checkout > day ? v.checkout : addDays(day, 1) }));
  // Leaving an event for a room or dining keeps the guest count inside the lower limit.
  const setType = (type: string) =>
    setValues(v => {
      const isEvent = type === HALL || type.startsWith(PACKAGE_PREFIX);
      const max = isEvent ? LIMITS.eventGuests[1] : LIMITS.guests[1];
      return { ...v, type, guests: String(clampCount(v.guests, 1, max)) };
    });

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
    setError("");
    const body = {
      name: values.name,
      mobile: values.mobile,
      email: values.email,
      city: values.city,
      roomType: room ? room.name : values.type,
      ...(room?.id ? { roomId: room.id } : {}),
      ...(room
        ? { roomsRequested: clampCount(values.roomsRequested, ...LIMITS.rooms), checkout: values.checkout }
        : {}),
      checkin: values.checkin,
      guests: clampCount(values.guests, guestMin, guestMax),
      specialRequests: values.specialRequests,
      ...(values.couponCode ? { couponCode: values.couponCode } : {}),
      bookingStatus: values.bookingStatus,
    };
    try {
      const { item } = await adminRequest<{ item: Booking }>("/api/bookings", "POST", body);
      onSaved(item);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const day = (d: string) => formatDay(d, locale, { weekday: "short", day: "numeric", month: "short" });
  const nights = room ? daysBetween(values.checkin, values.checkout) : 0;
  const typeName = room
    ? room.name
    : pkg
      ? pkg.name
      : values.type === HALL
        ? t("admin.opt.hall")
        : t("admin.opt.dining");
  const roomsCount = clampCount(values.roomsRequested, ...LIMITS.rooms);

  const card = (value: string, title: string, sub?: string) => (
    <label key={value} className="adm-type-card">
      <input
        type="radio"
        name="bk-type"
        value={value}
        checked={values.type === value}
        onChange={() => setType(value)}
      />
      <span className="title">{title}</span>
      {sub && <span className="sub">{sub}</span>}
      <span className="tick" aria-hidden="true">
        <Icon name="check" size={14} />
      </span>
    </label>
  );
  const input = (
    key: keyof typeof start,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    full = false,
  ) => (
    <div className={"adm-field" + (full ? " full" : "")}>
      <label htmlFor={"bk-" + key}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <input id={"bk-" + key} value={values[key]} onChange={e => set(key, e.target.value)} {...props} />
    </div>
  );

  return (
    <Modal className="adm-drawer booking" labelledBy="adm-booking-title" onClose={close}>
      <form className="adm-drawer-inner" onSubmit={submit}>
        <header className="adm-drawer-head">
          <h2 id="adm-booking-title">{t("admin.newBooking")}</h2>
          <button type="button" className="adm-icon-btn" onClick={close} aria-label={t("admin.close")}>
            <Icon name="close" />
          </button>
        </header>

        <div className="adm-drawer-body">
          <section className="adm-booking-summary" aria-label={t("admin.summary")} aria-live="polite">
            <p className="what">
              {event && <Icon name="banquet" size={16} />}
              <strong>{typeName}</strong>
              {room && roomsCount > 1 && <span className="qty">× {roomsCount}</span>}
            </p>
            <p className="when">
              {room ? (
                <>
                  {day(values.checkin)} <Icon name="right" size={14} /> {day(values.checkout)}
                  {nights > 0 && <span className="nights">{counted(t, "admin.nights", nights)}</span>}
                </>
              ) : (
                day(values.checkin)
              )}
            </p>
            <p className="meta">
              <span>
                <Icon name="guests" size={15} />
                {counted(t, "admin.guestsCount", clampCount(values.guests, guestMin, guestMax))}
              </span>
              <StatusBadge status={values.bookingStatus} label={t("admin.status." + values.bookingStatus)} />
            </p>
          </section>

          {error && (
            <p className="adm-alert adm-form-error" role="alert">
              {error}
            </p>
          )}

          <fieldset className="adm-fieldset">
            <legend>{t("admin.f.type")}</legend>
            {visibleRooms.length > 0 && (
              <div className="adm-type-group" role="radiogroup" aria-label={t("admin.opt.rooms")}>
                <p className="adm-type-label">{t("admin.opt.rooms")}</p>
                <div className="adm-type-cards">
                  {visibleRooms.map(r => card(roomValue(r), r.name, r.rate || undefined))}
                </div>
              </div>
            )}
            <div className="adm-type-group" role="radiogroup" aria-label={t("admin.opt.events")}>
              <p className="adm-type-label">{t("admin.opt.events")}</p>
              <div className="adm-type-cards">
                {card(HALL, t("admin.opt.hall"))}
                {activePackages.map(p => card(PACKAGE_PREFIX + p.name, p.name, p.capacity || p.price || undefined))}
                {card(DINING, t("admin.opt.dining"))}
              </div>
            </div>
          </fieldset>

          <fieldset className="adm-fieldset">
            <legend>{t("admin.g.when")}</legend>
            <div className="adm-form">
              {input("checkin", room ? t("admin.checkin") : t("admin.date"), {
                type: "date",
                min: today,
                required: true,
                onChange: e => setCheckin(e.target.value),
              })}
              {room &&
                input("checkout", t("admin.checkout"), {
                  type: "date",
                  min: addDays(values.checkin || today, 1),
                  required: true,
                })}
              {room && (
                <Stepper
                  id="bk-roomsRequested"
                  label={t("admin.f.rooms")}
                  value={values.roomsRequested}
                  min={LIMITS.rooms[0]}
                  max={LIMITS.rooms[1]}
                  onChange={v => set("roomsRequested", v)}
                />
              )}
              <Stepper
                id="bk-guests"
                label={t("admin.guests")}
                value={values.guests}
                min={guestMin}
                max={guestMax}
                onChange={v => set("guests", v)}
              />
            </div>
          </fieldset>

          <fieldset className="adm-fieldset">
            <legend>{t("admin.g.guest")}</legend>
            <div className="adm-form">
              {input(
                "name",
                t("admin.f.guestName"),
                { required: true, maxLength: 100, autoComplete: "off", placeholder: t("admin.ph.guestName") },
                true,
              )}
              {input("mobile", t("admin.f.phone"), {
                type: "tel",
                required: true,
                maxLength: 25,
                placeholder: "+91 98765 43210",
              })}
              {input("email", t("admin.email"), { type: "email", maxLength: 150, placeholder: "guest@example.com" })}
              {input("city", t("admin.f.city"), { maxLength: 100, placeholder: t("admin.ph.city") }, true)}
              <div className="adm-field full">
                <label htmlFor="bk-notes">{t("admin.specialRequests")}</label>
                <textarea
                  id="bk-notes"
                  rows={2}
                  maxLength={500}
                  placeholder={t("admin.ph.notes")}
                  value={values.specialRequests}
                  onChange={e => set("specialRequests", e.target.value)}
                />
              </div>
              {codedOffers.length > 0 && (
                <div className="adm-field full">
                  <label htmlFor="bk-offer">{t("admin.offerCode")}</label>
                  <select
                    id="bk-offer"
                    aria-describedby="bk-offer-hint"
                    value={values.couponCode}
                    onChange={e => set("couponCode", e.target.value)}
                  >
                    <option value="">{t("admin.noOffer")}</option>
                    {codedOffers.map(o => (
                      <option key={o.id} value={o.code}>
                        {[o.code, o.title, o.discount].filter(Boolean).join(" · ")}
                      </option>
                    ))}
                  </select>
                  <p id="bk-offer-hint" className="adm-hint">
                    {t("admin.h.offerCode")}
                  </p>
                </div>
              )}
            </div>
          </fieldset>

          <fieldset className="adm-fieldset">
            <legend>{t("admin.status")}</legend>
            <div className="adm-segmented" role="radiogroup" aria-label={t("admin.status")}>
              {(["confirmed", "pending"] as const).map(s => (
                <label key={s}>
                  <input
                    type="radio"
                    name="bk-status"
                    value={s}
                    checked={values.bookingStatus === s}
                    onChange={() => set("bookingStatus", s)}
                  />
                  <span>{t("admin.status." + s)}</span>
                </label>
              ))}
            </div>
            <p className="adm-hint">{t("admin.h.staffStatus")}</p>
            <p className="adm-hint">{t("admin.h.noNotify")}</p>
          </fieldset>
        </div>

        <footer className="adm-drawer-foot">
          <span />
          <button className="adm-btn" type="button" onClick={close} disabled={busy}>
            {t("admin.cancel")}
          </button>
          <button className="adm-btn primary" type="submit" disabled={busy}>
            {busy ? t("admin.saving") : t("admin.addBooking")}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
