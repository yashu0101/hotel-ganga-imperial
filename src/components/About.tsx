"use client";

import { useApp } from "@/lib/context";

export default function About() {
  const { t } = useApp();
  return (
    <section id="about">
      <div className="wrap intro">
        <h2>{t("about.title")}</h2>
        <p>{t("about.p1")}</p>
        <p>{t("about.p2")}</p>
        <div className="stat-row" data-reveal>
          <div className="stat"><strong>4+</strong><span>{t("about.roomTypes")}</span></div>
          <div className="stat"><strong>1</strong><span>{t("about.rooftopPool")}</span></div>
          <div className="stat"><strong>24/7</strong><span>{t("about.security")}</span></div>
          <div className="stat"><strong>1</strong><span>{t("about.banquetHall")}</span></div>
        </div>
      </div>
    </section>
  );
}
