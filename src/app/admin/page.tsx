"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import NotificationPanel from "@/components/NotificationPanel";
import LaunchChecklist from "@/components/LaunchChecklist";
import Analytics from "@/components/admin/Analytics";
import CalendarView from "@/components/admin/CalendarView";
import CollectionEditor from "@/components/admin/CollectionEditor";
import RequestTable, { type RequestRow } from "@/components/admin/RequestTable";
import { adminRequest, SESSION_EXPIRED } from "@/components/admin/api";
import { COLLECTIONS } from "@/components/admin/collections";
import { BOOKING_STATUSES, ENQUIRY_STATUSES } from "@/lib/validation";
import type { Booking, Enquiry, Room, Offer, BanquetPackage, DiningOption, Review } from "@/lib/types";

type Tab = "dashboard" | "bookings" | "enquiries" | "rooms" | "banquet" | "dining" | "offers" | "reviews" | "analytics" | "calendar";
const TABS: Tab[] = [
  "dashboard",
  "bookings",
  "enquiries",
  "rooms",
  "banquet",
  "dining",
  "offers",
  "reviews",
  "analytics",
  "calendar",
];
interface Data {
  bookings: Booking[];
  enquiries: Enquiry[];
  rooms: Room[];
  offers: Offer[];
  banquet: BanquetPackage[];
  dining: DiningOption[];
  reviews: Review[];
}
const EMPTY: Data = { bookings: [], enquiries: [], rooms: [], offers: [], banquet: [], dining: [], reviews: [] };

const bookingRow = (b: Booking): RequestRow => ({
  id: b.id,
  name: b.name,
  phone: b.mobile,
  email: b.email,
  what: b.roomType + ((b.roomsRequested || 1) > 1 ? ` × ${b.roomsRequested}` : ""),
  extra: b.specialRequests,
  checkin: b.checkin,
  checkout: b.checkout,
  guests: b.guests,
  status: b.bookingStatus,
  createdAt: b.createdAt,
});
/** Merge a table's edits back: rows shown in the table but no longer returned were deleted. */
function applyRows<T extends { id: string }>(
  all: T[],
  shown: RequestRow[],
  rows: RequestRow[],
  status: (item: T, value: string) => T,
) {
  const kept = new Map(rows.map(r => [r.id, r.status]));
  return all
    .filter(item => !shown.some(r => r.id === item.id) || kept.has(item.id))
    .map(item => (kept.has(item.id) ? status(item, kept.get(item.id)!) : item));
}
const withBookingStatus = (b: Booking, value: string) => ({ ...b, bookingStatus: value as Booking["bookingStatus"] });
const withEnquiryStatus = (e: Enquiry, value: string) => ({ ...e, status: value as Enquiry["status"] });
const enquiryRow = (e: Enquiry): RequestRow => ({
  id: e.id,
  name: e.name,
  phone: e.phone,
  email: e.email,
  what: e.type,
  extra: e.message,
  checkin: e.checkin,
  checkout: e.checkout,
  guests: e.guests,
  status: e.status,
  createdAt: e.createdAt,
});

export default function AdminPage() {
  const router = useRouter();
  const { t, lang, setLang } = useApp();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [data, setData] = useState<Data>(EMPTY);
  const [loadError, setLoadError] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: "ok" | "error" } | null>(null);
  const notify = useCallback((message: string, kind: "ok" | "error" = "ok") => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), kind === "error" ? 6000 : 2500);
  }, []);
  const set =
    <K extends keyof Data>(key: K) =>
    (items: Data[K]) =>
      setData(d => ({ ...d, [key]: items }));

  // The public site is English; the dashboard follows the admin's language choice.
  useEffect(() => {
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = "en";
    };
  }, [lang]);

  useEffect(() => {
    const expired = () => router.push("/login");
    window.addEventListener(SESSION_EXPIRED, expired);
    return () => window.removeEventListener(SESSION_EXPIRED, expired);
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => {
      if (!r.ok) router.push("/login");
      else setReady(true);
    });
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const endpoints: [keyof Data, string][] = [
      ["bookings", "/api/bookings"],
      ["enquiries", "/api/enquiries"],
      ["rooms", "/api/rooms"],
      ["offers", "/api/offers"],
      ["banquet", "/api/banquet"],
      ["dining", "/api/dining"],
      ["reviews", "/api/reviews"],
    ];
    Promise.allSettled(endpoints.map(([, url]) => adminRequest<unknown[]>(url))).then(results => {
      const next = { ...EMPTY };
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && Array.isArray(r.value)) (next[endpoints[i][0]] as unknown[]) = r.value;
      });
      setLoadError(results.some(r => r.status === "rejected"));
      setData(next);
    });
  }, [ready]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };
  if (!ready)
    return (
      <div className="adm" style={{ display: "grid", placeItems: "center" }}>
        <p>Loading…</p>
      </div>
    );

  const pending = data.bookings.filter(b => b.bookingStatus === "pending").length;
  const labels = {
    save: t("admin.save"),
    saving: t("admin.saving"),
    cancel: t("admin.cancel"),
    edit: t("admin.edit"),
    delete: t("admin.delete"),
    confirmDelete: t("admin.confirmDelete"),
    empty: t("admin.empty"),
    saved: t("admin.saved"),
    deleted: t("admin.deleted"),
  };
  const collections = COLLECTIONS(t);
  const allBookings = data.bookings.map(bookingRow),
    recent = allBookings.slice(0, 5),
    allEnquiries = data.enquiries.map(enquiryRow);

  return (
    <div className="adm">
      <header className="adm-header">
        <h1>{t("admin.title")}</h1>
        <nav aria-label="Account">
          <button
            className="adm-btn"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            aria-label={lang === "en" ? "हिंदी में देखें" : "View in English"}
          >
            {lang === "en" ? "हि" : "EN"}
          </button>
          <Link href="/">{t("admin.viewSite")}</Link>
          <button className="adm-btn" onClick={logout}>
            {t("admin.logout")}
          </button>
        </nav>
      </header>
      <div className="adm-tabs" role="tablist">
        {TABS.map(k => (
          <button key={k} role="tab" aria-selected={tab === k} className="adm-tab" onClick={() => setTab(k)}>
            {t("admin." + k)}
            {k === "bookings" && pending > 0 && <span className="count">{pending}</span>}
          </button>
        ))}
      </div>
      <main className="adm-body">
        {loadError && (
          <p className="adm-alert error" role="alert">
            {t("admin.loadError")}
          </p>
        )}
        {tab === "dashboard" && (
          <>
            <NotificationPanel />
            <LaunchChecklist rooms={data.rooms} />
            <div className="stat-grid">
              <div className="stat-card">
                <div className="num">{pending}</div>
                <div className="lbl">{t("admin.pendingRequests")}</div>
              </div>
              <div className="stat-card">
                <div className="num">{data.bookings.filter(b => b.bookingStatus === "confirmed").length}</div>
                <div className="lbl">{t("admin.confirmedRequests")}</div>
              </div>
              <div className="stat-card">
                <div className="num">{data.bookings.length}</div>
                <div className="lbl">{t("admin.totalBookings")}</div>
              </div>
              <div className="stat-card">
                <div className="num">{data.enquiries.filter(e => e.status === "new").length}</div>
                <div className="lbl">{t("admin.newEnquiries")}</div>
              </div>
              <div className="stat-card">
                <div className="num">{data.offers.filter(o => o.active).length}</div>
                <div className="lbl">{t("admin.activeOffers")}</div>
              </div>
            </div>
            <h2>{t("admin.recentBookings")}</h2>
            <RequestTable
              rows={recent}
              statuses={BOOKING_STATUSES}
              endpoint="/api/bookings"
              statusField="bookingStatus"
              notify={notify}
              t={t}
              onChange={rows => set("bookings")(applyRows(data.bookings, recent, rows, withBookingStatus))}
            />
          </>
        )}
        {tab === "bookings" && (
          <>
            <h2>{t("admin.bookings")}</h2>
            <RequestTable
              rows={allBookings}
              statuses={BOOKING_STATUSES}
              endpoint="/api/bookings"
              statusField="bookingStatus"
              notify={notify}
              t={t}
              onChange={rows => set("bookings")(applyRows(data.bookings, allBookings, rows, withBookingStatus))}
            />
          </>
        )}
        {tab === "enquiries" && (
          <>
            <h2>{t("admin.enquiries")}</h2>
            <RequestTable
              rows={allEnquiries}
              statuses={ENQUIRY_STATUSES}
              endpoint="/api/enquiries"
              statusField="status"
              notify={notify}
              t={t}
              onChange={rows => set("enquiries")(applyRows(data.enquiries, allEnquiries, rows, withEnquiryStatus))}
            />
          </>
        )}
        {tab === "rooms" && (
          <CollectionEditor
            config={collections.rooms}
            items={data.rooms as never[]}
            setItems={set("rooms") as never}
            labels={labels}
            notify={notify}
          />
        )}
        {tab === "offers" && (
          <CollectionEditor
            config={collections.offers}
            items={data.offers as never[]}
            setItems={set("offers") as never}
            labels={labels}
            notify={notify}
          />
        )}
        {tab === "banquet" && (
          <CollectionEditor
            config={collections.banquet}
            items={data.banquet as never[]}
            setItems={set("banquet") as never}
            labels={labels}
            notify={notify}
          />
        )}
        {tab === "dining" && (
          <CollectionEditor
            config={collections.dining}
            items={data.dining as never[]}
            setItems={set("dining") as never}
            labels={labels}
            notify={notify}
          />
        )}
        {tab === "reviews" && (
          <CollectionEditor
            config={collections.reviews}
            items={data.reviews as never[]}
            setItems={set("reviews") as never}
            labels={labels}
            notify={notify}
          />
        )}
        {tab === "analytics" && <Analytics bookings={data.bookings} t={t} />}
        {tab === "calendar" && <CalendarView bookings={data.bookings} rooms={data.rooms} />}
      </main>
      {toast && (
        <div className={"adm-toast " + toast.kind} role={toast.kind === "error" ? "alert" : "status"}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
