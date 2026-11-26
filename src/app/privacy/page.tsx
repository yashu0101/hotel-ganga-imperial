import { canonical } from "@/lib/seo";
import Link from "next/link";
import InteriorShell from "@/components/InteriorShell";
import { SITE_CONFIG } from "@/lib/config";
import { PRIVACY_INFORMATION } from "@/lib/hotel-content";

export const metadata = {
  ...canonical("/privacy"),
  title: "Privacy | Hotel Ganga Imperial",
  description:
    "How Hotel Ganga Imperial collects, uses, shares and keeps the details you share in a reservation request.",
};

// Facts left "" in PRIVACY_INFORMATION are not shown; they appear in the admin launch checklist instead.
export default function Privacy() {
  const { legalEntity, contactName, retentionMonths, providers, lastUpdated } = PRIVACY_INFORMATION;
  const contactEmail = PRIVACY_INFORMATION.contactEmail || SITE_CONFIG.contact.email;
  const business = legalEntity || SITE_CONFIG.hotelName;
  return (
    <InteriorShell>
      <div className="wrap privacy-page">
        <Link className="back-inline" href="/">
          ← The hotel
        </Link>
        <h1>Privacy notice</h1>
        {lastUpdated && <p className="privacy-updated">Last updated {lastUpdated}.</p>}
        <p>
          This notice explains how {business} handles the personal details you share through this website. It applies to
          reservation, celebration and dining requests and to request tracking.
        </p>

        <h2>What we collect</h2>
        <p>
          When you send a request we collect your name and phone number, your email address if you give one, the dates,
          room or event preference, number of rooms and guests, any coupon code and any special requests you write. We
          also record when the request was sent and its status.
        </p>
        <p>
          Please do not include payment card details, identity documents or health information in a request. The website
          does not take payments.
        </p>

        <h2>Why we use it</h2>
        <p>
          We use your details only to review your request, contact you about availability and rates, and manage your
          stay or event if you go ahead. Sending a request is your consent to this use. A request is not a confirmed
          reservation.
        </p>

        <h2>Who receives it</h2>
        <p>
          Hotel staff who handle reservations can see your request. We do not sell your details or use them for
          advertising. The following service providers process them on our behalf:
        </p>
        <ul>
          {providers.map(provider => (
            <li key={provider}>{provider}</li>
          ))}
        </ul>

        <h2>How long we keep it</h2>
        <p>
          {retentionMonths > 0
            ? `We keep reservation requests for ${retentionMonths} months from when they were sent or from the requested dates, whichever is later. They are then deleted automatically.`
            : "We keep reservation requests only as long as we need them to respond, manage your stay or event, and meet our legal obligations."}{" "}
          You can ask us to delete your request sooner using the contact details below.
        </p>

        <h2>Your rights</h2>
        <p>
          Under India&rsquo;s Digital Personal Data Protection Act, 2023 you can ask us for a summary of the personal
          data we hold about you, ask us to correct or delete it, withdraw your consent, and raise a grievance.
          Withdrawing consent stops further use but does not affect what was done before. If you are not satisfied with
          our response, you can complain to the Data Protection Board of India.
        </p>

        <h2>Information stored in your browser</h2>
        <p>
          The website remembers your light or dark theme choice and whether you have seen the welcome animation. These
          settings stay in your browser. We do not use advertising or tracking cookies.
        </p>

        <h2>Contact</h2>
        <p>
          For questions or requests about your personal data, contact {contactName ? contactName + " at " : "us at "}
          {contactEmail ? (
            <a href={"mailto:" + contactEmail}>{contactEmail}</a>
          ) : (
            <Link href="/contact">the hotel</Link>
          )}
          . Please include your request reference if you have one.
        </p>
      </div>
    </InteriorShell>
  );
}
