import { canonical } from "@/lib/seo";
import Link from "next/link";
import InteriorShell from "@/components/InteriorShell";
import { HOTEL_INFORMATION as info, GUEST_FAQS } from "@/lib/hotel-content";
import Icon from "@/components/Icon";
export const metadata = {
  ...canonical("/guest-information"),
  title: "Guest information & policies | Hotel Ganga Imperial",
  description:
    "How reservation requests work at Hotel Ganga Imperial, plus cancellation, payment, children, identification and accessibility information.",
};
export default function Guide() {
  return (
    <InteriorShell>
      <div className="wrap guide-page">
        <span className="eyebrow">A LITTLE CLARITY BEFORE YOU ARRIVE</span>
        <h1>Good to know.</h1>
        <p className="page-lead">
          Practical information for planning your stay. The exact terms for your dates are confirmed in the hotel’s
          reply to your request.
        </p>
        <div className="decision-note">
          <strong>Reservation requests, explained</strong>
          <p>
            Sending the form saves a request for the hotel to review. It does not hold inventory, confirm a reservation
            or collect payment.
          </p>
        </div>
        <h2>Stay information & policies</h2>
        <dl className="policy-list">
          {[
            ...(info.checkIn && info.checkOut
              ? [
                  ["Check-in", info.checkIn],
                  ["Check-out", info.checkOut],
                ]
              : [
                  [
                    "Check-in & check-out",
                    "Arrival and departure times are included in the hotel’s reply to your request.",
                  ],
                ]),
            ["Cancellation", info.cancellation],
            ["Deposits & payments", info.deposits],
            ["Children & extra beds", info.children],
            ["Identification", info.identification],
            ["Accessibility", info.accessibility],
            ...(info.responseTime ? [["Response time", info.responseTime]] : []),
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h2>Frequently asked questions</h2>
        <div className="faq-list">
          {GUEST_FAQS.map(f => (
            <details key={f.question}>
              <summary>
                {f.question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </div>
        <div className="guide-actions">
          <Link className="btn btn-solid" href="/book" data-reserve-cta>
            Request a reservation <Icon name="arrow-right" position="end" />
          </Link>
          <Link href="/contact">Contact & location</Link>
        </div>
      </div>
    </InteriorShell>
  );
}
