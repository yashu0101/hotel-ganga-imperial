"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

const genderIcon = (g: string) => g === "female" ? "\u{1F469}" : g === "male" ? "\u{1F468}" : "\u{1F9D1}";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"dashboard" | "bookings" | "enquiries" | "rooms" | "offers">("dashboard");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editRoom, setEditRoom] = useState<{ index: number; room: Room } | null>(null);
  const [newRoom, setNewRoom] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [newOffer, setNewOffer] = useState(false);

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
    ]).then(([b, e, r, o]) => { setBookings(b); setEnquiries(e); setRooms(r); setOffers(o); });
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
    setRooms(data.rooms);
    setEditRoom(null);
  };

  const createRoom = async (room: Room) => {
    const res = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(room) });
    const data = await res.json();
    setRooms(data.rooms);
    setNewRoom(false);
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
    setOffers(prev => [...prev, data.offer]);
    setNewOffer(false);
  };

  const saveOfferFn = async (id: string, updates: Partial<Offer>) => {
    const res = await fetch("/api/offers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    const data = await res.json();
    setOffers(prev => prev.map(o => o.id === id ? data.offer : o));
    setEditOffer(null);
  };

  const removeOffer = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    await fetch(`/api/offers?id=${id}`, { method: "DELETE" });
    setOffers(prev => prev.filter(o => o.id !== id));
  };

  if (loading) return <div style={{ display: "grid", placeItems: "center", height: "100vh", background: "#121827", color: "#C9A15B", fontFamily: "Marcellus, serif", fontSize: "1.2rem" }}>Loading...</div>;

  const totalRevenue = bookings.filter(b => b.paymentStatus === "paid").reduce((s, b) => s + b.amount, 0);
  const confirmedBookings = bookings.filter(b => b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in").length;
  const newEnquiries = enquiries.filter(e => e.status === "new").length;
  const activeOffers = offers.filter(o => o.active).length;

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
        <h1>Hotel Ganga Imperial</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/" style={{ color: "#8a8070", textDecoration: "none", fontSize: ".85rem" }}>View Site</a>
          <button className="adm-btn" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="adm-tabs">
        {(["dashboard", "bookings", "enquiries", "rooms", "offers"] as const).map(t => (
          <button key={t} className={`adm-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="adm-body">
        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <>
            <div className="stat-grid">
              <div className="stat-card"><div className="num">{bookings.length}</div><div className="lbl">Total Bookings</div></div>
              <div className="stat-card"><div className="num">{confirmedBookings}</div><div className="lbl">Active Guests</div></div>
              <div className="stat-card"><div className="num">{newEnquiries}</div><div className="lbl">New Enquiries</div></div>
              <div className="stat-card"><div className="num">{activeOffers}</div><div className="lbl">Active Offers</div></div>
              <div className="stat-card"><div className="num">{rooms.length}</div><div className="lbl">Room Types</div></div>
              <div className="stat-card"><div className="num">{totalRevenue > 0 ? `\u20B9${totalRevenue.toLocaleString()}` : "--"}</div><div className="lbl">Revenue (Paid)</div></div>
            </div>
            <div className="adm-card">
              <h3>Recent Bookings</h3>
              <table className="adm-table">
                <thead><tr><th>Guest</th><th>Room</th><th>Dates</th><th>Status</th></tr></thead>
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
              <h3>Recent Enquiries</h3>
              <table className="adm-table">
                <thead><tr><th>Name</th><th>Type</th><th>Date</th><th>Status</th></tr></thead>
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
              <thead><tr><th></th><th>Guest</th><th>Contact</th><th>Room</th><th>Dates</th><th>Guests</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
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
            {bookings.length === 0 && <p style={{ textAlign: "center", color: "#8a8070", marginTop: 40 }}>No bookings yet</p>}
          </div>
        )}

        {/* ENQUIRIES */}
        {tab === "enquiries" && (
          <div style={{ overflowX: "auto" }}>
            <table className="adm-table">
              <thead><tr><th>Name</th><th>Contact</th><th>Type</th><th>Guests</th><th>Date</th><th>Message</th><th>Status</th><th>Actions</th></tr></thead>
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
            {enquiries.length === 0 && <p style={{ textAlign: "center", color: "#8a8070", marginTop: 40 }}>No enquiries yet</p>}
          </div>
        )}

        {/* ROOMS */}
        {tab === "rooms" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "Marcellus, serif", fontWeight: 400, color: "#C9A15B" }}>Room Types</h2>
              <button className="adm-btn primary" onClick={() => setNewRoom(true)}>+ Add Room</button>
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

        {/* OFFERS */}
        {tab === "offers" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "Marcellus, serif", fontWeight: 400, color: "#C9A15B" }}>Offers & Promotions</h2>
              <button className="adm-btn primary" onClick={() => setNewOffer(true)}>+ Add Offer</button>
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
            {offers.length === 0 && !newOffer && <p style={{ textAlign: "center", color: "#8a8070", marginTop: 40 }}>No offers yet. Create your first promotion.</p>}
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
