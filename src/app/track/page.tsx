"use client";

import { useState, FormEvent } from "react";
import { useApp } from "@/lib/context";

interface BookingInfo {
  id: string;
  name: string;
  roomType: string;
  checkin: string;
  checkout: string;
  guests: number;
  amount: number;
  bookingStatus: string;
  paymentStatus: string;
  createdAt: string;
}

export default function TrackPage() {
  const { t, lang, setLang, theme, setTheme } = useApp();
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setBooking(null);
    const form = e.currentTarget;
    const bookingId = (form.elements.namedItem("bookingId") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();

    if (!bookingId || !email) { setError("Both fields are required."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, email }),
      });
      const data = await res.json();
      if (res.ok) {
        setBooking(data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const statusColor = (s: string) => {
    if (s === "confirmed" || s === "paid") return "#7ddf8a";
    if (s === "checked-in") return "#7ddfa8";
    if (s === "cancelled" || s === "failed") return "#888";
    return "#E2C68E";
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
        .track-body{max-width:560px;margin:0 auto;padding:48px 32px}
        .track-body h1{font-family:"Marcellus",Georgia,serif;font-weight:400;font-size:2rem;color:var(--accent);margin:0 0 8px}
        .track-body .sub{color:var(--muted);margin-bottom:32px}
        .field{margin-bottom:18px}
        .field label{display:block;color:var(--muted);font-size:.85rem;margin-bottom:5px}
        .field input{width:100%;padding:12px 16px;background:var(--surface);border:1px solid var(--line);border-radius:6px;color:var(--text);font:inherit;font-size:.95rem;box-sizing:border-box}
        .field input:focus{outline:none;border-color:#C9A15B}
        .submit-btn{width:100%;padding:14px;background:#C9A15B;color:#121827;border:none;border-radius:6px;font:inherit;font-size:1rem;font-weight:600;cursor:pointer;margin-top:8px}
        .submit-btn:hover{background:#E2C68E}
        .submit-btn:disabled{opacity:.6;cursor:not-allowed}
        .msg-err{padding:14px;border-radius:6px;margin-bottom:20px;font-size:.9rem;background:rgba(201,91,91,.15);border:1px solid rgba(201,91,91,.4);color:#E88}
        .result-card{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:28px;margin-top:24px}
        .result-card h3{font-family:"Marcellus",Georgia,serif;font-weight:400;color:var(--accent);margin:0 0 20px;font-size:1.2rem}
        .result-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line);font-size:.9rem}
        .result-row:last-child{border-bottom:none}
        .result-label{color:var(--muted)}
        .result-value{font-weight:600;text-align:right}
        .status-badge{display:inline-block;padding:3px 12px;border-radius:12px;font-size:.8rem;font-weight:600;text-transform:capitalize}
        .invoice-link{display:block;text-align:center;margin-top:20px;color:var(--accent);font-weight:600;text-decoration:none;font-size:.9rem}
        .invoice-link:hover{text-decoration:underline}
        @media(max-width:500px){.track-body{padding:32px 16px}}
      `}</style>

      <div className="book-header">
        <a href="/">Hotel Ganga Imperial</a>
        <div className="right">
          <button className="ctrl" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "\u2600" : "\u263E"}</button>
          <button className="ctrl" onClick={() => setLang(lang === "en" ? "hi" : "en")}>{lang === "en" ? "\u0939\u093F" : "EN"}</button>
          <a href="/" className="back">{t("book.back")}</a>
        </div>
      </div>

      <div className="track-body">
        <h1>{t("track.title")}</h1>
        <p className="sub">{t("track.subtitle")}</p>

        {error && <div className="msg-err">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>{t("track.bookingId")} *</label>
            <input name="bookingId" placeholder={t("track.bookingIdPlaceholder")} required />
          </div>
          <div className="field">
            <label>{t("track.email")} *</label>
            <input name="email" type="email" placeholder={t("track.emailPlaceholder")} required />
          </div>
          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? t("track.searching") : t("track.search")}
          </button>
        </form>

        {booking && (
          <div className="result-card">
            <h3>{t("track.bookingDetails")}</h3>
            <div className="result-row"><span className="result-label">{t("track.bookingIdLabel")}</span><span className="result-value">{booking.id.slice(0, 8).toUpperCase()}</span></div>
            <div className="result-row"><span className="result-label">{t("track.guest")}</span><span className="result-value">{booking.name}</span></div>
            <div className="result-row"><span className="result-label">{t("track.roomType")}</span><span className="result-value">{booking.roomType}</span></div>
            <div className="result-row"><span className="result-label">{t("track.checkin")}</span><span className="result-value">{booking.checkin}</span></div>
            {booking.checkout && <div className="result-row"><span className="result-label">{t("track.checkout")}</span><span className="result-value">{booking.checkout}</span></div>}
            <div className="result-row"><span className="result-label">{t("track.guests")}</span><span className="result-value">{booking.guests}</span></div>
            {booking.amount > 0 && <div className="result-row"><span className="result-label">{t("track.amount")}</span><span className="result-value">{"\u20B9"}{booking.amount.toLocaleString("en-IN")}</span></div>}
            <div className="result-row">
              <span className="result-label">{t("track.bookingStatus")}</span>
              <span className="status-badge" style={{ background: `${statusColor(booking.bookingStatus)}22`, color: statusColor(booking.bookingStatus), border: `1px solid ${statusColor(booking.bookingStatus)}44` }}>{booking.bookingStatus}</span>
            </div>
            <div className="result-row">
              <span className="result-label">{t("track.paymentStatus")}</span>
              <span className="status-badge" style={{ background: `${statusColor(booking.paymentStatus)}22`, color: statusColor(booking.paymentStatus), border: `1px solid ${statusColor(booking.paymentStatus)}44` }}>{booking.paymentStatus}</span>
            </div>
            <a className="invoice-link" href={`/invoice/${booking.id}`} target="_blank" rel="noopener noreferrer">{t("track.viewInvoice")}</a>
          </div>
        )}
      </div>
    </div>
  );
}
