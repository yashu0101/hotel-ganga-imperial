"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface BookingData {
  id: string; name: string; email: string; mobile: string; city: string; country: string;
  roomType: string; checkin: string; checkout: string; guests: number; amount: number;
  bookingStatus: string; paymentStatus: string; createdAt: string;
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bookings")
      .then(r => r.json())
      .then((data: BookingData[]) => {
        const b = data.find(b => b.id === id);
        if (b) setBooking(b);
        else setError("Booking not found.");
      })
      .catch(() => setError("Failed to load booking."));
  }, [id]);

  if (error) return <div style={{ padding: 48, textAlign: "center", fontFamily: "Mulish, sans-serif", color: "#665C50" }}>{error}</div>;
  if (!booking) return <div style={{ padding: 48, textAlign: "center", fontFamily: "Mulish, sans-serif", color: "#C9A15B" }}>Loading...</div>;

  const nights = booking.checkout
    ? Math.max(1, Math.ceil((new Date(booking.checkout).getTime() - new Date(booking.checkin).getTime()) / (1000 * 60 * 60 * 24)))
    : 1;

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .invoice-page { box-shadow: none !important; border: none !important; }
        }
        .invoice-wrap{min-height:100vh;background:#f5f0e8;padding:32px;font-family:"Mulish",system-ui,sans-serif;color:#22201C}
        .invoice-page{max-width:700px;margin:0 auto;background:#fff;padding:48px;box-shadow:0 4px 24px rgba(0,0,0,.1);border:1px solid #e0d5c5}
        .inv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #C9A15B}
        .inv-brand h1{font-family:"Marcellus",Georgia,serif;font-weight:400;font-size:1.6rem;color:#8A6526;margin:0;letter-spacing:.08em}
        .inv-brand p{margin:4px 0 0;font-size:.78rem;color:#665C50}
        .inv-meta{text-align:right;font-size:.82rem;color:#665C50}
        .inv-meta strong{display:block;font-size:1rem;color:#22201C}
        .inv-section{margin-bottom:24px}
        .inv-section h3{font-family:"Marcellus",Georgia,serif;font-weight:400;font-size:1rem;color:#8A6526;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #e0d5c5}
        .inv-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 32px;font-size:.88rem}
        .inv-label{color:#665C50}
        .inv-value{font-weight:600;text-align:right}
        .inv-table{width:100%;border-collapse:collapse;font-size:.88rem;margin-bottom:24px}
        .inv-table th{text-align:left;padding:10px 12px;background:#f5f0e8;color:#665C50;font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #e0d5c5}
        .inv-table td{padding:10px 12px;border-bottom:1px solid #f0e8da}
        .inv-table .right{text-align:right}
        .inv-total{display:flex;justify-content:flex-end;padding:16px 0;border-top:2px solid #C9A15B}
        .inv-total-box{text-align:right}
        .inv-total-box .label{font-size:.85rem;color:#665C50}
        .inv-total-box .amount{font-family:"Marcellus",Georgia,serif;font-size:1.6rem;color:#8A6526}
        .inv-footer{margin-top:32px;padding-top:16px;border-top:1px solid #e0d5c5;text-align:center;font-size:.78rem;color:#998f80}
        .inv-status{display:inline-block;padding:4px 14px;border-radius:12px;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
        .print-bar{max-width:700px;margin:0 auto 16px;display:flex;gap:12px;justify-content:flex-end}
        .print-btn{padding:10px 24px;background:#C9A15B;color:#1A140C;border:none;font:inherit;font-size:.9rem;font-weight:600;cursor:pointer;border-radius:4px}
        .print-btn:hover{background:#E2C68E}
        .back-btn{padding:10px 24px;background:none;color:#665C50;border:1px solid #d0c5b5;font:inherit;font-size:.9rem;cursor:pointer;border-radius:4px;text-decoration:none;display:inline-flex;align-items:center}
        .back-btn:hover{border-color:#C9A15B;color:#8A6526}
      `}</style>

      <div className="invoice-wrap">
        <div className="print-bar no-print">
          <Link href="/admin" className="back-btn">Back to admin</Link>
          <button className="print-btn" onClick={() => window.print()}>Print / Save PDF</button>
        </div>

        <div className="invoice-page">
          <div className="inv-header">
            <div className="inv-brand">
              <h1>Hotel Ganga Imperial</h1>
              <p>Civil Lines, Near Railway Station, Lucknow, UP 226001</p>
              <p>+91 98765 43210 | info@hotelgangaimperial.com</p>
            </div>
            <div className="inv-meta">
              <strong>BOOKING CONFIRMATION</strong>
              <p>ID: {booking.id.slice(0, 8).toUpperCase()}</p>
              <p>Date: {new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              <p style={{ marginTop: 8 }}>
                <span className="inv-status" style={{
                  background: booking.bookingStatus === "confirmed" ? "rgba(91,201,107,.15)" : booking.bookingStatus === "cancelled" ? "rgba(140,140,140,.15)" : "rgba(201,161,91,.15)",
                  color: booking.bookingStatus === "confirmed" ? "#3a8a45" : booking.bookingStatus === "cancelled" ? "#888" : "#8A6526",
                  border: `1px solid ${booking.bookingStatus === "confirmed" ? "rgba(91,201,107,.3)" : booking.bookingStatus === "cancelled" ? "rgba(140,140,140,.3)" : "rgba(201,161,91,.3)"}`,
                }}>
                  {booking.bookingStatus}
                </span>
              </p>
            </div>
          </div>

          <div className="inv-section">
            <h3>Guest Details</h3>
            <div className="inv-grid">
              <span className="inv-label">Name</span><span className="inv-value">{booking.name}</span>
              <span className="inv-label">Email</span><span className="inv-value">{booking.email}</span>
              <span className="inv-label">Mobile</span><span className="inv-value">{booking.mobile}</span>
              <span className="inv-label">City / Country</span><span className="inv-value">{booking.city}, {booking.country}</span>
            </div>
          </div>

          <div className="inv-section">
            <h3>Stay Details</h3>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th className="right">Nights</th>
                  <th className="right">Guests</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{booking.roomType}</td>
                  <td>{booking.checkin}</td>
                  <td>{booking.checkout || "—"}</td>
                  <td className="right">{nights}</td>
                  <td className="right">{booking.guests}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="inv-total">
            <div className="inv-total-box">
              <div className="label">Estimated Total</div>
              <div className="amount">{booking.amount > 0 ? `\u20B9${booking.amount.toLocaleString("en-IN")}` : "To be confirmed"}</div>
              <div className="label" style={{ marginTop: 4 }}>Payment: <strong style={{ textTransform: "capitalize" }}>{booking.paymentStatus}</strong></div>
            </div>
          </div>

          <div className="inv-footer">
            <p>Thank you for choosing Hotel Ganga Imperial. This is a computer-generated document.</p>
            <p>For queries, contact us at +91 98765 43210 or info@hotelgangaimperial.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
