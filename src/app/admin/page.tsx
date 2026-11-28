"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";
import Analytics from "@/components/admin/Analytics";
import BookingForm, { type BookingDraft } from "@/components/admin/BookingForm";
import CalendarView from "@/components/admin/CalendarView";
import CollectionEditor from "@/components/admin/CollectionEditor";
import Icon from "@/components/admin/icons";
import Overview from "@/components/admin/Overview";
import RequestTable, { type RequestRow } from "@/components/admin/RequestTable";
import SetupView, { type NotificationStatus } from "@/components/admin/SetupView";
import SettingsView from "@/components/admin/SettingsView";
import DeletedView, { type DeletedRow } from "@/components/admin/DeletedView";
import ActivityView from "@/components/admin/ActivityView";
import Sidebar, { SECTIONS, type Badges, type Section } from "@/components/admin/Sidebar";
import { adminRequest, errorText, SESSION_EXPIRED } from "@/components/admin/api";
import { COLLECTIONS } from "@/components/admin/collections";
import { fill, formatDay, hotelDay, localeFor } from "@/components/admin/format";
import { AdminUIProvider, useAdminUI } from "@/components/admin/ui";
import { BOOKING_STATUSES, ENQUIRY_STATUSES } from "@/lib/validation";
import { SITE_CONFIG } from "@/lib/config";
import { DEFAULT_SETTINGS, launchChecklist } from "@/lib/hotel-content";
import type {
  AuditEntry,
  Booking,
  Enquiry,
  Room,
  Offer,
  BanquetPackage,
  DiningOption,
  Review,
  HotelSettings,
} from "@/lib/types";

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
/**
 * Requests load in pages: everything sent in the last 180 days, plus older ones that are still open or have dates
 * from then on. That covers Today, the calendar around now and the 90-day analytics; staff load older pages on demand.
 */
const RECENT_DAYS = 180,
  OLDER_PAGE = 200;
const recentSince = () => hotelDay(-RECENT_DAYS);
const ENDPOINTS = (): [keyof Data, string][] => [
  ["bookings", "/api/bookings?since=" + recentSince()],
  ["enquiries", "/api/enquiries"],
  ["rooms", "/api/rooms"],
  ["offers", "/api/offers"],
  ["banquet", "/api/banquet"],
  ["dining", "/api/dining"],
  ["reviews", "/api/reviews"],
];
/** The lists each section needs; a section whose list failed to load says so instead of looking empty. */
const NEEDS: Partial<Record<Section, (keyof Data)[]>> = {
  today: ["bookings"],
  requests: ["bookings"],
  enquiries: ["enquiries"],
  calendar: ["bookings", "rooms"],
  rooms: ["rooms"],
  offers: ["offers"],
  banquet: ["banquet"],
  dining: ["dining"],
  reviews: ["reviews"],
  analytics: ["bookings"],
};
const withoutDuplicates = <T extends { id: string }>(list: T[]) => {
  const seen = new Set<string>();
  return list.filter(item => !seen.has(item.id) && !!seen.add(item.id));
};

const bookingRow = (b: Booking): RequestRow => ({
  id: b.id,
  kind: "booking",
  name: b.name,
  phone: b.mobile,
  email: b.email,
  what: b.roomType,
  rooms: b.roomsRequested,
  extra: b.specialRequests,
  coupon: [b.couponCode, b.couponOffer].filter(Boolean).join(" · "),
  checkin: b.checkin,
  checkout: b.checkout,
  guests: b.guests,
  status: b.bookingStatus,
  createdAt: b.createdAt,
  city: b.city,
  country: b.country,
  staff: b.source === "staff",
});
const enquiryRow = (e: Enquiry): RequestRow => ({
  id: e.id,
  kind: "enquiry",
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

/** "#requests/<id>" → section and the open item. Unknown hashes land on Today; a garbled id opens nothing. */
function readHash(): { section: Section; id: string | null } {
  const [section, id] = window.location.hash.slice(1).split("/");
  if (!SECTIONS.includes(section as Section)) return { section: "today", id: null };
  try {
    return { section: section as Section, id: id ? decodeURIComponent(id) : null };
  } catch {
    return { section: section as Section, id: null };
  }
}

export default function AdminPage() {
  return (
    <div className="adm">
      <AdminUIProvider>
        <Dashboard />
      </AdminUIProvider>
    </div>
  );
}

function Dashboard() {
  const router = useRouter();
  const { t, lang, setLang, theme, setTheme } = useApp();
  const { notify } = useAdminUI();
  const locale = localeFor(lang);
  // "checking" until /api/auth/me answers; "offline" when it could not be reached at all.
  const [session, setSession] = useState<"checking" | "ok" | "offline">("checking");
  const ready = session === "ok";
  const [place, setPlace] = useState<{ section: Section; id: string | null }>({ section: "today", id: null });
  const [data, setData] = useState<Data>(EMPTY);
  // Until the first load finishes, views show a loading state instead of looking empty.
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<keyof Data>>(new Set());
  const [notifications, setNotifications] = useState<NotificationStatus | null>(null);
  const [notificationsFailed, setNotificationsFailed] = useState(false);
  // The add-booking drawer, opened from Requests or a calendar day.
  const [adding, setAdding] = useState<BookingDraft | null>(null);
  const [settings, setSettings] = useState<HotelSettings | null>(null);
  const [settingsFailed, setSettingsFailed] = useState(false);
  // Older requests: the next page starts before `cursor`; `more` until a page comes back short.
  // Older requests: the next page starts after (cursor, cursorId), the last request already loaded; `more` until
  // a page comes back short.
  const [older, setOlder] = useState({ cursor: "", cursorId: "", more: true });
  // Calendar months before the recent window whose stays have been loaded.
  const loadedMonths = useRef(new Set<string>());
  // Deleted requests and the activity log load when their section opens (null: not loaded yet).
  const [deleted, setDeleted] = useState<{ bookings: Booking[]; enquiries: Enquiry[] } | null>(null);
  const [deletedFailed, setDeletedFailed] = useState(false);
  const [activity, setActivity] = useState<AuditEntry[] | null>(null);
  const [activityFailed, setActivityFailed] = useState(false);
  const set =
    <K extends keyof Data>(key: K) =>
    (items: Data[K]) =>
      setData(d => ({ ...d, [key]: items }));

  // Sections live in the URL hash, so back/forward and refresh keep the place.
  useEffect(() => {
    const sync = () => setPlace(readHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const go = useCallback((section: Section, id?: string | null) => {
    window.location.hash = id ? `${section}/${encodeURIComponent(id)}` : section;
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [place.section]);

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

  const loadNotifications = useCallback(async () => {
    try {
      setNotifications(await adminRequest<NotificationStatus>("/api/notifications"));
      setNotificationsFailed(false);
    } catch {
      setNotificationsFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void loadNotifications();
    adminRequest<HotelSettings>("/api/settings")
      .then(s => (setSettings(s), setSettingsFailed(false)))
      .catch(() => setSettingsFailed(true));
    const endpoints = ENDPOINTS();
    setOlder({ cursor: recentSince() + "T00:00:00.000Z", cursorId: "", more: true });
    loadedMonths.current.clear();
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
  }, [ready, loadNotifications]);

  const loadOlder = useCallback(async () => {
    try {
      const after = older.cursorId ? "&beforeId=" + encodeURIComponent(older.cursorId) : "";
      const page = await adminRequest<Booking[]>(
        `/api/bookings?before=${encodeURIComponent(older.cursor)}${after}&limit=${OLDER_PAGE}`,
      );
      setData(d => ({ ...d, bookings: withoutDuplicates([...d.bookings, ...page]) }));
      const last = page.at(-1);
      setOlder(o => ({
        cursor: last?.createdAt ?? o.cursor,
        cursorId: last?.id ?? o.cursorId,
        more: page.length === OLDER_PAGE,
      }));
    } catch (e) {
      notify(errorText(t, e), "error");
    }
  }, [older.cursor, older.cursorId, notify, t]);

  /** A calendar month before the recent window: load every request with a stay in it, once. */
  const loadMonth = useCallback(
    async (month: string) => {
      if (month + "-01" >= recentSince() || loadedMonths.current.has(month)) return;
      loadedMonths.current.add(month);
      const [year, mon] = month.split("-").map(Number);
      const lastDay = new Date(Date.UTC(year, mon, 0)).toISOString().slice(0, 10);
      try {
        const stays = await adminRequest<Booking[]>(`/api/bookings?staysFrom=${month}-01&staysTo=${lastDay}`);
        setData(d => ({ ...d, bookings: withoutDuplicates([...d.bookings, ...stays]) }));
      } catch (e) {
        loadedMonths.current.delete(month);
        notify(errorText(t, e), "error");
      }
    },
    [notify, t],
  );

  const loadDeleted = useCallback(async () => {
    try {
      const [bookings, enquiries] = await Promise.all([
        adminRequest<Booking[]>("/api/bookings?deleted=1"),
        adminRequest<Enquiry[]>("/api/enquiries?deleted=1"),
      ]);
      setDeleted({ bookings, enquiries });
      setDeletedFailed(false);
    } catch {
      setDeletedFailed(true);
    }
  }, []);
  const loadActivity = useCallback(async () => {
    try {
      setActivity(await adminRequest<AuditEntry[]>("/api/audit"));
      setActivityFailed(false);
    } catch {
      setActivityFailed(true);
    }
  }, []);
  // Each visit shows the current Deleted list and activity log.
  useEffect(() => {
    if (!ready) return;
    if (place.section === "deleted") void loadDeleted();
    if (place.section === "activity") void loadActivity();
  }, [ready, place.section, loadDeleted, loadActivity]);

  // Nothing creates enquiries any more; the tab only appears while older ones are stored
  // (or when they could not be loaded, so the error stays visible). Links to it then land on Today.
  const showEnquiries = loaded && (data.enquiries.length > 0 || failed.has("enquiries"));
  useEffect(() => {
    if (loaded && !showEnquiries && place.section === "enquiries") window.location.replace("#today");
  }, [loaded, showEnquiries, place.section]);

  // Status changes and deletes apply to the screen only after the server confirms them.
  const changeStatus = useCallback(
    async (row: RequestRow, status: string) => {
      try {
        if (row.kind === "booking") {
          await adminRequest("/api/bookings", "PATCH", { id: row.id, bookingStatus: status });
          setData(d => ({
            ...d,
            bookings: d.bookings.map(b =>
              b.id === row.id ? { ...b, bookingStatus: status as Booking["bookingStatus"] } : b,
            ),
          }));
        } else {
          await adminRequest("/api/enquiries", "PATCH", { id: row.id, status });
          setData(d => ({
            ...d,
            enquiries: d.enquiries.map(e => (e.id === row.id ? { ...e, status: status as Enquiry["status"] } : e)),
          }));
        }
        notify(fill(t("admin.statusChanged"), { name: row.name, status: t("admin.status." + status) }));
      } catch (e) {
        notify(errorText(t, e), "error");
      }
    },
    [notify, t],
  );
  /** Moves a request to Deleted after the server confirms; true when it moved. Callers decide where to go next. */
  const deleteRequest = useCallback(
    async (row: RequestRow): Promise<boolean> => {
      const endpoint = row.kind === "booking" ? "/api/bookings" : "/api/enquiries";
      try {
        await adminRequest(endpoint + "?id=" + encodeURIComponent(row.id), "DELETE");
        setData(d =>
          row.kind === "booking"
            ? { ...d, bookings: d.bookings.filter(b => b.id !== row.id) }
            : { ...d, enquiries: d.enquiries.filter(e => e.id !== row.id) },
        );
        setDeleted(null);
        notify(t("admin.movedToDeleted"));
        return true;
      } catch (e) {
        notify(errorText(t, e), "error");
        return false;
      }
    },
    [notify, t],
  );
  const restoreRequest = useCallback(
    async (row: DeletedRow) => {
      const endpoint = row.kind === "booking" ? "/api/bookings" : "/api/enquiries";
      try {
        await adminRequest(endpoint, "PATCH", { id: row.id, restore: true });
        const booking = deleted?.bookings.find(b => b.id === row.id),
          enquiry = deleted?.enquiries.find(e => e.id === row.id);
        setData(d =>
          booking
            ? { ...d, bookings: withoutDuplicates([{ ...booking, deletedAt: undefined }, ...d.bookings]) }
            : enquiry
              ? { ...d, enquiries: withoutDuplicates([{ ...enquiry, deletedAt: undefined }, ...d.enquiries]) }
              : d,
        );
        setDeleted(
          d =>
            d && {
              bookings: d.bookings.filter(b => b.id !== row.id),
              enquiries: d.enquiries.filter(e => e.id !== row.id),
            },
        );
        notify(fill(t("admin.restored"), { name: row.name }));
      } catch (e) {
        notify(errorText(t, e), "error");
      }
    },
    [deleted, notify, t],
  );
  const eraseRequest = useCallback(
    async (row: DeletedRow) => {
      const endpoint = row.kind === "booking" ? "/api/bookings" : "/api/enquiries";
      try {
        await adminRequest(endpoint + "?permanent=1&id=" + encodeURIComponent(row.id), "DELETE");
        setDeleted(
          d =>
            d && {
              bookings: d.bookings.filter(b => b.id !== row.id),
              enquiries: d.enquiries.filter(e => e.id !== row.id),
            },
        );
        notify(t("admin.erased"));
      } catch (e) {
        notify(errorText(t, e), "error");
      }
    },
    [notify, t],
  );
  const bookingAdded = useCallback(
    (booking: Booking) => {
      setData(d => ({ ...d, bookings: [booking, ...d.bookings] }));
      notify(fill(t("admin.bookingAdded"), { name: booking.name }));
    },
    [notify, t],
  );
  const retryNotifications = useCallback(
    async (requeue: boolean) => {
      try {
        await adminRequest("/api/notifications", "POST", requeue ? { action: "requeue" } : {});
        notify(t("admin.retried"));
      } catch {
        notify(t("admin.retryFailedMessage"), "error");
      }
      await loadNotifications();
    },
    [loadNotifications, notify, t],
  );

  const logout = async () => {
    const result = await fetch("/api/auth/logout", { method: "POST" })
      .then(r => r.json())
      .catch(() => ({ revoked: false }));
    // This browser is signed out either way; warn when other sessions could not be ended.
    if (result.revoked === false) window.alert(t("admin.logoutPartial"));
    router.push("/login");
  };

  if (!ready)
    return (
      <div className="adm-gate">
        <p className="adm-brand-gate">Ganga Imperial</p>
        {session === "offline" ? (
          <div role="alert">
            <p>{t("admin.sessionError")}</p>
            <button
              className="adm-btn primary"
              onClick={() => {
                setSession("checking");
                checkSession();
              }}
            >
              {t("admin.retry")}
            </button>
          </div>
        ) : (
          <p role="status" className="adm-muted">
            {t("admin.checkingSession")}
          </p>
        )}
      </div>
    );

  const { section, id } = place;
  const requests = data.bookings.map(bookingRow),
    enquiries = data.enquiries.map(enquiryRow);
  const pending = data.bookings.filter(b => b.bookingStatus === "pending").length;
  const newEnquiries = data.enquiries.filter(e => e.status === "new").length;
  const launch =
    loaded && !failed.has("rooms") && (settings || settingsFailed)
      ? launchChecklist({
          contact: SITE_CONFIG.contact,
          settings: settings ?? DEFAULT_SETTINGS,
          rooms: data.rooms.filter(r => !r.hidden),
          offers: data.offers,
          packages: data.banquet,
          dining: data.dining,
        })
      : [];
  const checklist = launch.length;
  const deletedRows: DeletedRow[] | null = deleted && [
    ...deleted.bookings.map(b => ({ ...bookingRow(b), deletedAt: b.deletedAt ?? "" })),
    ...deleted.enquiries.map(e => ({ ...enquiryRow(e), deletedAt: e.deletedAt ?? "" })),
  ];
  const deliveryProblem = notifications
    ? (!notifications.configured ? 1 : 0) + ((notifications.failed ?? 0) > 0 ? 1 : 0)
    : 0;
  const badges: Badges = loaded
    ? {
        requests: { n: pending, attention: true, label: t("admin.badge.pending") },
        enquiries: { n: newEnquiries, attention: true, label: t("admin.badge.new") },
        setup: { n: checklist + deliveryProblem, attention: deliveryProblem > 0, label: t("admin.badge.setup") },
      }
    : {};
  const collections = COLLECTIONS(t, locale);
  const unavailable = (NEEDS[section] ?? []).filter(k => failed.has(k));

  const notices: { id: string; text: string; action?: { label: string; section: Section } }[] = [];
  if (notifications && !notifications.configured)
    notices.push({
      id: "delivery",
      text: t("admin.notice.delivery"),
      action: { label: t("admin.openSetup"), section: "setup" },
    });
  if ((notifications?.failed ?? 0) > 0)
    notices.push({
      id: "failed",
      text: fill(t("admin.notice.failed"), { n: notifications!.failed! }),
      action: { label: t("admin.openSetup"), section: "setup" },
    });
  if (checklist > 0)
    notices.push({
      id: "launch",
      text: fill(t("admin.notice.launch"), { n: checklist }),
      action: { label: t("admin.openChecklist"), section: "setup" },
    });

  const subtitle =
    section === "today"
      ? formatDay(hotelDay(), locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : t("admin.intro." + section);

  return (
    <div className="adm-layout">
      <a className="adm-skip" href="#adm-main">
        {t("admin.skipToContent")}
      </a>
      <Sidebar current={section} badges={badges} hidden={showEnquiries ? [] : ["enquiries"]} />
      <div className="adm-workspace">
        <header className="adm-topbar">
          <div className="adm-title">
            <h1>{t("admin.nav." + section)}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="adm-account">
            <button
              type="button"
              className="adm-icon-btn"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              aria-label={lang === "en" ? "हिंदी में देखें" : "View in English"}
              title={lang === "en" ? "हिंदी" : "English"}
            >
              <span className="adm-lang">{lang === "en" ? "हि" : "EN"}</span>
            </button>
            <button
              type="button"
              className="adm-icon-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? t("admin.lightMode") : t("admin.darkMode")}
              title={theme === "dark" ? t("admin.lightMode") : t("admin.darkMode")}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <button type="button" className="adm-btn" onClick={logout}>
              <Icon name="signout" />
              {t("admin.logout")}
            </button>
          </div>
        </header>

        <main className="adm-main" id="adm-main" tabIndex={-1}>
          {failed.size > 0 && unavailable.length === 0 && (
            <p className="adm-alert" role="alert">
              {t("admin.loadError")}
            </p>
          )}
          {!loaded ? (
            <div className="adm-skeleton" role="status" aria-label={t("admin.loading")}>
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : unavailable.length > 0 ? (
            <p className="adm-alert" role="alert">
              {t("admin.unavailable")}
            </p>
          ) : (
            <>
              {section === "today" && (
                <Overview
                  bookings={data.bookings}
                  requests={requests}
                  enquiries={enquiries}
                  offers={data.offers}
                  notices={notices}
                  go={go}
                  onStatus={changeStatus}
                  bookingRow={bookingRow}
                />
              )}
              {section === "requests" && (
                <RequestTable
                  kind="booking"
                  rows={requests}
                  statuses={BOOKING_STATUSES}
                  selectedId={id}
                  onSelect={next => go("requests", next)}
                  onStatus={changeStatus}
                  onDelete={async row => {
                    if (await deleteRequest(row)) go("requests");
                  }}
                  onAdd={() => setAdding({})}
                  exportHref="/api/bookings/export"
                  onLoadOlder={loadOlder}
                  hasOlder={older.more}
                />
              )}
              {section === "enquiries" && (
                <RequestTable
                  kind="enquiry"
                  rows={enquiries}
                  statuses={ENQUIRY_STATUSES}
                  selectedId={id}
                  onSelect={next => go("enquiries", next)}
                  onStatus={changeStatus}
                  onDelete={async row => {
                    if (await deleteRequest(row)) go("enquiries");
                  }}
                />
              )}
              {section === "deleted" && (
                <DeletedView
                  rows={deletedRows}
                  failed={deletedFailed}
                  onRestore={restoreRequest}
                  onErase={eraseRequest}
                />
              )}
              {section === "calendar" && (
                <CalendarView
                  bookings={data.bookings}
                  rooms={data.rooms}
                  onMonth={loadMonth}
                  bookingRow={bookingRow}
                  onAdd={draft => setAdding(draft)}
                  onStatus={changeStatus}
                  onDelete={deleteRequest}
                />
              )}
              {section === "rooms" && (
                <CollectionEditor
                  config={collections.rooms}
                  items={data.rooms as never[]}
                  setItems={set("rooms") as never}
                />
              )}
              {section === "offers" && (
                <CollectionEditor
                  config={collections.offers}
                  items={data.offers as never[]}
                  setItems={set("offers") as never}
                />
              )}
              {section === "banquet" && (
                <CollectionEditor
                  config={collections.banquet}
                  items={data.banquet as never[]}
                  setItems={set("banquet") as never}
                />
              )}
              {section === "dining" && (
                <CollectionEditor
                  config={collections.dining}
                  items={data.dining as never[]}
                  setItems={set("dining") as never}
                />
              )}
              {section === "reviews" && (
                <CollectionEditor
                  config={collections.reviews}
                  items={data.reviews as never[]}
                  setItems={set("reviews") as never}
                />
              )}
              {section === "analytics" && <Analytics bookings={data.bookings} rooms={data.rooms} />}
              {section === "activity" && (
                <ActivityView entries={activity} failed={activityFailed} onRefresh={() => void loadActivity()} />
              )}
              {section === "settings" &&
                (settingsFailed ? (
                  <p className="adm-alert" role="alert">
                    {t("admin.unavailable")}
                  </p>
                ) : settings ? (
                  <SettingsView settings={settings} onSaved={setSettings} />
                ) : (
                  <p className="adm-muted" role="status">
                    {t("admin.loadingShort")}
                  </p>
                ))}
              {section === "setup" && (
                <SetupView
                  items={launch}
                  status={notifications}
                  statusError={notificationsFailed}
                  onRetry={retryNotifications}
                  go={go}
                />
              )}
            </>
          )}
        </main>
        {adding && (
          <BookingForm
            rooms={data.rooms}
            packages={data.banquet}
            offers={data.offers}
            initial={adding}
            onSaved={bookingAdded}
            onClose={() => setAdding(null)}
          />
        )}
      </div>
    </div>
  );
}
