import type { Offer } from "@/lib/types";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Offers that are switched on and valid today in hotel time. */
export function currentOffers(offers: Offer[]) {
  const now = today();
  return offers.filter(o => o.active && (!o.validFrom || o.validFrom <= now) && (!o.validTo || o.validTo >= now));
}

export default function Offers({ offers }: { offers: Offer[] }) {
  const visible = currentOffers(offers);
  if (visible.length === 0) return null;
  return (
    <section className="offers-sec" id="offers">
      <div className="wrap">
        <div className="head">
          <h2>Special Offers</h2>
          <p>Take advantage of our current deals and packages.</p>
        </div>
        <div className="offers-grid">
          {visible.map(o => (
            <div key={o.id} className="offer-card card-lift">
              <div className="offer-badge float-badge">{o.discount}</div>
              <h3>{o.title}</h3>
              <p>{o.description}</p>
              {(o.validFrom || o.validTo) && (
                <div className="offer-valid">
                  {o.validFrom && o.validTo
                    ? `Valid ${formatDate(o.validFrom)} to ${formatDate(o.validTo)}`
                    : o.validFrom
                      ? `From ${formatDate(o.validFrom)}`
                      : `Until ${formatDate(o.validTo)}`}
                </div>
              )}
              <a className="btn btn-solid" href="/book">
                Request offer
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
