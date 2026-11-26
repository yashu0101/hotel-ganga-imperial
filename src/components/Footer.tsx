import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";
import { telHref, whatsappHref } from "@/lib/contact";

// Only configured contact details are shown. Missing ones are listed in the admin launch checklist.
export default function Footer() {
  const c = SITE_CONFIG.contact;
  const tel = telHref(c.phone),
    whatsapp = whatsappHref(c.whatsapp);
  const anyContact = tel || c.email || whatsapp;
  return (
    <footer className="professional-footer" id="enquire">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <span className="eyebrow">LET US HELP YOU PLAN</span>
            <h2>A stay to look forward to.</h2>
            <p>
              Share your dates or celebration plans. The hotel will confirm availability and the details of your
              request.
            </p>
            <Link className="btn btn-solid" href="/book">
              Request a reservation ↗
            </Link>
          </div>
          <div>
            <h3>Contact & location</h3>
            {c.address && <address>{c.address}</address>}
            {tel && <a href={tel}>{c.phone}</a>}
            {c.email && <a href={"mailto:" + c.email}>{c.email}</a>}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noreferrer">
                Chat on WhatsApp ↗
              </a>
            )}
            {c.mapEmbedUrl && (
              <a href={c.mapEmbedUrl} target="_blank" rel="noreferrer">
                Get directions ↗
              </a>
            )}
            {!anyContact && <p>Send a reservation request and the hotel will reply by phone or email.</p>}
            <p className="small-note">
              GM: Dinesh Ji · Powered by{" "}
              <a href="https://atlas-tours-yashu0101s-projects.vercel.app" target="_blank" rel="noopener">
                Atlas Tour &amp; Travels
              </a>{" "}
              (Est. 1983)
            </p>
            <p className="small-note">
              Check-in/out times, cancellation terms and payment conditions are provided with your reservation quote.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <a className="wordmark" href="#home">
            <small>Hotel</small>Ganga Imperial
          </a>
          <span>© {new Date().getFullYear()} Hotel Ganga Imperial</span>
          <Link href="/rooms">All rooms</Link>
          <Link href="/contact">Contact & directions</Link>
          <Link href="/guest-information">Policies & FAQs</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="#rooms">Explore rooms ↑</a>
        </div>
      </div>
    </footer>
  );
}
