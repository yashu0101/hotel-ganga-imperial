import Link from "next/link";
import type { CSSProperties } from "react";
import { SITE_CONFIG } from "@/lib/config";
import { telHref, whatsappHref } from "@/lib/contact";
import Icon, { NewTabNote } from "@/components/Icon";

const NAME = "Ganga Imperial";

const EXPLORE = [
  { href: "/rooms", label: "Rooms & suites" },
  { href: "/dining", label: "Dining" },
  { href: "/celebrations", label: "Celebrations" },
  { href: "/guest-information", label: "Guest information" },
];

// The hotel's name rendered letter by letter so it can rise into place and ripple on hover.
function Letters() {
  return NAME.split("").map((ch, i) => (
    <span key={i} style={{ "--i": i } as CSSProperties}>
      {ch === " " ? " " : ch}
    </span>
  ));
}

// Shared by the home page and every interior page.
// Only configured contact details are shown. Missing ones are listed in the admin launch checklist.
export default function Footer() {
  const c = SITE_CONFIG.contact;
  const tel = telHref(c.phone),
    whatsapp = whatsappHref(c.whatsapp);
  const anyContact = c.address || tel || c.email || whatsapp;
  return (
    <footer className="site-footer" id="enquire">
      <div className="wrap footer-top">
        <div className="footer-invite">
          <h2>A stay to look forward to.</h2>
          <p>
            Share your dates or celebration plans. The hotel will reply to confirm availability and the details of your
            request.
          </p>
          <Link className="btn btn-solid" href="/book" data-reserve-cta>
            Request a reservation
          </Link>
        </div>

        <nav className="footer-col" aria-label="Explore the hotel">
          <h3>Explore</h3>
          <ul>
            {EXPLORE.map(link => (
              <li key={link.href}>
                <Link className="footer-link" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-col">
          <h3>Reach the hotel</h3>
          {c.address && <address>{c.address}</address>}
          <ul>
            {tel && (
              <li>
                <a className="footer-link" href={tel}>
                  {c.phone}
                </a>
              </li>
            )}
            {c.email && (
              <li>
                <a className="footer-link" href={"mailto:" + c.email}>
                  {c.email}
                </a>
              </li>
            )}
            {whatsapp && (
              <li>
                <a className="footer-link" href={whatsapp} target="_blank" rel="noreferrer">
                  Chat on WhatsApp <Icon name="external" position="end" />
                  <NewTabNote />
                </a>
              </li>
            )}
            {c.mapEmbedUrl && (
              <li>
                <a className="footer-link" href={c.mapEmbedUrl} target="_blank" rel="noreferrer">
                  Get directions <Icon name="external" position="end" />
                  <NewTabNote />
                </a>
              </li>
            )}
            <li>
              <Link className="footer-link" href="/contact">
                Contact page
              </Link>
            </li>
          </ul>
          {!anyContact && <p>Send a reservation request and the hotel will reply by phone or email.</p>}
          <p className="small-note">
            GM: Dinesh Ji · Powered by{" "}
            <a href="https://atlas-tours-yashu0101s-projects.vercel.app" target="_blank" rel="noopener">
              Atlas Tour &amp; Travels
            </a>{" "}
            (Est. 1983)
          </p>
        </div>
      </div>

      {/* The name rises out of the river and leaves a reflection on the water below. */}
      <div className="footer-river" aria-hidden="true">
        <div className="wrap">
          <p className="footer-mark">
            <Letters />
          </p>
          <p className="footer-mark footer-reflection">
            <Letters />
          </p>
        </div>
      </div>

      <div className="wrap footer-base">
        <span>© {new Date().getFullYear()} Hotel Ganga Imperial</span>
        <p className="small-note">
          Check-in/out times, cancellation terms and payment conditions are provided with your reservation quote.
        </p>
        <nav aria-label="Guest information">
          <Link className="footer-link" href="/track">
            Track a request
          </Link>
          <Link className="footer-link" href="/guest-information">
            Policies & FAQs
          </Link>
          <Link className="footer-link" href="/privacy">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
