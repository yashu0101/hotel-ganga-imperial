"use client";
import Link from "next/link";
import { useApp } from "@/lib/context";
import Icon, { type IconName } from "./icons";

// Dashboard navigation. Sections are addressed by the URL hash (#requests, #requests/<id>),
// so refresh, back/forward and shared links keep the place.
export type Section =
  | "today"
  | "requests"
  | "calendar"
  | "enquiries"
  | "rooms"
  | "offers"
  | "banquet"
  | "dining"
  | "reviews"
  | "analytics"
  | "setup";

export const NAV: { group: string; items: { id: Section; icon: IconName }[] }[] = [
  {
    group: "admin.group.desk",
    items: [
      { id: "today", icon: "today" },
      { id: "requests", icon: "requests" },
      { id: "calendar", icon: "calendar" },
      { id: "enquiries", icon: "enquiries" },
    ],
  },
  {
    group: "admin.group.website",
    items: [
      { id: "rooms", icon: "rooms" },
      { id: "offers", icon: "offers" },
      { id: "banquet", icon: "banquet" },
      { id: "dining", icon: "dining" },
      { id: "reviews", icon: "reviews" },
    ],
  },
  {
    group: "admin.group.manage",
    items: [
      { id: "analytics", icon: "analytics" },
      { id: "setup", icon: "setup" },
    ],
  },
];
export const SECTIONS = NAV.flatMap(g => g.items.map(i => i.id));

/** A count beside a section: "attention" ones ask staff to act. */
export type Badges = Partial<Record<Section, { n: number; attention?: boolean; label: string }>>;

export default function Sidebar({ current, badges }: { current: Section; badges: Badges }) {
  const { t } = useApp();
  return (
    <aside className="adm-sidebar">
      <a className="adm-brand" href="#today">
        <span className="mark">Ganga Imperial</span>
        <span className="sub">{t("admin.staffArea")}</span>
      </a>
      <nav aria-label={t("admin.sections")}>
        {NAV.map(group => (
          <div key={group.group} className="adm-nav-group">
            <p className="adm-nav-title" id={"nav-" + group.group}>
              {t(group.group)}
            </p>
            <ul aria-labelledby={"nav-" + group.group}>
              {group.items.map(item => {
                const badge = badges[item.id];
                return (
                  <li key={item.id}>
                    <a
                      href={"#" + item.id}
                      className="adm-nav-link"
                      aria-current={current === item.id ? "page" : undefined}
                    >
                      <Icon name={item.icon} />
                      <span className="label">{t("admin.nav." + item.id)}</span>
                      {badge && badge.n > 0 && (
                        <span className={"adm-nav-badge" + (badge.attention ? " attention" : "")}>
                          {badge.n}
                          <span className="sr-only"> {badge.label}</span>
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <Link className="adm-sidebar-site" href="/" target="_blank" rel="noreferrer">
        <Icon name="external" size={16} />
        {t("admin.viewSite")}
      </Link>
    </aside>
  );
}
