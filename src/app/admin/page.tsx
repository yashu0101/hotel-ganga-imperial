"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import NotificationPanel from "@/components/NotificationPanel";
import LaunchChecklist from "@/components/LaunchChecklist";
import Analytics from "@/components/admin/Analytics";
import CollectionEditor from "@/components/admin/CollectionEditor";
import RequestTable, { type RequestRow } from "@/components/admin/RequestTable";
import { adminRequest, SESSION_EXPIRED } from "@/components/admin/api";
import { COLLECTIONS } from "@/components/admin/collections";
import { BOOKING_STATUSES, ENQUIRY_STATUSES } from "@/lib/validation";
import type { Booking, Enquiry, Room, Offer, BanquetPackage, DiningOption, Review } from "@/lib/types";

type Tab = "dashboard" | "bookings" | "enquiries" | "rooms" | "banquet" | "dining" | "offers" | "reviews" | "analytics";
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
  // "checking" until /api/auth/me answers; "offline" when it could not be reached at all.
  const [session, setSession] = useState<"checking" | "ok" | "offline">("checking");
  const ready = session === "ok";
  const [tab, setTab] = useState<Tab>("dashboard");
  const [data, setData] = useState<Data>(EMPTY);
  // Until the first load finishes, lists and counters show a loading state instead of looking empty.
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<keyof Data>>(new Set());
  const [toast, setToast] = useState<{ message: string; kind: "ok" | "error" } | null>(null);
  const toastTimer = useRef(0);
  // Confirmations fade on their own; errors stay until dismissed so they cannot be missed.
  const notify = useCallback((message: string, kind: "ok" | "error" = "ok") => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, kind });
    if (kind === "ok") toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  // Tabs follow the ARIA tabs pattern: one tab stop, arrow keys/Home/End move between tabs and select them.
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const next =
      e.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (index - 1 + TABS.length) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next]);
    tabRefs.current[next]?.focus();
  };
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

  const checkSession = useCallback(
    () =>
      fetch("/api/auth/me")
        .then(r => {
          if (!r.ok) router.push("/login");
          else setSession("ok");
        })
        .catch(() => setSession("offline")),
    [router],
  );
  useEffect(() => {
    checkSession();
  }, [checkSession]);

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
      const missing = new Set<keyof Data>();
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && Array.isArray(r.value)) (next[endpoints[i][0]] as unknown[]) = r.value;
        else missing.add(endpoints[i][0]);
      });
      setFailed(missing);
      setData(next);
      setLoaded(true);
    });
  }, [ready]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };
  if (!ready)
    return (
      <div className="adm" style={{ display: "grid", placeItems: "center" }}>
        {session === "offline" ? (
          <div role="alert" style={{ textAlign: "center" }}>
            <p>{t("admin.sessionError")}</p>
            <button
              className="adm-btn"
              onClick={() => {
                setSession("checking");
                checkSession();
              }}
            >
              {t("admin.retry")}
            </button>
          </div>
        ) : (
          <p role="status">Loading…</p>
        )}
      </div>
    );

  const pending = data.bookings.filter(b => b.bookingStatus === "pending").length;
  // A counter is only meaningful once its list has loaded; otherwise show a dash rather than a misleading 0.
  const count = (key: keyof Data, n: number) => (loaded && !failed.has(key) ? n : "–");
  const unavailable = (key: keyof Data) =>
    failed.has(key) && (
      <p className="adm-alert error" role="alert">
        {t("admin.unavailable")}
      </p>
    );
  const view = loaded ? tab : null;
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
        {TABS.map((k, i) => (
          <button
            key={k}
            ref={el => {
              tabRefs.current[i] = el;
            }}
            id={"adm-tab-" + k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            aria-controls="adm-panel"
            tabIndex={tab === k ? 0 : -1}
            className="adm-tab"
            onClick={() => setTab(k)}
            onKeyDown={e => onTabKey(e, i)}
          >
            {t("admin." + k)}
            {k === "bookings" && loaded && pending > 0 && <span className="count">{pending}</span>}
          </button>
        ))}
      </div>
      <main className="adm-body" id="adm-panel" role="tabpanel" aria-labelledby={"adm-tab-" + tab} tabIndex={0}>
        {!loaded && (
          <p className="adm-loading" role="status">
            {t("admin.loading")}
          </p>
        )}
        {failed.size > 0 && (
          <p className="adm-alert error" role="alert">
            {t("admin.loadError")}
          </p>
        )}
        {view === "dashboard" && (
          <>
            <NotificationPanel />
            <LaunchChecklist rooms={data.rooms} />
            <div className="stat-grid">
              <div className="stat-card">
                <div className="num">{count("bookings", pending)}</div>
                <div className="lbl">{t("admin.pendingRequests")}</div>
              </div>
              <div className="stat-card">
                <div className="num">
                  {count("bookings", data.bookings.filter(b => b.bookingStatus === "confirmed").length)}
                </div>
                <div className="lbl">{t("admin.confirmedRequests")}</div>
              </div>
              <div className="stat-card">
                <div className="num">{count("bookings", data.bookings.length)}</div>
                <div className="lbl">{t("admin.totalBookings")}</div>
              </div>
              <div className="stat-card">
                <div className="num">{count("enquiries", data.enquiries.filter(e => e.status === "new").length)}</div>
                <div className="lbl">{t("admin.newEnquiries")}</div>
              </div>
              <div className="stat-card">
                <div className="num">{count("offers", data.offers.filter(o => o.active).length)}</div>
                <div className="lbl">{t("admin.activeOffers")}</div>
              </div>
            </div>
            <h2>{t("admin.recentBookings")}</h2>
            {unavailable("bookings") || (
              <RequestTable
                rows={recent}
                statuses={BOOKING_STATUSES}
                endpoint="/api/bookings"
                statusField="bookingStatus"
                notify={notify}
                t={t}
                onChange={rows => set("bookings")(applyRows(data.bookings, recent, rows, withBookingStatus))}
              />
            )}
          </>
        )}
        {view === "bookings" && (
          <>
            <h2>{t("admin.bookings")}</h2>
            {unavailable("bookings") || (
              <RequestTable
                rows={allBookings}
                statuses={BOOKING_STATUSES}
                endpoint="/api/bookings"
                statusField="bookingStatus"
                notify={notify}
                t={t}
                onChange={rows => set("bookings")(applyRows(data.bookings, allBookings, rows, withBookingStatus))}
              />
            )}
          </>
        )}
        {view === "enquiries" && (
          <>
            <h2>{t("admin.enquiries")}</h2>
            {unavailable("enquiries") || (
              <RequestTable
                rows={allEnquiries}
                statuses={ENQUIRY_STATUSES}
                endpoint="/api/enquiries"
                statusField="status"
                notify={notify}
                t={t}
                onChange={rows => set("enquiries")(applyRows(data.enquiries, allEnquiries, rows, withEnquiryStatus))}
              />
            )}
          </>
        )}
        {view === "rooms" &&
          (unavailable("rooms") || (
            <CollectionEditor
              config={collections.rooms}
              items={data.rooms as never[]}
              setItems={set("rooms") as never}
              labels={labels}
              notify={notify}
            />
          ))}
        {view === "offers" &&
          (unavailable("offers") || (
            <CollectionEditor
              config={collections.offers}
              items={data.offers as never[]}
              setItems={set("offers") as never}
              labels={labels}
              notify={notify}
            />
          ))}
        {view === "banquet" &&
          (unavailable("banquet") || (
            <CollectionEditor
              config={collections.banquet}
              items={data.banquet as never[]}
              setItems={set("banquet") as never}
              labels={labels}
              notify={notify}
            />
          ))}
        {view === "dining" &&
          (unavailable("dining") || (
            <CollectionEditor
              config={collections.dining}
              items={data.dining as never[]}
              setItems={set("dining") as never}
              labels={labels}
              notify={notify}
            />
          ))}
        {view === "reviews" &&
          (unavailable("reviews") || (
            <CollectionEditor
              config={collections.reviews}
              items={data.reviews as never[]}
              setItems={set("reviews") as never}
              labels={labels}
              notify={notify}
            />
          ))}
        {view === "analytics" && (unavailable("bookings") || <Analytics bookings={data.bookings} t={t} />)}
      </main>
      {toast && (
        <div className={"adm-toast " + toast.kind} role={toast.kind === "error" ? "alert" : "status"}>
          <span>{toast.message}</span>
          {toast.kind === "error" && (
            <button type="button" className="adm-toast-close" onClick={() => setToast(null)}>
              {t("admin.dismiss")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
