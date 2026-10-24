"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useApp } from "@/lib/context";

interface BanquetPackage {
  id: string; name: string; description: string; capacity: string;
  price: string; includes: string[]; active: boolean;
}

export default function Events() {
  const { t } = useApp();
  const [packages, setPackages] = useState<BanquetPackage[]>([]);

  useEffect(() => {
    fetch("/api/banquet").then(r => r.json())
      .then((data: BanquetPackage[]) => setPackages(data.filter(p => p.active)))
      .catch(() => {});
  }, []);

  return (
    <section id="events">
      <div className="wrap events">
        <div>
          <h2>{t("events.title")}</h2>
          <p style={{ marginTop: 24 }}>{t("events.text")}</p>
          <p>Share your date and guest count and the team will come back with availability.</p>
          <a className="btn btn-solid" href="#enquire">{t("events.cta")}</a>
          <div className="events-pics">
            <Image src="/images/image-26.jpeg" alt="Club lounge" width={200} height={200} loading="lazy" />
            <Image src="/images/image-29.jpeg" alt="Dining area" width={200} height={200} loading="lazy" />
            <Image src="/images/image-30.jpeg" alt="Rooftop terrace" width={200} height={200} loading="lazy" />
          </div>
        </div>
        <div className="media" data-reveal>
          <Image src="/images/image-13.jpeg" alt="Banquet hall with chandeliers" width={600} height={450} loading="lazy" />
        </div>
      </div>

      {packages.length > 0 && (
        <div className="wrap">
          <div className="head" style={{ marginTop: 48 }}>
            <h2>{t("events.packages")}</h2>
            <p>{t("events.packagesSubtitle")}</p>
          </div>
          <div className="banquet-grid">
            {packages.map(pkg => (
              <div key={pkg.id} className="banquet-card" data-reveal>
                <div className="banquet-price">{pkg.price}</div>
                <h3>{pkg.name}</h3>
                <p className="banquet-cap">{pkg.capacity}</p>
                <p>{pkg.description}</p>
                {pkg.includes.length > 0 && (
                  <ul className="banquet-includes">
                    {pkg.includes.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
                <a className="btn btn-solid" href="#enquire">{t("events.cta")}</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
