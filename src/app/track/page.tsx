import Link from "next/link";
import InteriorShell from "@/components/InteriorShell";
import TrackRequest from "@/components/TrackRequest";
import { canonical } from "@/lib/seo";

export const metadata = {
  ...canonical("/track"),
  title: "Track your request | Hotel Ganga Imperial",
  description: "Check the status of a reservation request sent to Hotel Ganga Imperial.",
};

export default function TrackPage() {
  return (
    <InteriorShell>
      <div className="wrap guide-page">
        <span className="eyebrow">YOUR REQUEST</span>
        <h1>Track your request.</h1>
        <p className="page-lead">
          Enter the reference from your request receipt and the email you gave. Requests sent without an email can be
          checked by contacting the hotel. <Link href="/contact">Contact details</Link>.
        </p>
        <TrackRequest />
      </div>
    </InteriorShell>
  );
}
