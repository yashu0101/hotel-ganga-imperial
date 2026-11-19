import Link from "next/link";
import InteriorShell from "@/components/InteriorShell";
import { SITE_CONFIG } from "@/lib/config";

export const metadata = { title: "Contact & location | Hotel Ganga Imperial" };

const landmarks = [
  { name: "Kashi Vishwanath Temple", distance: "~8 km" },
  { name: "Dashashwamedh Ghat", distance: "~9 km" },
  { name: "Sarnath (Buddhist site)", distance: "~15 km" },
  { name: "Banaras Hindu University", distance: "~6 km" },
  { name: "Varanasi Junction (Railway)", distance: "~10 km" },
  { name: "Lal Bahadur Shastri Airport", distance: "~28 km" },
];

const management = [
  { name: "Dinesh Ji", role: "General Manager", phone: "+91 6388360881" },
  { name: "Ashfaque Ahmed", role: "Founder, Atlas Tour & Travels (Est. 1983)", phone: "+91 9616074995" },
  { name: "Bushra Ashfaque", role: "Managing Director", phone: "+91 6388360881" },
];

export default function Contact() {
  const c = SITE_CONFIG.contact;
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
            <dl className="policy-list">
              {[
                ["Phone", c.phone],
                ["Email", c.email],
                ["Address", c.address],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="guide-actions">
              {c.phone && (
                <a href={"tel:" + c.phone.replace(/[^+\d]/g, "")}>Call the hotel</a>
              )}
              {c.email && <a href={"mailto:" + c.email}>Email the hotel</a>}
              {c.whatsapp && (
                <a
                  href={"https://wa.me/" + c.whatsapp.replace(/\D/g, "")}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp ↗
                </a>
              )}
            </div>
            <Link className="btn btn-solid" href="/book">
              Send a reservation request ↗
            </Link>
          </div>

          <div className="location-card">
            <span aria-hidden="true">⌖</span>
            <h2>Find your way here</h2>
            {c.mapEmbedUrl && (
              <a
                className="btn btn-solid"
                href={c.mapEmbedUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open hotel directions ↗
              </a>
            )}
            <h3 style={{ marginTop: 24 }}>Nearby Landmarks</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0" }}>
              {landmarks.map((l) => (
                <li
                  key={l.name}
                  style={{
                    padding: "6px 0",
                    borderBottom: "1px solid rgba(128,128,128,0.2)",
                  }}
                >
                  <strong>{l.name}</strong> — {l.distance}
                </li>
              ))}
            </ul>
            <p className="small-note">
              Varanasi Junction Railway Station ~10 km | Lal Bahadur Shastri Airport ~28 km
            </p>
          </div>
        </div>

        <div className="decision-note">
          <h3>Management</h3>
          <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
            {management.map((m) => (
              <div
                key={m.name}
                style={{
                  padding: 16,
                  background: "rgba(128,128,128,0.08)",
                  borderRadius: 8,
                }}
              >
                <strong>{m.name}</strong>
                <br />
                <span style={{ opacity: 0.7, fontSize: 14 }}>{m.role}</span>
                <br />
                <a
                  href={"tel:" + m.phone.replace(/[^+\d]/g, "")}
                  style={{ fontSize: 14 }}
                >
                  {m.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </InteriorShell>
  );
}
