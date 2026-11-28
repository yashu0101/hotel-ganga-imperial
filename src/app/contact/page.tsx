import { canonical } from "@/lib/seo";
import Link from "next/link";
import InteriorShell from "@/components/InteriorShell";
import { SITE_CONFIG } from "@/lib/config";
import { telHref, whatsappHref } from "@/lib/contact";
import Icon, { NewTabNote } from "@/components/Icon";
export const metadata = {
  ...canonical("/contact"),
  title: "Contact & location | Hotel Ganga Imperial",
  description:
    "Get in touch with Hotel Ganga Imperial to plan a stay, a meal or a celebration, and find directions to the hotel.",
};
const landmarks = [
  { name: "Banaras Hindu University", distance: "~6 km" },
  { name: "Kashi Vishwanath Temple", distance: "~8 km" },
  { name: "Dashashwamedh Ghat", distance: "~9 km" },
  { name: "Varanasi Junction (railway station)", distance: "~10 km" },
  { name: "Sarnath", distance: "~15 km" },
  { name: "Lal Bahadur Shastri Airport", distance: "~28 km" },
];

const management = [
  { name: "Dinesh Ji", role: "General Manager", phone: "+91 6388360881" },
  { name: "Bushra Ashfaque", role: "Managing Director", phone: "+91 6388360881" },
  { name: "Ashfaque Ahmed", role: "Founder, Atlas Tour & Travels (Est. 1983)", phone: "+91 9616074995" },
];

// Only configured details are shown. Missing ones are listed in the admin launch checklist.
export default function Contact() {
  const c = SITE_CONFIG.contact;
  const tel = telHref(c.phone),
    whatsapp = whatsappHref(c.whatsapp);
  const details = [
    ["Phone", c.phone],
    ["Email", c.email],
    ["Address", c.address],
  ].filter(([, value]) => value);
  return (
    <InteriorShell>
      <div className="wrap guide-page">
        <span className="eyebrow">LET US HELP YOU PLAN</span>
        <h1>Your next stay starts here.</h1>
        <p className="page-lead">
          For room requests, dining or celebrations, share your plans through the reservation form.
        </p>
        <div className="contact-grid">
          <div className="contact-card">
            <h2>Get in touch</h2>
            {details.length > 0 ? (
              <dl className="policy-list">
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="page-lead">
                Send a reservation request with your dates. The hotel will reply by phone or email to confirm the
                details.
              </p>
            )}
            {(tel || c.email || whatsapp) && (
              <div className="guide-actions">
                {tel && (
                  <a href={tel}>
                    <Icon name="phone" position="start" />
                    Call the hotel
                  </a>
                )}
                {c.email && (
                  <a href={"mailto:" + c.email}>
                    <Icon name="mail" position="start" />
                    Email the hotel
                  </a>
                )}
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noreferrer">
                    <Icon name="chat" position="start" />
                    WhatsApp
                    <NewTabNote />
                  </a>
                )}
              </div>
            )}
            <Link className="btn btn-solid" href="/book" data-reserve-cta>
              Request a reservation <Icon name="arrow-right" position="end" />
            </Link>
          </div>
          <div className="location-card">
            <Icon name="pin" className="location-mark" />
            <h2>Find your way here</h2>
            {c.mapEmbedUrl ? (
              <a className="btn btn-solid" href={c.mapEmbedUrl} target="_blank" rel="noreferrer">
                Open hotel directions <Icon name="external" position="end" />
                <NewTabNote />
              </a>
            ) : (
              <p>Ask for directions in your request and the hotel will include them in its reply.</p>
            )}
            <h3>Nearby landmarks</h3>
            <dl className="policy-list">
              {landmarks.map(l => (
                <div key={l.name}>
                  <dt>{l.name}</dt>
                  <dd>{l.distance}</dd>
                </div>
              ))}
            </dl>
            <p className="small-note">
              Need an airport or railway transfer, or parking? Mention it in your request’s special requests.
            </p>
          </div>
        </div>
        <div className="decision-note">
          <h3>Management</h3>
          <dl className="policy-list">
            {management.map(m => (
              <div key={m.name}>
                <dt>
                  {m.name}
                  <br />
                  <small>{m.role}</small>
                </dt>
                <dd>
                  <a href={telHref(m.phone)}>{m.phone}</a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </InteriorShell>
  );
}
