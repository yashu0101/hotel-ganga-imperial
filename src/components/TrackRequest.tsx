"use client";

import { useState, FormEvent } from "react";

interface Result {
  reference: string;
  roomType: string;
  roomsRequested: number;
  checkin: string;
  checkout: string;
  guests: number;
  status: string;
}
const STATUS: Record<string, string> = {
  pending: "Received. The hotel will contact you to confirm availability and the rate.",
  confirmed: "Confirmed by the hotel.",
  "checked-in": "Checked in.",
  "checked-out": "Completed. Thank you for staying with us.",
  cancelled: "Cancelled.",
};

export default function TrackRequest() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    const values = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: values.get("reference"), email: values.get("email") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Error(data.error || "Please try again.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="reservation-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="reference">Request reference *</label>
          <input
            id="reference"
            name="reference"
            required
            minLength={8}
            maxLength={64}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. 3F9A12BC"
          />
        </div>
        <div className="field">
          <label htmlFor="track-email">Email used for the request *</label>
          <input id="track-email" name="email" type="email" autoComplete="email" maxLength={150} required />
        </div>
        {error && (
          <div className="reservation-error" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-solid" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Check status ↗"}
        </button>
      </form>
      {result && (
        <div className="decision-note" role="status">
          <h2>Request {result.reference}</h2>
          <p>{STATUS[result.status] ?? result.status}</p>
          <dl className="policy-list">
            {[
              ["Preference", result.roomType + (result.roomsRequested > 1 ? " × " + result.roomsRequested : "")],
              ["Dates", result.checkin + (result.checkout ? " → " + result.checkout : "")],
              ["Guests", String(result.guests)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </>
  );
}
