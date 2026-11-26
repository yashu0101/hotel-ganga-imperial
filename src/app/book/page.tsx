"use client";
import { useCallback, useEffect, useState, useSyncExternalStore, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import RequestReceipt, {
  CHOICE_LABEL,
  WHEN_LABEL,
  nightsBetween,
  whenText,
  type ReceiptDetails,
  type RequestKind as Kind,
} from "@/components/RequestReceipt";
import ThemeToggle from "@/components/ThemeToggle";
import ContactActions from "@/components/ContactActions";
import { PHOTOS, SITE_CONFIG } from "@/lib/config";
import { roomPhoto } from "@/lib/hotel-content";
import { hotelToday, dateError, nightlyRate, phoneError, PHONE_MAX_LENGTH } from "@/lib/reservation";
import type { Room, BanquetPackage } from "@/lib/types";

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "room", label: "A room", hint: "Stay one night or more" },
  { value: "banquet", label: "A celebration", hint: "Weddings, parties and gatherings" },
  { value: "dining", label: "Dining", hint: "A table or a group meal" },
];
const KIND_PHOTO = { banquet: PHOTOS.banquet, dining: PHOTOS.lounge } satisfies Record<Exclude<Kind, "room">, unknown>;
const CONTACT_MESSAGE = "Hello, I would like to ask about a reservation at Hotel Ganga Imperial.";
const SPECIAL_REQUESTS_MAX = 500;
const inr = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

type Selection = { type: Kind; choice: string };
const defaultChoice = (type: Kind, rooms: Room[]) =>
  type === "room" ? rooms[0]?.name || "" : type === "banquet" ? "Banquet hall" : "Dining enquiry";
/** Falls back to the default choice when the wanted one is not (or no longer) on offer. */
function keepValid(wanted: Selection, rooms: Room[], packages: BanquetPackage[]): Selection {
  const options =
    wanted.type === "room"
      ? rooms.map(r => r.name)
      : wanted.type === "banquet"
        ? ["Banquet hall", ...packages.map(p => "Banquet - " + p.name)]
        : ["Dining enquiry"];
  return options.includes(wanted.choice) ? wanted : { type: wanted.type, choice: defaultChoice(wanted.type, rooms) };
}
/** What a link such as /book?type=banquet&package=… or /book?offer=… asks for. */
function parseLink(search: string) {
  const q = new URLSearchParams(search);
  const linked = q.get("type");
  const type: Kind = linked === "banquet" || linked === "dining" ? linked : "room";
  const choice = (type === "room" ? q.get("room") : type === "banquet" ? q.get("package") : "") || "";
  return { type, choice, offer: (q.get("offer") || "").trim().slice(0, 120) };
}
// The query string, read without an effect. It is "" in the static HTML and during hydration.
const subscribeToNothing = () => () => {};
const useSearch = () =>
  useSyncExternalStore(
    subscribeToNothing,
    () => window.location.search,
    () => "",
  );

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
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  // What the guest is typing. Only whole numbers inside the range reach the form (and the estimate).
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const typed = draft === null ? value : Number(draft);
  const outOfRange = draft !== null && (draft === "" || !Number.isInteger(typed) || typed < min || typed > max);
  const step = (by: number) => {
    setDraft(null);
    const next = clamp(value + by);
    if (next !== value) onChange(next);
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="stepper">
        {/* aria-disabled rather than disabled, so keyboard focus stays on the button at the limit. */}
        <button type="button" aria-label={"Fewer: " + label} aria-disabled={value <= min} onClick={() => step(-1)}>
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          required
          aria-invalid={outOfRange || undefined}
          aria-describedby={outOfRange ? id + "-error" : undefined}
          value={draft ?? String(value)}
          onChange={e => {
            const text = e.target.value;
            const n = Number(text);
            setDraft(text);
            if (text !== "" && Number.isInteger(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={() => {
            if (draft === null) return;
            const n = Number(draft);
            if (draft !== "" && Number.isFinite(n)) onChange(clamp(Math.round(n)));
            setDraft(null);
          }}
        />
        <button type="button" aria-label={"More: " + label} aria-disabled={value >= max} onClick={() => step(1)}>
          +
        </button>
      </div>
      {outOfRange && (
        <small id={id + "-error"} className="field-error">
          Enter a whole number from {min} to {max}.
        </small>
      )}
    </div>
  );
}

export default function BookPage() {
  const [rooms, setRooms] = useState<Room[]>(SITE_CONFIG.rooms);
  const [packages, setPackages] = useState<BanquetPackage[]>([]);
  // The link only provides defaults. Anything the guest picks is kept in state and always wins,
  // including when the room and package lists finish loading.
  const link = parseLink(useSearch());
  const [picked, setPicked] = useState<Selection | null>(null);
  const { type, choice } = keepValid(
    picked ?? { type: link.type, choice: link.choice || defaultChoice(link.type, rooms) },
    rooms,
    packages,
  );
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guestsPicked, setGuests] = useState<number | null>(null);
  const guests = guestsPicked ?? (type === "banquet" ? 50 : 2);
  const [roomsRequested, setRoomsRequested] = useState(1);
  const [notePicked, setSpecialRequests] = useState<string | null>(null);
  const specialRequests = notePicked ?? (link.offer ? "I would like to ask about the offer: " + link.offer : "");
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dateProblem, setDateProblem] = useState("");
  const [phoneProblem, setPhoneProblem] = useState("");
  const [sendFailed, setSendFailed] = useState(false);
  const [reference, setReference] = useState("");
  const [options, setOptions] = useState<"loading" | "ready" | "failed">("loading");

  const loadOptions = useCallback(() => {
    const json = (r: Response) => {
      if (!r.ok) throw Error();
      return r.json();
    };
    Promise.all([fetch("/api/rooms").then(json), fetch("/api/banquet").then(json)])
      .then(([rs, ps]) => {
        setRooms((rs as Room[]).filter(r => !r.hidden));
        setPackages((ps as BanquetPackage[]).filter(p => p.active));
        setOptions("ready");
      })
      .catch(() => setOptions("failed"));
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const room = type === "room" ? rooms.find(r => r.name === choice) : undefined;
  const nightly = room ? nightlyRate(room.rate) || 0 : 0;
  const nights = nightsBetween(checkin, checkout);
  const photo = room
    ? { src: roomPhoto(room), alt: room.name, sample: room.sample }
    : type === "room"
      ? null
      : { src: KIND_PHOTO[type].src, alt: KIND_PHOTO[type].caption, sample: KIND_PHOTO[type].sample };
  const choiceLabel = type === "dining" ? "Dining at the hotel" : choice.replace(/^Banquet - /, "");
  const dateText = !checkin
    ? "Choose your dates"
    : whenText(type, checkin, checkout) + (type === "room" && !checkout ? ", check-out to choose" : "");
  const specialLeft = SPECIAL_REQUESTS_MAX - specialRequests.length;

  function choose(next: string) {
    setPicked({ type, choice: next });
  }
  function switchType(value: Kind) {
    setPicked({ type: value, choice: defaultChoice(value, rooms) });
    setGuests(value === "banquet" ? 50 : 2);
    setError("");
    setDateProblem("");
  }
  function changeDates(nextIn: string, nextOut: string) {
    setCheckin(nextIn);
    setCheckout(nextOut);
    // Once an error is showing, re-check as the guest edits so it disappears as soon as the dates are fixed.
    if (dateProblem) setDateProblem(dateError(nextIn, nextOut, type === "room"));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSendFailed(false);
    const values = new FormData(e.currentTarget);
    const mobile = String(values.get("mobile") || "");
    const dates = dateError(checkin, checkout, type === "room");
    const phone = phoneError(mobile);
    setDateProblem(dates);
    setPhoneProblem(phone);
    if (dates || phone) {
      // Focus the first field that needs attention, in reading order.
      const target = dates ? (dateError(checkin, "", false) ? "arrival" : "departure") : "mobile";
      document.getElementById(target)?.focus();
      return;
    }
    setBusy(true);
    try {
      const note = specialRequests.trim().slice(0, SPECIAL_REQUESTS_MAX);
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          mobile,
          email: values.get("email"),
          roomType: choice,
          checkin,
          checkout,
          guests,
          roomsRequested: type === "room" ? roomsRequested : 0,
          specialRequests: note,
          website: values.get("website"),
          couponCode: String(values.get("couponCode") || "").trim(),
        }),
      }).catch(() => null);
      if (!res) {
        setSendFailed(true);
        throw Error("We could not reach the hotel website. Check your connection and try again.");
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Validation problems are fixable in the form; anything else gets a direct-contact fallback.
        setSendFailed(res.status !== 400);
        throw Error(data.error || "Please try again.");
      }
      setReceipt({
        kind: type,
        name: String(values.get("name") || ""),
        preference: choiceLabel,
        checkin,
        checkout,
        guests,
        rooms: type === "room" ? roomsRequested : 0,
        specialRequests: note,
        coupon: data.coupon
          ? `${data.coupon.code} — ${data.coupon.title}${data.coupon.percent ? ` (${data.coupon.percent}% off)` : ""}, applied when the hotel confirms your rate`
          : "",
      });
      setReference(data.reference);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="reservation-page">
      <header className="reservation-header">
        <div className="booking-header-start">
          <Link className="booking-back" href="/">
            <span aria-hidden="true">←</span> Back to hotel
          </Link>
          <Link className="wordmark" href="/">
            <small>Hotel</small>Ganga Imperial
          </Link>
        </div>
        <ThemeToggle />
      </header>
      {reference && receipt ? (
        <main className="reservation-done">
          <h1>Thank you. We have your request.</h1>
          <RequestReceipt reference={reference} details={receipt} />
        </main>
      ) : (
        <main className="reservation-layout">
          <section className="reservation-form" aria-labelledby="book-title">
            <h1 id="book-title">
              {type === "banquet"
                ? "Plan your celebration"
                : type === "dining"
                  ? "Plan a meal with us"
                  : "Plan your stay"}
            </h1>
            <p className="reservation-intro">
              Tell us what you have in mind and the hotel will reply to confirm availability and the final price.
              Nothing is charged here.
            </p>
            <div className="reservation-kinds" role="group" aria-label="What would you like to plan?">
              {KINDS.map(k => (
                <button key={k.value} type="button" aria-pressed={type === k.value} onClick={() => switchType(k.value)}>
                  <strong>{k.label}</strong>
                  <span>{k.hint}</span>
                </button>
              ))}
            </div>
            <form id="booking-form" onSubmit={submit}>
              {/* Spam trap: hidden from guests and screen readers; only bots fill it in. */}
              <div className="form-trap" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <fieldset>
                <legend>
                  <span aria-hidden="true">1</span> {type === "room" ? "Your stay" : "Your plans"}
                </legend>
                <div className="date-range">
                  <div className="field">
                    <label htmlFor="arrival">{type === "room" ? "Check-in" : "Event date"}</label>
                    <input
                      id="arrival"
                      type="date"
                      min={hotelToday()}
                      required
                      aria-invalid={Boolean(dateProblem) || undefined}
                      aria-describedby={dateProblem ? "date-error" : undefined}
                      value={checkin}
                      onChange={e => changeDates(e.target.value, checkout)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="departure">{type === "room" ? "Check-out" : "End date (optional)"}</label>
                    <input
                      id="departure"
                      type="date"
                      min={checkin || hotelToday()}
                      required={type === "room"}
                      aria-invalid={Boolean(dateProblem) || undefined}
                      aria-describedby={dateProblem ? "date-error" : undefined}
                      value={checkout}
                      onChange={e => changeDates(checkin, e.target.value)}
                    />
                  </div>
                </div>
                {dateProblem && (
                  <p id="date-error" className="field-error date-error" role="alert">
                    {dateProblem}
                  </p>
                )}

                {type === "room" && (
                  <div className="choice-group" role="radiogroup" aria-labelledby="room-choice-label">
                    <p id="room-choice-label" className="choice-label">
                      Room preference
                    </p>
                    <div className="room-choices">
                      {rooms.map(r => (
                        <label key={r.id || r.name} className="room-choice">
                          <input
                            type="radio"
                            name="roomChoice"
                            value={r.name}
                            checked={choice === r.name}
                            onChange={() => choose(r.name)}
                            required
                          />
                          <Image src={r.image} alt="" width={96} height={96} sizes="72px" />
                          <span>
                            <strong>{r.name}</strong>
                            <small>{r.rate}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {type === "banquet" && (
                  <div className="choice-group" role="radiogroup" aria-labelledby="package-choice-label">
                    <p id="package-choice-label" className="choice-label">
                      Package preference
                    </p>
                    <div className="package-choices">
                      {[{ value: "Banquet hall", name: "Not sure yet", detail: "Talk through options with the hotel" }]
                        .concat(
                          packages.map(p => ({
                            value: "Banquet - " + p.name,
                            name: p.name,
                            detail: [p.capacity, p.price].filter(Boolean).join(", "),
                          })),
                        )
                        .map(p => (
                          <label key={p.value} className="package-choice">
                            <input
                              type="radio"
                              name="packageChoice"
                              value={p.value}
                              checked={choice === p.value}
                              onChange={() => choose(p.value)}
                            />
                            <span>
                              <strong>{p.name}</strong>
                              {p.detail && <small>{p.detail}</small>}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                <div className="reservation-fields">
                  {type === "room" && (
                    <Stepper
                      id="rooms-requested"
                      label="Rooms"
                      value={roomsRequested}
                      min={1}
                      max={10}
                      onChange={setRoomsRequested}
                    />
                  )}
                  <Stepper
                    id="guests"
                    label="Guests in your party"
                    value={guests}
                    min={1}
                    max={type === "banquet" ? 300 : 20}
                    onChange={setGuests}
                  />
                </div>
              </fieldset>

              <fieldset>
                <legend>
                  <span aria-hidden="true">2</span> How can we reach you?
                </legend>
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input id="name" name="name" autoComplete="name" maxLength={100} required />
                </div>
                <div className="reservation-fields">
                  <div className="field">
                    <label htmlFor="mobile">Phone number</label>
                    <input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={PHONE_MAX_LENGTH}
                      required
                      aria-invalid={Boolean(phoneProblem) || undefined}
                      aria-describedby={phoneProblem ? "mobile-error mobile-help" : "mobile-help"}
                      placeholder="+91 98765 43210"
                      onChange={e => phoneProblem && setPhoneProblem(phoneError(e.target.value))}
                    />
                    {phoneProblem && (
                      <small id="mobile-error" className="field-error" role="alert">
                        {phoneProblem}
                      </small>
                    )}
                    <small id="mobile-help">Include your country code. The hotel may call or WhatsApp you.</small>
                  </div>
                  <div className="field">
                    <label htmlFor="email">
                      Email <span className="optional">optional</span>
                    </label>
                    <input id="email" name="email" type="email" autoComplete="email" maxLength={150} />
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>
                  <span aria-hidden="true">3</span> Anything we should know?
                </legend>
                <div className="field">
                  <label htmlFor="special-requests">
                    Special requests <span className="optional">optional</span>
                  </label>
                  <textarea
                    id="special-requests"
                    name="specialRequests"
                    rows={4}
                    maxLength={SPECIAL_REQUESTS_MAX}
                    aria-describedby="special-requests-help special-requests-count"
                    value={specialRequests}
                    onChange={e => setSpecialRequests(e.target.value)}
                    placeholder={
                      type === "room"
                        ? "Early arrival, a quiet room, an extra bed or accessibility needs"
                        : type === "banquet"
                          ? "The occasion, seating, décor or dietary needs"
                          : "The occasion, seating or dietary needs"
                    }
                  />
                  <div className="field-meta">
                    <small id="special-requests-help">Please do not include card or ID details.</small>
                    <small id="special-requests-count" className={specialLeft <= 50 ? "is-near-limit" : undefined}>
                      {specialRequests.length} / {SPECIAL_REQUESTS_MAX}
                    </small>
                  </div>
                  {/* Announced only near the limit, so screen readers are not interrupted on every keystroke. */}
                  <p className="sr-only" aria-live="polite">
                    {specialLeft <= 50 ? `${specialLeft} characters left.` : ""}
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="coupon-code">
                    Offer code <span className="optional">optional</span>
                  </label>
                  <input
                    id="coupon-code"
                    name="couponCode"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={30}
                    aria-describedby="coupon-code-help"
                    style={{ textTransform: "uppercase" }}
                  />
                  <div className="field-meta">
                    <small id="coupon-code-help">
                      Checked when you send your request. The discount applies to the rate the hotel confirms.
                    </small>
                  </div>
                </div>
              </fieldset>
            </form>
          </section>

          <aside className="booking-slip" aria-label="Your request">
            {photo && (
              <figure className="slip-photo" key={photo.src}>
                <Image src={photo.src} alt={photo.alt} fill sizes="(max-width:900px) 100vw, 420px" loading="eager" />
                {photo.sample && <figcaption>Representative photo</figcaption>}
              </figure>
            )}
            <div className="slip-body">
              <h2>Your request</h2>
              <dl className="slip-lines" aria-live="polite">
                <div>
                  <dt>{CHOICE_LABEL[type]}</dt>
                  <dd>{choiceLabel || "Choose a room"}</dd>
                </div>
                <div>
                  <dt>{WHEN_LABEL[type]}</dt>
                  <dd className={checkin ? undefined : "is-empty"}>
                    {dateText}
                    {type === "room" && nights > 0 && (
                      <small>
                        {nights} night{nights === 1 ? "" : "s"}
                      </small>
                    )}
                  </dd>
                </div>
                {type === "room" && (
                  <div>
                    <dt>Rooms</dt>
                    <dd>{roomsRequested}</dd>
                  </div>
                )}
                <div>
                  <dt>Guests</dt>
                  <dd>{guests}</dd>
                </div>
              </dl>
              {type === "room" && nightly > 0 && (
                <div className="slip-estimate">
                  <span>
                    {nights > 0
                      ? inr(nightly) + " × " + roomsRequested + " × " + nights + " night" + (nights === 1 ? "" : "s")
                      : "From, per room per night"}
                  </span>
                  <strong>{inr(nightly * roomsRequested * (nights > 0 ? nights : 1))}</strong>
                  <small>Indicative, before taxes. The hotel confirms the final rate.</small>
                </div>
              )}
              <ul className="slip-promises">
                <li>No payment is taken on this website</li>
                <li>The hotel confirms availability with you</li>
                <li>Price and terms are agreed before you book</li>
              </ul>
              {error && (
                <div className="reservation-error" role="alert">
                  <p>{error}</p>
                  {sendFailed && (
                    <>
                      <p>You can also reach the hotel directly:</p>
                      <ContactActions message="Hello, I tried to send a reservation request on your website." />
                    </>
                  )}
                </div>
              )}
              {options === "failed" && (
                <div id="submit-status" className="reservation-error" role="alert">
                  <p>The latest room and package options could not be loaded, so the request cannot be sent yet.</p>
                  <p>
                    <button
                      type="button"
                      onClick={() => {
                        setOptions("loading");
                        loadOptions();
                      }}
                    >
                      Try again
                    </button>{" "}
                    or reach the hotel directly:
                  </p>
                  <ContactActions message={CONTACT_MESSAGE} />
                </div>
              )}
              <button
                className="btn btn-solid request-submit"
                form="booking-form"
                disabled={busy || options !== "ready"}
                aria-describedby={options === "ready" ? undefined : "submit-status"}
                type="submit"
              >
                {busy
                  ? "Sending your request…"
                  : options === "loading"
                    ? "Loading options…"
                    : "Send reservation request"}
              </button>
              {options === "loading" && (
                <p id="submit-status" className="small-note">
                  Getting the latest room and package options. This only takes a moment.
                </p>
              )}
              <p className="small-note">
                We use your details only to reply to this request. See <Link href="/privacy">privacy</Link> and the{" "}
                <Link href="/guest-information">guest policies</Link>.
              </p>
            </div>
            <div className="slip-talk">
              <h3>Prefer to talk?</h3>
              <p>Call or message the hotel with your dates.</p>
              <ContactActions message={CONTACT_MESSAGE} />
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}
