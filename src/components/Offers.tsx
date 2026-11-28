import type { Offer } from "@/lib/types";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** The offer's conditions in words, e.g. "Arrive at least 30 days after booking · Stay at least 2 nights". */
export function offerConditions(o: Pick<Offer, "minAdvanceDays" | "minNights">) {
  return [
    o.minAdvanceDays ? `Arrive at least ${o.minAdvanceDays} days after booking` : "",
    o.minNights ? `Stay at least ${o.minNights} nights` : "",
  ].filter(Boolean);
}

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
              {offerConditions(o).length > 0 && <p className="offer-valid">{offerConditions(o).join(" · ")}</p>}
              {o.code && (
                <p className="offer-code">
                  Use code <strong>{o.code}</strong> when you send your request
                </p>
              )}
              <a
                className="btn btn-solid"
                href={
                  "/book?offer=" + encodeURIComponent(o.title) + (o.code ? "&code=" + encodeURIComponent(o.code) : "")
                }
              >
                Request this offer
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
