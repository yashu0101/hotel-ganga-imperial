"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/context";

interface Offer {
  id: string; title: string; description: string; discount: string;
  validFrom: string; validTo: string; active: boolean;
}

export default function Offers() {
  const { t } = useApp();
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    fetch("/api/offers")
      .then(r => r.json())
      .then((data: Offer[]) => setOffers(data.filter(o => o.active)))
      .catch(() => {});
  }, []);

  if (offers.length === 0) return null;

  return (
    <section className="offers-sec" id="offers">
      <div className="wrap">
        <div className="head">
          <h2>{t("offers.title")}</h2>
          <p>{t("offers.subtitle")}</p>
        </div>
        <div className="offers-grid">
          {offers.map(o => (
            <div key={o.id} className="offer-card" data-reveal>
              <div className="offer-badge">{o.discount}</div>
              <h3>{o.title}</h3>
              <p>{o.description}</p>
              {(o.validFrom || o.validTo) && (
                <div className="offer-valid">
                  {o.validFrom && o.validTo
                    ? `Valid ${o.validFrom} to ${o.validTo}`
                    : o.validFrom ? `From ${o.validFrom}` : `Until ${o.validTo}`}
                </div>
              )}
              <a className="btn btn-solid" href="/book">Book Now</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
