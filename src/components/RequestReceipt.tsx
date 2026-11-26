"use client";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import ContactActions from "@/components/ContactActions";
import { displayDate } from "@/lib/reservation";

export type RequestKind = "room" | "banquet" | "dining";
/** Row labels shared by the booking form's summary slip and the receipt, so both read the same. */
export const CHOICE_LABEL: Record<RequestKind, string> = { room: "Room", banquet: "Package", dining: "Enquiry" };
export const WHEN_LABEL: Record<RequestKind, string> = { room: "Stay", banquet: "Date", dining: "Date" };

export function nightsBetween(checkin: string, checkout: string) {
  return checkin && checkout ? Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86400000) : 0;
}
/** "Sat, 5 Dec to Mon, 7 Dec" (with the year when asked). Empty when no arrival date is chosen. */
export function whenText(kind: RequestKind, checkin: string, checkout: string, withYear = false) {
  if (!checkin) return "";
  const start = displayDate(checkin, withYear);
  const hasEnd = kind === "room" ? Boolean(checkout) : Boolean(checkout) && checkout > checkin;
  return hasEnd ? start + " to " + displayDate(checkout, withYear) : start;
}

export interface ReceiptDetails {
  kind: RequestKind;
  name: string;
  /** The choice as the guest saw it in the form, e.g. "Deluxe Room" or "Gold". */
  preference: string;
  checkin: string;
  checkout: string;
  guests: number;
  rooms: number;
  specialRequests?: string;
  coupon?: string;
  /** Request tracking needs the email the guest gave, so the link is only offered when there is one. */
  hasEmail?: boolean;
}
export default function RequestReceipt({ reference, details }: { reference: string; details: ReceiptDetails }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState("");
  useEffect(() => heading.current?.focus(), []);
  const nights = details.kind === "room" ? nightsBetween(details.checkin, details.checkout) : 0;
  const rows: [string, string][] = [
    ["Name", details.name],
    [CHOICE_LABEL[details.kind], details.preference],
    [
      WHEN_LABEL[details.kind],
      whenText(details.kind, details.checkin, details.checkout, true) +
        (nights > 0 ? ` (${nights} night${nights === 1 ? "" : "s"})` : ""),
    ],
    ...(details.kind === "room" ? [["Rooms", String(details.rooms)] as [string, string]] : []),
    ["Guests", String(details.guests)],
    ...(details.specialRequests ? [["Special requests", details.specialRequests] as [string, string]] : []),
    ...(details.coupon ? [["Offer code", details.coupon] as [string, string]] : []),
  ];
  const summary = [
    "HOTEL GANGA IMPERIAL — RESERVATION REQUEST",
    "Reference: " + reference,
    "Status: Pending hotel confirmation",
    ...rows.map(([label, value]) => label + ": " + value),
    "",
    "This request does not reserve a room or event space. No payment has been taken. Final availability, price and terms must be agreed with the hotel.",
  ].join("\n");
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
        {rows.map(([label, value]) => (
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
        Explore the hotel <span aria-hidden="true">↗</span>
      </Link>
      <p className="small-note">
        Need to talk before the hotel replies? Quote reference {reference.slice(0, 8).toUpperCase()}.{" "}
        <Link href="/guest-information">What happens next?</Link>
        {details.hasEmail && (
          <>
            {" "}
            · <Link href="/track">Check the status of your request</Link>
          </>
        )}
      </p>
      <ContactActions
        message={"Hello, I sent reservation request " + reference.slice(0, 8).toUpperCase() + " on your website."}
      />
    </div>
  );
}
