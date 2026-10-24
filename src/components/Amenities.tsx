"use client";

import Image from "next/image";
import { useApp } from "@/lib/context";

export default function Amenities() {
  const { t } = useApp();
  const items = [
    { key: "pool", title: t("amenities.pool"), text: t("amenities.poolDesc") },
    { key: "spa", title: t("amenities.spa"), text: t("amenities.spaDesc") },
    { key: "gym", title: t("amenities.gym"), text: t("amenities.gymDesc") },
    { key: "lounge", title: t("amenities.lounge"), text: t("amenities.loungeDesc") },
    { key: "security", title: t("amenities.security"), text: t("amenities.securityDesc") },
  ];
  return (
    <section className="amen" id="amenities">
      <div className="wrap">
        <div className="head"><h2>{t("amenities.title")}</h2><p>{t("amenities.subtitle")}</p></div>
        <div className="amen-feature">
          <div className="amen-img" data-reveal><Image src="/images/image-8.jpeg" alt="Rooftop pool" width={600} height={400} /></div>
          <div className="amen-text" data-reveal><h3>{t("amenities.poolTitle")}</h3><p>{t("amenities.poolText")}</p></div>
        </div>
        <div className="amen-grid">
          {items.map((item) => (
            <div key={item.key} className="amen-card" data-reveal>
              <div className="amen-icon" data-icon={item.key} />
              <h3>{item.title}</h3><p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
