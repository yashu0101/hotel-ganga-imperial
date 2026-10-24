"use client";

import Image from "next/image";
import { useApp } from "@/lib/context";

const AMENITY_LIST = [
  { icon: "M4 22h24M6 22a10 10 0 0 1 20 0M16 12V9M13 9h6M3 25h26", label: "Premium rooms" },
  { icon: "M3 20c3 0 3 2 6.5 2s3.5-2 6.5-2 3 2 6.5 2 3.5-2 6.5-2M3 26c3 0 3 2 6.5 2s3.5-2 6.5-2 3 2 6.5 2 3.5-2 6.5-2M10 18V6a2 2 0 0 1 4 0M18 18V6a2 2 0 0 1 4 0M10 10h8M10 14h8", label: "Rooftop swimming pool" },
  { icon: "M16 3v4M10 7h12l-2 5h-8zM8 28V16h16v12M5 28h22M12 20h8", label: "Banquet hall" },
  { icon: "M3 16h26M7 10v12M11 8v16M21 8v16M25 10v12", label: "Gym" },
  { icon: "M16 26c-6-3-9-7-9-11 3 0 6 2 9 6 3-4 6-6 9-6 0 4-3 8-9 11zM16 21c-2-4-2-9 0-13 2 4 2 9 0 13z", label: "Spa" },
  { icon: "M12 12a7 7 0 1 0 0 .1M17 17l9 9M24 6a2 2 0 1 0 0 .1", label: "Table tennis" },
  { icon: "M5 24v-8a3 3 0 0 1 6 0v3h10v-3a3 3 0 0 1 6 0v8zM8 24v3M24 24v3M11 19V12a5 5 0 0 1 10 0v7", label: "Club lounge" },
  { icon: "M16 3l10 4v8c0 7-4 11-10 14C10 26 6 22 6 15V7zM12 16l3 3 6-6", label: "24/7 security" },
  { icon: "M18 3L8 18h7l-2 11 11-16h-7z", label: "Power backup" },
  { icon: "M3 12a19 19 0 0 1 26 0M7 16.5a13 13 0 0 1 18 0M11 21a7 7 0 0 1 10 0", label: "High-speed Wi-Fi", circle: true },
];

export default function Amenities() {
  const { t } = useApp();
  return (
    <section className="amen" id="amenities">
      <div className="wrap">
        <div className="head">
          <h2>{t("amenities.title")}</h2>
          <p>{t("amenities.subtitle")}</p>
        </div>
        <div className="amen-feature">
          <figure data-reveal className="tile t-pool">
            <Image src="/images/image-23.jpeg" alt="Rooftop swimming pool" width={700} height={500} loading="lazy" />
            <figcaption>Rooftop swimming pool</figcaption>
          </figure>
          <figure data-reveal className="tile t-banquet">
            <Image src="/images/image-27.jpeg" alt="Banquet hall" width={500} height={500} loading="lazy" />
            <figcaption>Banquet hall</figcaption>
          </figure>
          <figure data-reveal className="tile t-spa">
            <Image src="/images/image-24.jpeg" alt="Spa treatment room" width={400} height={300} loading="lazy" />
            <figcaption>Spa</figcaption>
          </figure>
          <figure data-reveal className="tile t-gym">
            <Image src="/images/image-25.jpeg" alt="Gym" width={400} height={300} loading="lazy" />
            <figcaption>Gym</figcaption>
          </figure>
          <figure data-reveal className="tile t-lounge">
            <Image src="/images/image-26.jpeg" alt="Club lounge" width={400} height={300} loading="lazy" />
            <figcaption>Club lounge</figcaption>
          </figure>
          <figure data-reveal className="tile t-tt">
            <Image src="/images/image-29.jpeg" alt="Table tennis" width={400} height={300} loading="lazy" />
            <figcaption>Table tennis</figcaption>
          </figure>
        </div>
        <ul className="amen-list" aria-label="All amenities">
          {AMENITY_LIST.map((a, i) => (
            <li key={i}>
              <svg viewBox="0 0 32 32">
                <path d={a.icon} />
                {a.circle && <circle cx="16" cy="25" r="1.5" />}
              </svg>
              {a.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
