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
      .then((data: Offer[]) => setOffers(data.filter(o => o.active && (!o.validFrom || o.validFrom <= new Date().toLocaleDateString("en-CA", {timeZone:"Asia/Kolkata"})) && (!o.validTo || o.validTo >= new Date().toLocaleDateString("en-CA", {timeZone:"Asia/Kolkata"})))))
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
            <div key={o.id} className="offer-card card-lift reveal-luxury" data-reveal>
              <div className="offer-badge float-badge">{o.discount}</div>
              <h3>{o.title}</h3>
              <p>{o.description}</p>
              {(o.validFrom || o.validTo) && (
                <div className="offer-valid">
                  {o.validFrom && o.validTo
                    ? `Valid ${new Date(o.validFrom).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})} to ${new Date(o.validTo).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})}`
                    : o.validFrom ? `From ${o.validFrom}` : `Until ${o.validTo}`}
                </div>
              )}
              <a className="btn btn-solid" href="/book">Request offer</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
