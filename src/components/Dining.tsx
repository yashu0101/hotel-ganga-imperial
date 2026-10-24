"use client";

import { useApp } from "@/lib/context";

export default function Dining() {
  const { t } = useApp();
  return (
    <section className="dining" id="dining">
      <div className="wrap fan-wrap">
        <div className="head"><h2>{t("dining.title")}</h2><p>{t("dining.subtitle")}</p></div>
        <div className="dining-features" data-reveal>
          <div className="dining-card"><h3>{t("dining.breakfast")}</h3><p>{t("dining.breakfastDesc")}</p></div>
          <div className="dining-card"><h3>{t("dining.roomService")}</h3><p>{t("dining.roomServiceDesc")}</p></div>
          <div className="dining-card"><h3>{t("dining.evening")}</h3><p>{t("dining.eveningDesc")}</p></div>
        </div>
      </div>
    </section>
  );
}
