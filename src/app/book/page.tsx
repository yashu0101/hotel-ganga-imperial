"use client";

import { useState, useEffect, FormEvent } from "react";
import { SITE_CONFIG } from "@/lib/config";
import { useApp } from "@/lib/context";

interface RoomOption { name: string; rate: string; hidden?: boolean; }
interface BanquetOption { id: string; name: string; price: string; active: boolean; }

export default function BookPage() {
  const { t, lang, setLang, theme, setTheme } = useApp();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rooms, setRooms] = useState<RoomOption[]>(SITE_CONFIG.rooms);
  const [banquetPkgs, setBanquetPkgs] = useState<BanquetOption[]>([]);
  const [bookingType, setBookingType] = useState<"room" | "banquet">("room");
  const [lastBooking, setLastBooking] = useState<{ name: string; roomType: string; checkin: string; checkout: string; guests: number; id: string } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch("/api/rooms").then(r => r.json()).then((data: RoomOption[]) => {
      const visible = data.filter(r => !r.hidden);
      if (visible.length > 0) setRooms(visible);
    }).catch(() => {});
    fetch("/api/banquet").then(r => r.json()).then((data: BanquetOption[]) => {
      setBanquetPkgs(data.filter(p => p.active));
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const errs: Record<string, string> = {};
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const mobile = (form.elements.namedItem("mobile") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const city = (form.elements.namedItem("city") as HTMLInputElement).value.trim();
    const country = (form.elements.namedItem("country") as HTMLInputElement).value.trim();
    const gender = (form.elements.namedItem("gender") as HTMLSelectElement).value;
    const roomType = (form.elements.namedItem("roomType") as HTMLSelectElement).value;
    const checkin = (form.elements.namedItem("checkin") as HTMLInputElement).value;
    const checkout = (form.elements.namedItem("checkout") as HTMLInputElement).value;
    const guests = (form.elements.namedItem("guests") as HTMLInputElement).value;

    if (!name) errs.name = "Required";
    if (!mobile || mobile.replace(/[^\d]/g, "").length < 10) errs.mobile = "Valid mobile required";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Valid email required";
    if (!city) errs.city = "Required";
    if (!country) errs.country = "Required";
    if (!checkin) errs.checkin = "Required";
    else if (checkin < today) errs.checkin = "Cannot select a past date";
    if (checkout && checkin && checkout <= checkin) errs.checkout = "Must be after check-in date";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mobile, email, city, country, gender, roomType, checkin, checkout, guests: Number(guests) }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(`Booking received! ID: ${data.booking.id.slice(0, 8).toUpperCase()}`);
        setLastBooking({ name, roomType, checkin, checkout, guests: Number(guests), id: data.booking.id });
        form.reset();
      } else { setStatus("error"); setMessage(data.error); }
    } catch { setStatus("error"); setMessage("Failed. Please try again."); }
  };

  return (
    <div className="book-page">
      <style>{`
        .book-page{min-height:100vh;background:var(--bg);color:var(--text);font-family:"Mulish",system-ui,sans-serif}
        .book-header{background:rgba(18,24,39,.95);border-bottom:1px solid rgba(201,161,91,.25);padding:16px 32px;display:flex;align-items:center;justify-content:space-between}
        .book-header a{font-family:"Marcellus",Georgia,serif;color:#C9A15B;text-decoration:none;font-size:1.1rem;letter-spacing:.14em}
        .book-header .right{display:flex;gap:12px;align-items:center}
        .book-header .back{color:#ADA394;font-family:"Mulish",sans-serif;font-size:.9rem;letter-spacing:0}
        .ctrl{background:none;border:1px solid #323A50;color:#ADA394;padding:4px 10px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:.85rem}
        .ctrl:hover{border-color:#C9A15B;color:#C9A15B}
        .book-body{max-width:640px;margin:0 auto;padding:48px 32px}
        .book-body h1{font-family:"Marcellus",Georgia,serif;font-weight:400;font-size:2rem;color:var(--accent);margin:0 0 8px}
        .book-body .sub{color:var(--muted);margin-bottom:32px}
        .field{margin-bottom:18px}
        .field label{display:block;color:var(--muted);font-size:.85rem;margin-bottom:5px}
        .field input,.field select{width:100%;padding:12px 16px;background:var(--surface);border:1px solid var(--line);border-radius:6px;color:var(--text);font:inherit;font-size:.95rem;box-sizing:border-box}
        .field input:focus,.field select:focus{outline:none;border-color:#C9A15B}
        .field .err{color:#E88;font-size:.8rem;margin-top:4px}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .submit-btn{width:100%;padding:14px;background:#C9A15B;color:#121827;border:none;border-radius:6px;font:inherit;font-size:1rem;font-weight:600;cursor:pointer;margin-top:8px}
        .submit-btn:hover{background:#E2C68E}
        .submit-btn:disabled{opacity:.6;cursor:not-allowed}
        .msg{padding:14px;border-radius:6px;margin-bottom:20px;font-size:.9rem}
        .msg.success{background:rgba(91,201,107,.15);border:1px solid rgba(91,201,107,.4);color:#7ddf8a}
        .msg.error{background:rgba(201,91,91,.15);border:1px solid rgba(201,91,91,.4);color:#E88}
        .type-toggle{display:flex;gap:0;margin-bottom:24px;border:1px solid var(--line);border-radius:6px;overflow:hidden}
        .type-toggle button{flex:1;padding:12px;background:var(--surface);color:var(--muted);border:none;font:inherit;font-size:.9rem;cursor:pointer;transition:all .2s}
        .type-toggle button.active{background:#C9A15B;color:#121827;font-weight:600}
        @media(max-width:500px){.field-row{grid-template-columns:1fr}.book-body{padding:32px 16px}}
      `}</style>

      <div className="book-header">
        <a href="/">Hotel Ganga Imperial</a>
        <div className="right">
          <button className="ctrl" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀" : "☾"}</button>
          <button className="ctrl" onClick={() => setLang(lang === "en" ? "hi" : "en")}>{lang === "en" ? "हि" : "EN"}</button>
          <a href="/" className="back">{t("book.back")}</a>
        </div>
      </div>

      <div className="book-body">
        <h1>{t("book.title")}</h1>
        <p className="sub">{t("book.subtitle")}</p>

        {message && <div className={`msg ${status === "success" ? "success" : "error"}`}>{message}</div>}

        {status !== "success" && (
          <>
            <div className="type-toggle">
              <button className={bookingType === "room" ? "active" : ""} onClick={() => setBookingType("room")}>{t("book.roomBooking")}</button>
              <button className={bookingType === "banquet" ? "active" : ""} onClick={() => setBookingType("banquet")}>{t("book.banquetBooking")}</button>
            </div>
            <form onSubmit={handleSubmit}>
              <input type="hidden" name="bookingType" value={bookingType} />
              <div className="field"><label>{t("book.name")} *</label><input name="name" autoComplete="name" required />{errors.name && <div className="err">{errors.name}</div>}</div>
              <div className="field-row">
                <div className="field"><label>{t("book.mobile")} *</label><input name="mobile" type="tel" autoComplete="tel" inputMode="tel" required />{errors.mobile && <div className="err">{errors.mobile}</div>}</div>
                <div className="field"><label>{t("book.email")} *</label><input name="email" type="email" autoComplete="email" required />{errors.email && <div className="err">{errors.email}</div>}</div>
              </div>
              <div className="field-row">
                <div className="field"><label>{t("book.city")} *</label><input name="city" autoComplete="address-level2" required />{errors.city && <div className="err">{errors.city}</div>}</div>
                <div className="field"><label>{t("book.country")} *</label><input name="country" autoComplete="country-name" defaultValue="India" required />{errors.country && <div className="err">{errors.country}</div>}</div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>{t("book.gender")} *</label>
                  <select name="gender" required>
                    <option value="male">{t("book.male")}</option>
                    <option value="female">{t("book.female")}</option>
                    <option value="other">{t("book.other")}</option>
                  </select>
                </div>
                {bookingType === "room" ? (
                  <div className="field"><label>{t("book.roomType")} *</label><select name="roomType" required>{rooms.map((r) => <option key={r.name} value={r.name}>{r.name} {r.rate ? `— ${r.rate}` : ""}</option>)}</select></div>
                ) : (
                  <div className="field"><label>{t("book.banquetPackage")} *</label><select name="roomType" required>{banquetPkgs.map((p) => <option key={p.id} value={`Banquet - ${p.name}`}>{p.name} {p.price ? `— ${p.price}` : ""}</option>)}{banquetPkgs.length === 0 && <option value="Banquet hall">Banquet Hall</option>}</select></div>
                )}
              </div>
              <div className="field-row">
                <div className="field"><label>{bookingType === "banquet" ? t("book.eventDate") : t("book.checkin")} *</label><input name="checkin" type="date" min={today} required />{errors.checkin && <div className="err">{errors.checkin}</div>}</div>
                <div className="field"><label>{bookingType === "banquet" ? t("book.eventEndDate") : t("book.checkout")}</label><input name="checkout" type="date" min={today} />{errors.checkout && <div className="err">{errors.checkout}</div>}</div>
              </div>
              <div className="field"><label>{t("book.guests")}</label><input name="guests" type="number" min={1} max={bookingType === "banquet" ? 500 : 20} defaultValue={bookingType === "banquet" ? 50 : 2} /></div>
              <button className="submit-btn" type="submit" disabled={status === "loading"}>{status === "loading" ? t("book.submitting") : t("book.submit")}</button>
            </form>
          </>
        )}
        {status === "success" && (
          <div style={{ textAlign: "center", marginTop: 32 }}>
            {lastBooking && (
              <a
                href={`https://wa.me/919876543210?text=${encodeURIComponent(
                  `Hi, I just booked at Hotel Ganga Imperial!\n\nBooking ID: ${lastBooking.id.slice(0, 8).toUpperCase()}\nName: ${lastBooking.name}\nRoom/Package: ${lastBooking.roomType}\nCheck-in: ${lastBooking.checkin}${lastBooking.checkout ? `\nCheck-out: ${lastBooking.checkout}` : ""}\nGuests: ${lastBooking.guests}\n\nPlease confirm my booking. Thank you!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="submit-btn"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, maxWidth: 340, textDecoration: "none", marginBottom: 16, background: "#25D366", color: "#fff" }}
              >
                {t("book.whatsapp")}
              </a>
            )}
            <button className="submit-btn" onClick={() => { setStatus("idle"); setMessage(""); setLastBooking(null); }} style={{ maxWidth: 300 }}>{t("book.another")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
