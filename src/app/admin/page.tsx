"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: string;
  guests: number;
  checkin: string;
  checkout: string;
  message: string;
  createdAt: string;
  status: "new" | "contacted" | "confirmed" | "cancelled";
}

interface Booking {
  id: string;
  name: string;
  mobile: string;
  email: string;
  city: string;
  country: string;
  gender: string;
  roomType: string;
  checkin: string;
  checkout: string;
  guests: number;
  amount: number;
  paymentStatus: string;
  bookingStatus: string;
  paymentId: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "#C9A15B",
  contacted: "#5B8FC9",
  confirmed: "#5BC96B",
  cancelled: "#C95B5B",
  pending: "#C9A15B",
  paid: "#5BC96B",
  failed: "#C95B5B",
  refunded: "#ADA394",
  "checked-in": "#5B8FC9",
  "checked-out": "#ADA394",
};

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<"enquiries" | "bookings" | "stats">("bookings");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) {
          router.push("/login");
          return;
        }
        setAuthenticated(true);
        fetchData();
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enqRes, bookRes] = await Promise.all([
        fetch("/api/enquiries"),
        fetch("/api/bookings"),
      ]);
      if (enqRes.ok) setEnquiries(await enqRes.json());
      if (bookRes.ok) setBookings(await bookRes.json());
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const updateEnquiryStatus = async (id: string, status: string) => {
    await fetch("/api/enquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchData();
  };

  const deleteEnquiry = async (id: string) => {
    if (!confirm("Delete this enquiry?")) return;
    await fetch("/api/enquiries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  const updateBookingStatus = async (id: string, field: string, value: string) => {
    await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    fetchData();
  };

  const deleteBookingItem = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    await fetch("/api/bookings", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  if (authenticated === null) {
    return <div style={{ minHeight: "100vh", background: "#0f1320", display: "flex", alignItems: "center", justifyContent: "center", color: "#ADA394", fontFamily: "Mulish, sans-serif" }}>Loading...</div>;
  }

  const enqStats = {
    total: enquiries.length,
    new: enquiries.filter((e) => e.status === "new").length,
    contacted: enquiries.filter((e) => e.status === "contacted").length,
    confirmed: enquiries.filter((e) => e.status === "confirmed").length,
    cancelled: enquiries.filter((e) => e.status === "cancelled").length,
  };

  const bookStats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.bookingStatus === "pending").length,
    confirmed: bookings.filter((b) => b.bookingStatus === "confirmed").length,
    "checked-in": bookings.filter((b) => b.bookingStatus === "checked-in").length,
    "checked-out": bookings.filter((b) => b.bookingStatus === "checked-out").length,
    cancelled: bookings.filter((b) => b.bookingStatus === "cancelled").length,
  };

  const filteredEnquiries = filter === "all" ? enquiries : enquiries.filter((e) => e.status === filter);
  const filteredBookings = filter === "all" ? bookings : bookings.filter((b) => b.bookingStatus === filter);

  return (
    <div className="admin">
      <style>{`
        .admin { min-height:100vh;background:#0f1320;color:#EDE6DA;font-family:"Mulish",system-ui,sans-serif }
        .admin-header { background:rgba(18,24,39,.95);border-bottom:1px solid rgba(201,161,91,.25);padding:16px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10 }
        .admin-header h1 { font-family:"Marcellus",Georgia,serif;font-weight:400;font-size:1.3rem;color:#C9A15B;margin:0 }
        .admin-header-right { display:flex;gap:16px;align-items:center }
        .admin-header a,.admin-header button.logout { color:#ADA394;text-decoration:none;font-size:.9rem;background:none;border:none;cursor:pointer;font-family:inherit }
        .admin-header a:hover,.admin-header button.logout:hover { color:#C9A15B }
        .admin-body { max-width:1200px;margin:0 auto;padding:32px }
        .admin-tabs { display:flex;gap:0;margin-bottom:24px;border-bottom:1px solid #323A50 }
        .admin-tab { padding:12px 24px;cursor:pointer;color:#ADA394;border:none;border-bottom:2px solid transparent;font-size:.95rem;background:none;font-family:inherit }
        .admin-tab.active { color:#C9A15B;border-bottom-color:#C9A15B }
        .stats-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:32px }
        .stat-card { background:#1B2236;border:1px solid #323A50;border-radius:8px;padding:20px;text-align:center }
        .stat-card strong { display:block;font-size:2rem;color:#C9A15B;font-family:"Marcellus",Georgia,serif }
        .stat-card span { color:#ADA394;font-size:.85rem }
        .filters { display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap }
        .filter-btn { padding:6px 16px;border-radius:20px;border:1px solid #323A50;background:transparent;color:#ADA394;cursor:pointer;font-size:.85rem;font-family:inherit }
        .filter-btn.active { background:#C9A15B;color:#121827;border-color:#C9A15B }
        .tbl { width:100%;border-collapse:collapse }
        .tbl th { text-align:left;padding:12px 14px;border-bottom:1px solid #323A50;color:#ADA394;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em }
        .tbl td { padding:12px 14px;border-bottom:1px solid #1e2640;font-size:.88rem;vertical-align:top }
        .tbl tr:hover td { background:rgba(201,161,91,.04) }
        .badge { display:inline-block;padding:3px 10px;border-radius:12px;font-size:.72rem;font-weight:600;text-transform:uppercase }
        .actions { display:flex;gap:6px;flex-wrap:wrap }
        .act { padding:4px 10px;border-radius:4px;border:1px solid #323A50;background:transparent;color:#ADA394;cursor:pointer;font-size:.75rem;font-family:inherit }
        .act:hover { border-color:#C9A15B;color:#C9A15B }
        .act.danger:hover { border-color:#C95B5B;color:#C95B5B }
        .empty { text-align:center;padding:60px 20px;color:#665C50 }
        .empty h3 { font-family:"Marcellus",Georgia,serif;font-weight:400 }
        .sub-text { color:#ADA394;font-size:.8rem }
        @media(max-width:768px) { .admin-body{padding:16px} .tbl{display:block;overflow-x:auto} }
      `}</style>

      <div className="admin-header">
        <h1>Hotel Ganga Imperial - Admin</h1>
        <div className="admin-header-right">
          <a href="/">View Website</a>
          <button className="logout" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="admin-body">
        <div className="admin-tabs">
          <button className={`admin-tab${tab === "bookings" ? " active" : ""}`} onClick={() => { setTab("bookings"); setFilter("all"); }}>
            Bookings ({bookings.length})
          </button>
          <button className={`admin-tab${tab === "enquiries" ? " active" : ""}`} onClick={() => { setTab("enquiries"); setFilter("all"); }}>
            Enquiries ({enquiries.length})
          </button>
          <button className={`admin-tab${tab === "stats" ? " active" : ""}`} onClick={() => setTab("stats")}>
            Dashboard
          </button>
        </div>

        {/* DASHBOARD */}
        {tab === "stats" && (
          <>
            <h3 style={{ fontFamily: '"Marcellus",serif', fontWeight: 400, marginBottom: 16, color: "#C9A15B" }}>Bookings Overview</h3>
            <div className="stats-grid">
              {Object.entries(bookStats).map(([k, v]) => (
                <div className="stat-card" key={k}>
                  <strong>{v}</strong>
                  <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                </div>
              ))}
            </div>
            <h3 style={{ fontFamily: '"Marcellus",serif', fontWeight: 400, marginBottom: 16, color: "#C9A15B" }}>Enquiries Overview</h3>
            <div className="stats-grid">
              {Object.entries(enqStats).map(([k, v]) => (
                <div className="stat-card" key={k}>
                  <strong>{v}</strong>
                  <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* BOOKINGS */}
        {tab === "bookings" && (
          <>
            <div className="filters">
              {["all", "pending", "confirmed", "checked-in", "checked-out", "cancelled"].map((f) => (
                <button key={f} className={`filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="empty"><p>Loading...</p></div>
            ) : filteredBookings.length === 0 ? (
              <div className="empty">
                <h3>No bookings yet</h3>
                <p>Bookings from /book will appear here.</p>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Guest</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th>Room</th>
                    <th>Stay</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((b) => (
                      <tr key={b.id}>
                        <td>{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className="guest-icon">{b.gender === "female" ? "👩" : b.gender === "male" ? "👨" : "🧑"}</span>
                          {b.name}
                          <br /><span className="sub-text">{b.guests} guest{b.guests > 1 ? "s" : ""}</span>
                        </td>
                        <td>
                          {b.mobile}
                          <br /><span className="sub-text">{b.email}</span>
                        </td>
                        <td>{b.city}, {b.country}</td>
                        <td>{b.roomType}</td>
                        <td>
                          {b.checkin}
                          {b.checkout && <><br /><span className="sub-text">to {b.checkout}</span></>}
                        </td>
                        <td>
                          <span className="badge" style={{ background: `${STATUS_COLORS[b.bookingStatus] || "#666"}22`, color: STATUS_COLORS[b.bookingStatus] || "#666" }}>
                            {b.bookingStatus}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: `${STATUS_COLORS[b.paymentStatus] || "#666"}22`, color: STATUS_COLORS[b.paymentStatus] || "#666" }}>
                            {b.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <select
                              value={b.bookingStatus}
                              onChange={(e) => updateBookingStatus(b.id, "bookingStatus", e.target.value)}
                              className="act"
                              style={{ background: "#1B2236", color: "#ADA394" }}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="checked-in">Checked In</option>
                              <option value="checked-out">Checked Out</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <select
                              value={b.paymentStatus}
                              onChange={(e) => updateBookingStatus(b.id, "paymentStatus", e.target.value)}
                              className="act"
                              style={{ background: "#1B2236", color: "#ADA394" }}
                            >
                              <option value="pending">Pay Pending</option>
                              <option value="paid">Paid</option>
                              <option value="failed">Failed</option>
                              <option value="refunded">Refunded</option>
                            </select>
                            <button className="act danger" onClick={() => deleteBookingItem(b.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ENQUIRIES */}
        {tab === "enquiries" && (
          <>
            <div className="filters">
              {["all", "new", "contacted", "confirmed", "cancelled"].map((f) => (
                <button key={f} className={`filter-btn${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="empty"><p>Loading...</p></div>
            ) : filteredEnquiries.length === 0 ? (
              <div className="empty">
                <h3>No enquiries</h3>
                <p>Enquiries from the website will appear here.</p>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Check-in</th>
                    <th>Guests</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnquiries
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((enq) => (
                      <tr key={enq.id}>
                        <td>{new Date(enq.createdAt).toLocaleDateString()}</td>
                        <td>
                          {enq.name}
                          {enq.email && <><br /><span className="sub-text">{enq.email}</span></>}
                        </td>
                        <td>{enq.phone}</td>
                        <td>{enq.type}</td>
                        <td>{enq.checkin}{enq.checkout && ` to ${enq.checkout}`}</td>
                        <td>{enq.guests}</td>
                        <td>
                          <span className="badge" style={{ background: `${STATUS_COLORS[enq.status]}22`, color: STATUS_COLORS[enq.status] }}>
                            {enq.status}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <select
                              value={enq.status}
                              onChange={(e) => updateEnquiryStatus(enq.id, e.target.value)}
                              className="act"
                              style={{ background: "#1B2236", color: "#ADA394" }}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button className="act danger" onClick={() => deleteEnquiry(enq.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
