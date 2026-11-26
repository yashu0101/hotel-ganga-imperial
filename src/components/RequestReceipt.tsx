"use client";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import ContactActions from "@/components/ContactActions";
export interface ReceiptDetails {
  name: string;
  preference: string;
  checkin: string;
  checkout: string;
  guests: number;
  rooms: number;
  specialRequests?: string;
  coupon?: string;
}
export default function RequestReceipt({ reference, details }: { reference: string; details: ReceiptDetails }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState("");
  useEffect(() => heading.current?.focus(), []);
  const summary = [
    "HOTEL GANGA IMPERIAL — RESERVATION REQUEST",
    "Reference: " + reference,
    "Status: Pending hotel confirmation",
    "Name: " + details.name,
    "Preference: " + details.preference,
    "Arrival / event: " + details.checkin,
    details.checkout ? "Departure: " + details.checkout : "",
    details.rooms ? "Rooms requested: " + details.rooms : "",
    "Guests: " + details.guests,
    details.specialRequests ? "Special requests: " + details.specialRequests : "",
    details.coupon ? "Offer code: " + details.coupon : "",
    "",
    "This request does not reserve a room or event space. No payment has been taken. Final availability, price and terms must be agreed with the hotel.",
  ]
    .filter(Boolean)
    .join("\n");
  function download() {
    const url = URL.createObjectURL(new Blob([summary], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ganga-imperial-request-" + reference.slice(0, 8) + ".txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="reservation-success" role="status">
      <h2 tabIndex={-1} ref={heading}>
        Your plans, received.
      </h2>
      <span className="request-status">PENDING HOTEL CONFIRMATION</span>
      <p>
        Reference <strong>{reference.slice(0, 8).toUpperCase()}</strong>
      </p>
      <dl className="receipt-details">
        {[
          ["Guest", details.name],
          ["Preference", details.preference],
          ["Arrival / event", details.checkin],
          ["Departure", details.checkout || "Not requested"],
          ["Party size", String(details.guests)],
          ...(details.rooms ? [["Rooms requested", String(details.rooms)]] : []),
          ...(details.specialRequests ? [["Special requests", details.specialRequests]] : []),
          ...(details.coupon ? [["Offer code", details.coupon]] : []),
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        The hotel will review availability and contact you using the details you provided. Your reservation is not
        confirmed yet. No payment has been taken.
      </p>
      <div className="receipt-actions">
        <button type="button" onClick={download}>
          Save request summary ↓
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(reference);
              setCopied("Reference copied.");
            } catch {
              setCopied("Copy this reference: " + reference);
            }
          }}
        >
          Copy reference
        </button>
        <button type="button" onClick={() => window.print()}>
          Print summary
        </button>
      </div>
      <p className="small-note" aria-live="polite">
        {copied}
      </p>
      <Link className="btn btn-solid" href="/">
        Explore the hotel ↗
      </Link>
      <p className="small-note">
        Need to talk before the hotel replies? Quote reference {reference.slice(0, 8).toUpperCase()}.{" "}
        <Link href="/guest-information">What happens next?</Link>
      </p>
      <ContactActions
        message={"Hello, I sent reservation request " + reference.slice(0, 8).toUpperCase() + " on your website."}
      />
    </div>
  );
}
