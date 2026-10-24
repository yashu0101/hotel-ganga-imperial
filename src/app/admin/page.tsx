"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/context";

interface Booking {
  id: string; name: string; mobile: string; email: string; city: string; country: string;
  gender: "male" | "female" | "other"; roomType: string; checkin: string; checkout: string;
  guests: number; amount: number; paymentStatus: string; bookingStatus: string; paymentId: string; createdAt: string;
}
interface Enquiry {
  id: string; name: string; phone: string; email: string; type: string; guests: number;
  checkin: string; checkout: string; message: string; createdAt: string; status: string;
}
interface Room { name: string; text: string; image: string; rate: string; sample: boolean; hidden?: boolean; }
interface Offer {
  id: string; title: string; description: string; discount: string;
  validFrom: string; validTo: string; active: boolean; createdAt: string;
}
interface BanquetPackage {
  id: string; name: string; description: string; capacity: string;
  price: string; includes: string[]; active: boolean; createdAt: string;
}
interface DiningOption {
  id: string; name: string; description: string; price: string;
  category: string; active: boolean; createdAt: string;
}
interface Review {
  id: string; name: string; rating: number; text: string;
  city: string; active: boolean; createdAt: string;
}

const genderIcon = (g: string) => g === "female" ? "\u{1F469}" : g === "male" ? "\u{1F468}" : "\u{1F9D1}";

type Tab = "dashboard" | "bookings" | "enquiries" | "rooms" | "banquet" | "dining" | "offers" | "reviews" | "analytics";

export default function AdminPage() {
  const router = useRouter();
  const { t, lang, setLang } = useApp();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [banquetPkgs, setBanquetPkgs] = useState<BanquetPackage[]>([]);
  const [diningOpts, setDiningOpts] = useState<DiningOption[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editRoom, setEditRoom] = useState<{ index: number; room: Room } | null>(null);
  const [newRoom, setNewRoom] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [newOffer, setNewOffer] = useState(false);
  const [editBanquet, setEditBanquet] = useState<BanquetPackage | null>(null);
  const [newBanquet, setNewBanquet] = useState(false);
  const [editDining, setEditDining] = useState<DiningOption | null>(null);
  const [newDining, setNewDining] = useState(false);
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [newReview, setNewReview] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => { if (!r.ok) router.push("/login"); else setLoading(false); });
  }, [router]);

  useEffect(() => {
    if (loading) return;
    Promise.all([
      fetch("/api/bookings").then(r => r.json()),
      fetch("/api/enquiries").then(r => r.json()),
      fetch("/api/rooms").then(r => r.json()),
      fetch("/api/offers").then(r => r.json()),
      fetch("/api/banquet").then(r => r.json()),
      fetch("/api/dining").then(r => r.json()),
      fetch("/api/reviews").then(r => r.json()),
    ]).then(([b, e, r, o, bp, d, rv]) => { setBookings(b); setEnquiries(e); setRooms(r); setOffers(o); setBanquetPkgs(bp); setDiningOpts(d); setReviews(rv); });
  }, [loading]);

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); };

  const updateBookingStatus = async (id: string, field: string, value: string) => {
    await fetch("/api/bookings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, [field]: value }) });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };
  const deleteBooking = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    setBookings(prev => prev.filter(b => b.id !== id));
  };
  const updateEnquiryStatus = async (id: string, status: string) => {
    await fetch("/api/enquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };
  const deleteEnquiry = async (id: string) => {
    if (!confirm("Delete this enquiry?")) return;
    await fetch(`/api/enquiries?id=${id}`, { method: "DELETE" });
    setEnquiries(prev => prev.filter(e => e.id !== id));
  };

  // Room CRUD
  const saveRoom = async (index: number, room: Partial<Room>) => {
    const res = await fetch("/api/rooms", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index, ...room }) });
    const data = await res.json();
    setRooms(data.rooms); setEditRoom(null);
  };
  const createRoom = async (room: Room) => {
    const res = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(room) });
    const data = await res.json();
    setRooms(data.rooms); setNewRoom(false);
  };
  const removeRoom = async (index: number) => {
    if (!confirm("Delete this room type?")) return;
    const res = await fetch(`/api/rooms?index=${index}`, { method: "DELETE" });
    const data = await res.json();
    setRooms(data.rooms);
  };
  const toggleRoomVisibility = async (index: number) => {
    const room = rooms[index];
    await saveRoom(index, { hidden: !room.hidden });
  };

  // Offer CRUD
  const createOfferFn = async (offer: Omit<Offer, "id" | "createdAt">) => {
    const res = await fetch("/api/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(offer) });
    const data = await res.json();
    setOffers(prev => [...prev, data.offer]); setNewOffer(false);
  };
  const saveOfferFn = async (id: string, updates: Partial<Offer>) => {
    const res = await fetch("/api/offers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    const data = await res.json();
    setOffers(prev => prev.map(o => o.id === id ? data.offer : o)); setEditOffer(null);
  };
  const removeOffer = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    await fetch(`/api/offers?id=${id}`, { method: "DELETE" });
    setOffers(prev => prev.filter(o => o.id !== id));
  };

  // Banquet CRUD
  const createBanquetFn = async (pkg: Omit<BanquetPackage, "id" | "createdAt">) => {
    const res = await fetch("/api/banquet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pkg) });
    const data = await res.json();
    setBanquetPkgs(prev => [...prev, data.package]); setNewBanquet(false);
  };
  const saveBanquetFn = async (id: string, updates: Partial<BanquetPackage>) => {
    const res = await fetch("/api/banquet", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    const data = await res.json();
    setBanquetPkgs(prev => prev.map(p => p.id === id ? data.package : p)); setEditBanquet(null);
  };
  const removeBanquet = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    await fetch(`/api/banquet?id=${id}`, { method: "DELETE" });
    setBanquetPkgs(prev => prev.filter(p => p.id !== id));
  };

  // Dining CRUD
  const createDiningFn = async (opt: Omit<DiningOption, "id" | "createdAt">) => {
    const res = await fetch("/api/dining", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(opt) });
    const data = await res.json();
    setDiningOpts(prev => [...prev, data.option]); setNewDining(false);
  };
  const saveDiningFn = async (id: string, updates: Partial<DiningOption>) => {
    const res = await fetch("/api/dining", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    const data = await res.json();
    setDiningOpts(prev => prev.map(d => d.id === id ? data.option : d)); setEditDining(null);
  };
  const removeDining = async (id: string) => {
    if (!confirm("Delete this dining option?")) return;
    await fetch(`/api/dining?id=${id}`, { method: "DELETE" });
    setDiningOpts(prev => prev.filter(d => d.id !== id));
  };

  // Review CRUD
  const createReviewFn = async (rev: Omit<Review, "id" | "createdAt">) => {
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rev) });
    const data = await res.json();
    setReviews(prev => [...prev, data.review]); setNewReview(false);
  };
  const saveReviewFn = async (id: string, updates: Partial<Review>) => {
    const res = await fetch("/api/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    const data = await res.json();
    setReviews(prev => prev.map(r => r.id === id ? data.review : r)); setEditReview(null);
  };
  const removeReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await fetch(`/api/reviews?id=${id}`, { method: "DELETE" });
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return <div style={{ display: "grid", placeItems: "center", height: "100vh", background: "#121827", color: "#C9A15B", fontFamily: "Marcellus, serif", fontSize: "1.2rem" }}>Loading...</div>;

  const totalRevenue = bookings.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + b.amount, 0);
  const confirmedBookings = bookings.filter(b => b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in").length;
  const newEnquiries = enquiries.filter(e => e.status === "new").length;
  const activeOffers = offers.filter(o => o.active).length;

  // Analytics data
  const getBookingsByDay = () => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = 0;
    }
    bookings.forEach(b => {
      const day = b.createdAt.split("T")[0];
      if (days[day] !== undefined) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), count }));
  };

  const getRevenueByRoom = () => {
    const rev: Record<string, number> = {};
    bookings.filter(b => b.paymentStatus === "paid").forEach(b => {
      rev[b.roomType] = (rev[b.roomType] || 0) + b.amount;
    });
    return Object.entries(rev).map(([room, amount]) => ({ room, amount }));
  };

  const getStatusBreakdown = () => {
    const counts: Record<string, number> = { pending: 0, confirmed: 0, "checked-in": 0, "checked-out": 0, cancelled: 0 };
    bookings.forEach(b => { counts[b.bookingStatus] = (counts[b.bookingStatus] || 0) + 1; });
    return counts;
  };

  const tabKeys: Tab[] = ["dashboard", "bookings", "enquiries", "rooms", "banquet", "dining", "offers", "reviews", "analytics"];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1422", color: "#EDE6DA", fontFamily: "'Mulish', sans-serif" }}>
      <style>{`
        .adm-header{background:rgba(18,24,39,.97);border-bottom:1px solid rgba(201,161,91,.3);padding:0 32px;display:flex;align-items:center;justify-content:space-between;height:64px;position:sticky;top:0;z-index:10}
        .adm-header h1{font-family:Marcellus,serif;color:#C9A15B;font-size:1.1rem;letter-spacing:.12em;font-weight:400;margin:0}
        .adm-tabs{display:flex;gap:0;background:#151b2e;border-bottom:1px solid #252d42}
        .adm-tab{padding:14px 24px;cursor:pointer;border:none;background:none;color:#8a8070;font:inherit;font-size:.9rem;border-bottom:2px solid transparent;transition:all .2s}
        .adm-tab:hover{color:#C9A15B}
        .adm-tab.active{color:#C9A15B;border-bottom-color:#C9A15B;background:rgba(201,161,91,.06)}
        .adm-body{max-width:1200px;margin:0 auto;padding:32px}
        .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:32px}
        .stat-card{background:#1a2035;border:1px solid #252d42;border-radius:8px;padding:24px;text-align:center}
        .stat-card .num{font-family:Marcellus,serif;font-size:2rem;color:#C9A15B;margin-bottom:4px}
        .stat-card .lbl{font-size:.85rem;color:#8a8070}
        .adm-table{width:100%;border-collapse:collapse;font-size:.88rem}
        .adm-table th{text-align:left;padding:12px 14px;color:#8a8070;font-weight:600;border-bottom:1px solid #252d42;font-size:.8rem;text-transform:uppercase;letter-spacing:.06em}
        .adm-table td{padding:12px 14px;border-bottom:1px solid #1e2640}
        .adm-table tr:hover{background:rgba(201,161,91,.04)}
        .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:.75rem;font-weight:600}
        .badge-paid{background:rgba(91,201,107,.15);color:#7ddf8a;border:1px solid rgba(91,201,107,.3)}
        .badge-pending{background:rgba(201,161,91,.15);color:#E2C68E;border:1px solid rgba(201,161,91,.3)}
        .badge-confirmed{background:rgba(91,154,201,.15);color:#7db8df;border:1px solid rgba(91,154,201,.3)}
        .badge-new{background:rgba(201,91,91,.15);color:#e88;border:1px solid rgba(201,91,91,.3)}
        .badge-checked-in{background:rgba(91,201,160,.15);color:#7ddfa8;border:1px solid rgba(91,201,160,.3)}
        .badge-checked-out{background:rgba(140,140,140,.15);color:#aaa;border:1px solid rgba(140,140,140,.3)}
        .badge-cancelled{background:rgba(100,100,100,.15);color:#888;border:1px solid rgba(100,100,100,.3)}
        .badge-contacted{background:rgba(91,154,201,.15);color:#7db8df;border:1px solid rgba(91,154,201,.3)}
        .badge-active{background:rgba(91,201,107,.15);color:#7ddf8a;border:1px solid rgba(91,201,107,.3)}
        .badge-inactive{background:rgba(140,140,140,.15);color:#aaa;border:1px solid rgba(140,140,140,.3)}
        .badge-hidden{background:rgba(100,100,100,.15);color:#888;border:1px solid rgba(100,100,100,.3)}
        .adm-btn{padding:6px 14px;border:1px solid #323a50;background:none;color:#ADA394;border-radius:4px;cursor:pointer;font:inherit;font-size:.8rem;transition:all .2s}
        .adm-btn:hover{border-color:#C9A15B;color:#C9A15B}
        .adm-btn.primary{background:#C9A15B;color:#121827;border-color:#C9A15B}
        .adm-btn.primary:hover{background:#E2C68E}
        .adm-btn.danger{border-color:#c44;color:#e77}
        .adm-btn.danger:hover{background:rgba(200,60,60,.15)}
        select.adm-sel{background:#1a2035;color:#EDE6DA;border:1px solid #323a50;padding:4px 8px;border-radius:4px;font:inherit;font-size:.8rem}
        .adm-card{background:#1a2035;border:1px solid #252d42;border-radius:8px;padding:24px;margin-bottom:16px}
        .adm-card h3{margin:0 0 12px;font-family:Marcellus,serif;color:#C9A15B;font-weight:400}
        .adm-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .adm-form .full{grid-column:1/-1}
        .adm-form label{display:block;font-size:.8rem;color:#8a8070;margin-bottom:4px}
        .adm-form input,.adm-form textarea,.adm-form select{width:100%;padding:10px 12px;background:#0f1422;border:1px solid #323a50;border-radius:4px;color:#EDE6DA;font:inherit;font-size:.88rem;box-sizing:border-box}
        .adm-form input:focus,.adm-form textarea:focus{outline:none;border-color:#C9A15B}
        .adm-form textarea{min-height:60px;resize:vertical}
        .adm-actions{display:flex;gap:8px;margin-top:14px}
        .room-card{display:flex;gap:16px;align-items:center;background:#1a2035;border:1px solid #252d42;border-radius:8px;padding:16px;margin-bottom:12px}
        .room-card img{width:80px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #323a50}
        .room-info{flex:1}
        .room-info h4{margin:0 0 4px;color:#EDE6DA;font-size:.95rem}
        .room-info p{margin:0;font-size:.82rem;color:#8a8070}
        .room-actions{display:flex;gap:6px;flex-shrink:0}
        @media(max-width:700px){
          .adm-tabs{overflow-x:auto;white-space:nowrap}
          .adm-body{padding:16px}
          .adm-table{font-size:.78rem}
          .adm-table th,.adm-table td{padding:8px 6px}
          .adm-form{grid-template-columns:1fr}
          .room-card{flex-direction:column;align-items:stretch}
        }
      `}</style>

      <div className="adm-header">
        <h1>{t("admin.title")}</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="adm-btn" onClick={() => setLang(lang === "en" ? "hi" : "en")}>{lang === "en" ? "हि" : "EN"}</button>
          <a href="/" style={{ color: "#8a8070", textDecoration: "none", fontSize: ".85rem" }}>{t("admin.viewSite")}</a>
          <button className="adm-btn" onClick={logout}>{t("admin.logout")}</button>
        </div>
      </div>

      <div className="adm-tabs">
        {tabKeys.map(tk => (
          <button key={tk} className={`adm-tab${tab === tk ? " active" : ""}`} onClick={() => setTab(tk)}>
            {t(`admin.${tk}`)}
          </button>
        ))}
      </div>

      <div className="adm-body">
        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <>
            <div className="stat-grid">
              <div className="stat-card"><div className="num">{bookings.length}</div><div className="lbl">{t("admin.totalBookings")}</div></div>
              <div className="stat-card"><div className="num">{confirmedBookings}</div><div className="lbl">{t("admin.activeGuests")}</div></div>
              <div className="stat-card"><div className="num">{newEnquiries}</div><div className="lbl">{t("admin.newEnquiries")}</div></div>
              <div className="stat-card"><div className="num">{activeOffers}</div><div className="lbl">{t("admin.activeOffers")}</div></div>
              <div className="stat-card"><div className="num">{rooms.length}</div><div className="lbl">{t("admin.roomTypes")}</div></div>
              <div className="stat-card"><div className="num">{banquetPkgs.filter(p => p.active).length}</div><div className="lbl">{t("admin.banquetPackages")}</div></div>
              <div className="stat-card"><div className="num">{diningOpts.filter(d => d.active).length}</div><div className="lbl">{t("admin.diningOptions")}</div></div>
              <div className="stat-card"><div className="num">{totalRevenue > 0 ? `\u20B9${totalRevenue.toLocaleString()}` : "--"}</div><div className="lbl">{t("admin.revenue")}</div></div>
            </div>
            <div className="adm-card">
              <h3>{t("admin.recentBookings")}</h3>
              <table className="adm-table">
                <thead><tr><th>{t("admin.guest")}</th><th>{t("admin.room")}</th><th>{t("admin.dates")}</th><th>{t("admin.status")}</th></tr></thead>
                <tbody>
                  {bookings.slice(-5).reverse().map(b => (
                    <tr key={b.id}>
                      <td>{genderIcon(b.gender)} {b.name}</td>
                      <td>{b.roomType}</td>
                      <td>{b.checkin} {b.checkout ? `to ${b.checkout}` : ""}</td>
                      <td><span className={`badge badge-${b.bookingStatus}`}>{b.bookingStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="adm-card">
              <h3>{t("admin.recentEnquiries")}</h3>
              <table className="adm-table">
                <thead><tr><th>{t("admin.name")}</th><th>{t("admin.type")}</th><th>{t("admin.date")}</th><th>{t("admin.status")}</th></tr></thead>
                <tbody>
                  {enquiries.slice(-5).reverse().map(e => (
                    <tr key={e.id}>
                      <td>{e.name}</td>
                      <td>{e.type}</td>
                      <td>{e.checkin}</td>
                      <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* BOOKINGS */}
        {tab === "bookings" && (
          <div style={{ overflowX: "auto" }}>
            <table className="adm-table">
              <thead><tr><th></th><th>{t("admin.guest")}</th><th>{t("admin.contact")}</th><th>{t("admin.room")}</th><th>{t("admin.dates")}</th><th>{t("admin.guests")}</th><th>{t("admin.payment")}</th><th>{t("admin.status")}</th><th>{t("admin.actions")}</th></tr></thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontSize: "1.4rem" }}>{genderIcon(b.gender)}</td>
                    <td><strong>{b.name}</strong><br /><span style={{ fontSize: ".75rem", color: "#8a8070" }}>{b.city}, {b.country}</span></td>
                    <td>{b.mobile}<br /><span style={{ fontSize: ".75rem", color: "#8a8070" }}>{b.email}</span></td>
                    <td>{b.roomType}</td>
                    <td>{b.checkin}{b.checkout ? ` to ${b.checkout}` : ""}</td>
                    <td>{b.guests}</td>
                    <td>
                      <select className="adm-sel" value={b.paymentStatus} onChange={e => updateBookingStatus(b.id, "paymentStatus", e.target.value)}>
                        <option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
                      </select>
                    </td>
                    <td>
                      <select className="adm-sel" value={b.bookingStatus} onChange={e => updateBookingStatus(b.id, "bookingStatus", e.target.value)}>
                        <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="checked-in">Checked In</option><option value="checked-out">Checked Out</option><option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td><button className="adm-btn danger" onClick={() => deleteBooking(b.id)}>Del</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && <p style={{ textAlign: "center", color: "#8a8070", marginTop: 40 }}>{t("admin.noBookings")}</p>}
          </div>
        )}

        {/* ENQUIRIES */}
        {tab === "enquiries" && (
          <div style={{ overflowX: "auto" }}>
            <table className="adm-table">
              <thead><tr><th>{t("admin.name")}</th><th>{t("admin.contact")}</th><th>{t("admin.type")}</th><th>{t("admin.guests")}</th><th>{t("admin.date")}</th><th>{t("admin.message")}</th><th>{t("admin.status")}</th><th>{t("admin.actions")}</th></tr></thead>
              <tbody>
                {enquiries.map(e => (
                  <tr key={e.id}>
                    <td><strong>{e.name}</strong></td>
                    <td>{e.phone}<br /><span style={{ fontSize: ".75rem", color: "#8a8070" }}>{e.email}</span></td>
                    <td>{e.type}</td>
                    <td>{e.guests}</td>
                    <td>{e.checkin}{e.checkout ? ` to ${e.checkout}` : ""}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message || "--"}</td>
                    <td>
                      <select className="adm-sel" value={e.status} onChange={ev => updateEnquiryStatus(e.id, ev.target.value)}>
                        <option value="new">New</option><option value="contacted">Contacted</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td><button className="adm-btn danger" onClick={() => deleteEnquiry(e.id)}>Del</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {enquiries.length === 0 && <p style={{ textAlign: "center", color: "#8a8070", marginTop: 40 }}>{t("admin.noEnquiries")}</p>}
          </div>
        )}

        {/* ROOMS */}
        {tab === "rooms" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "Marcellus, serif", fontWeight: 400, color: "#C9A15B" }}>{t("admin.roomTypes")}</h2>
              <button className="adm-btn primary" onClick={() => setNewRoom(true)}>{t("admin.addRoom")}</button>
            </div>
            {newRoom && <RoomForm onSave={createRoom} onCancel={() => setNewRoom(false)} />}
            {rooms.map((room, i) => (
              editRoom?.index === i ? (
                <RoomForm key={i} room={editRoom.room} onSave={(r) => saveRoom(i, r)} onCancel={() => setEditRoom(null)} />
              ) : (
                <div key={i} className="room-card">
                  <img src={room.image} alt={room.name} />
                  <div className="room-info">
                    <h4>{room.name} {room.hidden && <span className="badge badge-hidden">Hidden</span>}</h4>
                    <p>{room.text}</p>
                    <p style={{ marginTop: 4 }}>Rate: {room.rate || "On request"} {room.sample && " | Sample"}</p>
                  </div>
                  <div className="room-actions">
                    <button className="adm-btn" onClick={() => toggleRoomVisibility(i)}>{room.hidden ? "Show" : "Hide"}</button>
                    <button className="adm-btn" onClick={() => setEditRoom({ index: i, room: { ...room } })}>Edit</button>
                    <button className="adm-btn danger" onClick={() => removeRoom(i)}>Del</button>
                  </div>
                </div>
              )
            ))}
          </>
        )}

        {/* BANQUET */}
        {tab === "banquet" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "Marcellus, serif", fontWeight: 400, color: "#C9A15B" }}>{t("admin.banquetPackages")}</h2>
              <button className="adm-btn primary" onClick={() => setNewBanquet(true)}>{t("admin.addPackage")}</button>
            </div>
            {newBanquet && <BanquetForm onSave={createBanquetFn} onCancel={() => setNewBanquet(false)} />}
            {banquetPkgs.map(pkg => (
              editBanquet?.id === pkg.id ? (
                <BanquetForm key={pkg.id} pkg={editBanquet} onSave={(updates) => saveBanquetFn(pkg.id, updates)} onCancel={() => setEditBanquet(null)} />
              ) : (
                <div key={pkg.id} className="adm-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {pkg.name}
                      <span className={`badge ${pkg.active ? "badge-active" : "badge-inactive"}`}>{pkg.active ? "Active" : "Inactive"}</span>
                    </h3>
                    <p style={{ color: "#C9A15B", fontSize: ".95rem", margin: "4px 0" }}>{pkg.price} | {pkg.capacity}</p>
                    <p style={{ color: "#8a8070", fontSize: ".88rem", margin: "4px 0" }}>{pkg.description}</p>
                    {pkg.includes.length > 0 && <p style={{ fontSize: ".82rem", color: "#8a8070" }}>Includes: {pkg.includes.join(", ")}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="adm-btn" onClick={() => saveBanquetFn(pkg.id, { active: !pkg.active })}>{pkg.active ? "Deactivate" : "Activate"}</button>
                    <button className="adm-btn" onClick={() => setEditBanquet({ ...pkg })}>Edit</button>
                    <button className="adm-btn danger" onClick={() => removeBanquet(pkg.id)}>Del</button>
                  </div>
                </div>
              )
            ))}
            {banquetPkgs.length === 0 && !newBanquet && <p style={{ textAlign: "center", color: "#8a8070", marginTop: 40 }}>No banquet packages yet.</p>}
          </>
        )}

        {/* DINING */}
        {tab === "dining" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "Marcellus, serif", fontWeight: 400, color: "#C9A15B" }}>{t("admin.diningOptions")}</h2>
              <button className="adm-btn primary" onClick={() => setNewDining(true)}>{t("admin.addOption")}</button>
            </div>
            {newDining && <DiningForm onSave={createDiningFn} onCancel={() => setNewDining(false)} />}
            {diningOpts.map(opt => (
              editDining?.id === opt.id ? (
                <DiningForm key={opt.id} opt={editDining} onSave={(updates) => saveDiningFn(opt.id, updates)} onCancel={() => setEditDining(null)} />
              ) : (
                <div key={opt.id} className="adm-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {opt.name}
                      <span className={`badge ${opt.active ? "badge-active" : "badge-inactive"}`}>{opt.active ? "Active" : "Inactive"}</span>
                    </h3>
                    <p style={{ color: "#C9A15B", fontSize: ".95rem", margin: "4px 0" }}>{opt.price} | {opt.category.replace("-", " ")}</p>
                    <p style={{ color: "#8a8070", fontSize: ".88rem", margin: "4px 0" }}>{opt.description}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="adm-btn" onClick={() => saveDiningFn(opt.id, { active: !opt.active })}>{opt.active ? "Deactivate" : "Activate"}</button>
                    <button className="adm-btn" onClick={() => setEditDining({ ...opt })}>Edit</button>
                    <button className="adm-btn danger" onClick={() => removeDining(opt.id)}>Del</button>
                  </div>
                </div>
              )
            ))}
            {diningOpts.length === 0 && !newDining && <p style={{ textAlign: "center", color: "#8a8070", marginTop: 40 }}>No dining options yet.</p>}
          </>
        )}

        {/* OFFERS */}
        {tab === "offers" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "Marcellus, serif", fontWeight: 400, color: "#C9A15B" }}>{t("admin.offersTitle")}</h2>
              <button className="adm-btn primary" onClick={() => setNewOffer(true)}>{t("admin.addOffer")}</button>
            </div>
            {newOffer && <OfferForm onSave={createOfferFn} onCancel={() => setNewOffer(false)} />}
            {offers.map(o => (
              editOffer?.id === o.id ? (
                <OfferForm key={o.id} offer={editOffer} onSave={(updates) => saveOfferFn(o.id, updates)} onCancel={() => setEditOffer(null)} />
              ) : (
                <div key={o.id} className="adm-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {o.title}
                      <span className={`badge ${o.active ? "badge-active" : "badge-inactive"}`}>{o.active ? "Active" : "Inactive"}</span>
                    </h3>
                    <p style={{ color: "#8a8070", fontSize: ".88rem", margin: "4px 0" }}>{o.description}</p>
                    <p style={{ fontSize: ".82rem", color: "#C9A15B" }}>
                      Discount: {o.discount} | Valid: {o.validFrom || "--"} to {o.validTo || "--"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="adm-btn" onClick={() => saveOfferFn(o.id, { active: !o.active })}>{o.active ? "Deactivate" : "Activate"}</button>
                    <button className="adm-btn" onClick={() => setEditOffer({ ...o })}>Edit</button>
                    <button className="adm-btn danger" onClick={() => removeOffer(o.id)}>Del</button>
                  </div>
                </div>
              )
            ))}
            {offers.length === 0 && !newOffer && <p style={{ textAlign: "center", color: "#8a8070", marginTop: 40 }}>No offers yet.</p>}
          </>
        )}

        {/* REVIEWS */}
        {tab === "reviews" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "Marcellus, serif", fontWeight: 400, color: "#C9A15B" }}>{t("admin.reviews")}</h2>
              <button className="adm-btn primary" onClick={() => setNewReview(true)}>{t("admin.addReview")}</button>
            </div>
            {newReview && <ReviewForm onSave={createReviewFn} onCancel={() => setNewReview(false)} />}
            {reviews.map(r => (
              editReview?.id === r.id ? (
                <ReviewForm key={r.id} review={editReview} onSave={(updates) => saveReviewFn(r.id, updates)} onCancel={() => setEditReview(null)} />
              ) : (
                <div key={r.id} className="adm-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {r.name}
                      <span style={{ color: "#C9A15B", fontSize: ".9rem" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                      <span className={`badge ${r.active ? "badge-active" : "badge-inactive"}`}>{r.active ? "Active" : "Inactive"}</span>
                    </h3>
                    <p style={{ color: "#8a8070", fontSize: ".88rem", margin: "4px 0", fontStyle: "italic" }}>&ldquo;{r.text}&rdquo;</p>
                    {r.city && <p style={{ fontSize: ".82rem", color: "#C9A15B" }}>{r.city}</p>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="adm-btn" onClick={() => saveReviewFn(r.id, { active: !r.active })}>{r.active ? "Deactivate" : "Activate"}</button>
                    <button className="adm-btn" onClick={() => setEditReview({ ...r })}>Edit</button>
                    <button className="adm-btn danger" onClick={() => removeReview(r.id)}>Del</button>
                  </div>
                </div>
              )
            ))}
            {reviews.length === 0 && !newReview && <p style={{ textAlign: "center", color: "#8a8070", marginTop: 40 }}>No reviews yet.</p>}
          </>
        )}

        {/* ANALYTICS */}
        {tab === "analytics" && (
          <>
            <h2 style={{ margin: "0 0 24px", fontFamily: "Marcellus, serif", fontWeight: 400, color: "#C9A15B" }}>{t("admin.analytics")}</h2>
            <div className="chart-wrap">
              {/* Bookings over time */}
              <div className="chart-card">
                <h3>{t("admin.bookingsOverTime")}</h3>
                <div className="bar-chart">
                  {getBookingsByDay().map(d => {
                    const max = Math.max(...getBookingsByDay().map(x => x.count), 1);
                    return (
                      <div key={d.date} className="bar-col">
                        <div className="bar-value">{d.count}</div>
                        <div className="bar-fill" style={{ height: `${(d.count / max) * 130}px` }} />
                        <div className="bar-label">{d.date}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Booking Status Breakdown */}
              <div className="chart-card">
                <h3>{t("admin.bookingStatus")}</h3>
                {(() => {
                  const status = getStatusBreakdown();
                  const total = Math.max(bookings.length, 1);
                  const colors: Record<string, string> = { pending: "#E2C68E", confirmed: "#7db8df", "checked-in": "#7ddfa8", "checked-out": "#aaa", cancelled: "#888" };
                  return (
                    <div className="donut-wrap">
                      <svg width="140" height="140" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#252d42" strokeWidth="6" />
                        {Object.entries(status).reduce<{ el: React.ReactNode[]; offset: number }>((acc, [key, count]) => {
                          const pct = (count / total) * 100;
                          if (pct > 0) {
                            acc.el.push(
                              <circle key={key} cx="21" cy="21" r="15.9" fill="none" stroke={colors[key] || "#C9A15B"} strokeWidth="6"
                                strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={`${-acc.offset}`} />
                            );
                          }
                          acc.offset += pct;
                          return acc;
                        }, { el: [], offset: 0 }).el}
                      </svg>
                      <div className="donut-legend">
                        {Object.entries(status).map(([key, count]) => count > 0 && (
                          <span key={key}><i style={{ background: colors[key] || "#C9A15B" }} />{key}: {count}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Revenue by room type */}
              <div className="chart-card">
                <h3>{t("admin.revenueByRoom")}</h3>
                <div className="bar-chart">
                  {getRevenueByRoom().length === 0 ? (
                    <p style={{ color: "#8a8070", fontSize: ".85rem", margin: "auto" }}>No revenue data yet</p>
                  ) : (
                    getRevenueByRoom().map(d => {
                      const max = Math.max(...getRevenueByRoom().map(x => x.amount), 1);
                      return (
                        <div key={d.room} className="bar-col">
                          <div className="bar-value">{"\u20B9"}{d.amount.toLocaleString()}</div>
                          <div className="bar-fill" style={{ height: `${(d.amount / max) * 130}px` }} />
                          <div className="bar-label">{d.room.length > 12 ? d.room.slice(0, 12) + ".." : d.room}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Occupancy rate */}
              <div className="chart-card">
                <h3>{t("admin.occupancyRate")}</h3>
                {(() => {
                  const activeRooms = rooms.filter(r => !r.hidden).length || 1;
                  const occupiedRooms = bookings.filter(b => b.bookingStatus === "checked-in").length;
                  const rate = Math.min(Math.round((occupiedRooms / activeRooms) * 100), 100);
                  return (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 0" }}>
                      <svg width="140" height="140" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#252d42" strokeWidth="6" />
                        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#C9A15B" strokeWidth="6"
                          strokeDasharray={`${rate} ${100 - rate}`} strokeDashoffset="25" strokeLinecap="round" />
                        <text x="21" y="23" textAnchor="middle" fill="#C9A15B" fontSize="8" fontFamily="Marcellus, serif">{rate}%</text>
                      </svg>
                      <span style={{ color: "#8a8070", fontSize: ".85rem" }}>{occupiedRooms} / {activeRooms} rooms occupied</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RoomForm({ room, onSave, onCancel }: { room?: Room; onSave: (r: Room) => void; onCancel: () => void }) {
  const [name, setName] = useState(room?.name || "");
  const [text, setText] = useState(room?.text || "");
  const [image, setImage] = useState(room?.image || "/images/image-14.jpeg");
  const [rate, setRate] = useState(room?.rate || "");
  const [sample, setSample] = useState(room?.sample ?? true);
  const [hidden, setHidden] = useState(room?.hidden ?? false);

  return (
    <div className="adm-card">
      <h3>{room ? "Edit Room" : "New Room"}</h3>
      <div className="adm-form">
        <div><label>Name *</label><input value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label>Rate</label><input value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. ₹3000/night" /></div>
        <div className="full"><label>Description</label><textarea value={text} onChange={e => setText(e.target.value)} /></div>
        <div><label>Image path</label><input value={image} onChange={e => setImage(e.target.value)} /></div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", paddingTop: 20 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={sample} onChange={e => setSample(e.target.checked)} /> Sample</label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} /> Hidden</label>
        </div>
      </div>
      <div className="adm-actions">
        <button className="adm-btn primary" onClick={() => name.trim() && onSave({ name: name.trim(), text, image, rate, sample, hidden })}>Save</button>
        <button className="adm-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function BanquetForm({ pkg, onSave, onCancel }: { pkg?: BanquetPackage; onSave: (p: Omit<BanquetPackage, "id" | "createdAt">) => void; onCancel: () => void }) {
  const [name, setName] = useState(pkg?.name || "");
  const [description, setDescription] = useState(pkg?.description || "");
  const [capacity, setCapacity] = useState(pkg?.capacity || "");
  const [price, setPrice] = useState(pkg?.price || "");
  const [includesStr, setIncludesStr] = useState(pkg?.includes?.join(", ") || "");
  const [active, setActive] = useState(pkg?.active ?? true);

  return (
    <div className="adm-card">
      <h3>{pkg ? "Edit Package" : "New Package"}</h3>
      <div className="adm-form">
        <div><label>Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Gold Package" /></div>
        <div><label>Price</label><input value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. ₹1,50,000" /></div>
        <div><label>Capacity</label><input value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g. Up to 200 guests" /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 20 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active</label>
        </div>
        <div className="full"><label>Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div className="full"><label>Includes (comma separated)</label><input value={includesStr} onChange={e => setIncludesStr(e.target.value)} placeholder="Hall rental, Catering, DJ, Decoration" /></div>
      </div>
      <div className="adm-actions">
        <button className="adm-btn primary" onClick={() => name.trim() && onSave({ name: name.trim(), description, capacity, price, includes: includesStr.split(",").map(s => s.trim()).filter(Boolean), active })}>Save</button>
        <button className="adm-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function DiningForm({ opt, onSave, onCancel }: { opt?: DiningOption; onSave: (d: Omit<DiningOption, "id" | "createdAt">) => void; onCancel: () => void }) {
  const [name, setName] = useState(opt?.name || "");
  const [description, setDescription] = useState(opt?.description || "");
  const [price, setPrice] = useState(opt?.price || "");
  const [category, setCategory] = useState(opt?.category || "dinner");
  const [active, setActive] = useState(opt?.active ?? true);

  return (
    <div className="adm-card">
      <h3>{opt ? "Edit Dining Option" : "New Dining Option"}</h3>
      <div className="adm-form">
        <div><label>Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dinner Buffet" /></div>
        <div><label>Price</label><input value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. ₹800/person" /></div>
        <div><label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="room-service">Room Service</option>
            <option value="event-catering">Event Catering</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 20 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active</label>
        </div>
        <div className="full"><label>Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
      </div>
      <div className="adm-actions">
        <button className="adm-btn primary" onClick={() => name.trim() && onSave({ name: name.trim(), description, price, category, active })}>Save</button>
        <button className="adm-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function OfferForm({ offer, onSave, onCancel }: { offer?: Offer; onSave: (o: Omit<Offer, "id" | "createdAt">) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(offer?.title || "");
  const [description, setDescription] = useState(offer?.description || "");
  const [discount, setDiscount] = useState(offer?.discount || "");
  const [validFrom, setValidFrom] = useState(offer?.validFrom || "");
  const [validTo, setValidTo] = useState(offer?.validTo || "");
  const [active, setActive] = useState(offer?.active ?? true);

  return (
    <div className="adm-card">
      <h3>{offer ? "Edit Offer" : "New Offer"}</h3>
      <div className="adm-form">
        <div><label>Title *</label><input value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div><label>Discount</label><input value={discount} onChange={e => setDiscount(e.target.value)} placeholder="e.g. 20% or Complimentary" /></div>
        <div className="full"><label>Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
        <div><label>Valid From</label><input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} /></div>
        <div><label>Valid To</label><input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 20 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active</label>
        </div>
      </div>
      <div className="adm-actions">
        <button className="adm-btn primary" onClick={() => title.trim() && onSave({ title: title.trim(), description, discount, validFrom, validTo, active })}>Save</button>
        <button className="adm-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ReviewForm({ review, onSave, onCancel }: { review?: Review; onSave: (r: Omit<Review, "id" | "createdAt">) => void; onCancel: () => void }) {
  const [name, setName] = useState(review?.name || "");
  const [rating, setRating] = useState(review?.rating || 5);
  const [text, setText] = useState(review?.text || "");
  const [city, setCity] = useState(review?.city || "");
  const [active, setActive] = useState(review?.active ?? true);

  return (
    <div className="adm-card">
      <h3>{review ? "Edit Review" : "New Review"}</h3>
      <div className="adm-form">
        <div><label>Guest Name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rajesh Sharma" /></div>
        <div><label>Rating (1-5)</label><input type="number" min={1} max={5} value={rating} onChange={e => setRating(Number(e.target.value))} /></div>
        <div><label>City</label><input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Delhi" /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 20 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Active</label>
        </div>
        <div className="full"><label>Review Text</label><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Guest review text..." /></div>
      </div>
      <div className="adm-actions">
        <button className="adm-btn primary" onClick={() => name.trim() && onSave({ name: name.trim(), rating: Math.min(5, Math.max(1, rating)), text, city, active })}>Save</button>
        <button className="adm-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
