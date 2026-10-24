"use client";

import { useEffect, useState } from "react";

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

const STATUS_COLORS: Record<string, string> = {
  new: "#C9A15B",
  contacted: "#5B8FC9",
  confirmed: "#5BC96B",
  cancelled: "#C95B5B",
};

export default function AdminPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [tab, setTab] = useState<"enquiries" | "stats">("enquiries");

  const fetchEnquiries = async () => {
    try {
      const res = await fetch("/api/enquiries");
      const data = await res.json();
      setEnquiries(data);
    } catch (err) {
      console.error("Failed to fetch enquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const updateStatus = async (id: string, status: Enquiry["status"]) => {
    try {
      await fetch("/api/enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchEnquiries();
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const deleteEnquiry = async (id: string) => {
    if (!confirm("Delete this enquiry?")) return;
    try {
      await fetch("/api/enquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchEnquiries();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const filtered = filter === "all" ? enquiries : enquiries.filter((e) => e.status === filter);

  const stats = {
    total: enquiries.length,
    new: enquiries.filter((e) => e.status === "new").length,
    contacted: enquiries.filter((e) => e.status === "contacted").length,
    confirmed: enquiries.filter((e) => e.status === "confirmed").length,
    cancelled: enquiries.filter((e) => e.status === "cancelled").length,
  };

  return (
    <div className="admin">
      <style>{`
        .admin {
          min-height: 100vh;
          background: #0f1320;
          color: #EDE6DA;
          font-family: "Mulish", system-ui, sans-serif;
          padding: 0;
        }
        .admin-header {
          background: rgba(18,24,39,.95);
          border-bottom: 1px solid rgba(201,161,91,.25);
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .admin-header h1 {
          font-family: "Marcellus", Georgia, serif;
          font-weight: 400;
          font-size: 1.3rem;
          color: #C9A15B;
          margin: 0;
        }
        .admin-header a {
          color: #ADA394;
          text-decoration: none;
          font-size: .9rem;
        }
        .admin-header a:hover { color: #C9A15B; }
        .admin-body { max-width: 1200px; margin: 0 auto; padding: 32px; }
        .admin-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 24px;
          border-bottom: 1px solid #323A50;
        }
        .admin-tab {
          padding: 12px 24px;
          cursor: pointer;
          color: #ADA394;
          border-bottom: 2px solid transparent;
          font-size: .95rem;
          background: none;
          border-top: none;
          border-left: none;
          border-right: none;
          font-family: inherit;
        }
        .admin-tab.active {
          color: #C9A15B;
          border-bottom-color: #C9A15B;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: #1B2236;
          border: 1px solid #323A50;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        .stat-card strong {
          display: block;
          font-size: 2rem;
          color: #C9A15B;
          font-family: "Marcellus", Georgia, serif;
        }
        .stat-card span { color: #ADA394; font-size: .85rem; }
        .filters {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .filter-btn {
          padding: 6px 16px;
          border-radius: 20px;
          border: 1px solid #323A50;
          background: transparent;
          color: #ADA394;
          cursor: pointer;
          font-size: .85rem;
          font-family: inherit;
        }
        .filter-btn.active {
          background: #C9A15B;
          color: #121827;
          border-color: #C9A15B;
        }
        .enquiry-table {
          width: 100%;
          border-collapse: collapse;
        }
        .enquiry-table th {
          text-align: left;
          padding: 12px 16px;
          border-bottom: 1px solid #323A50;
          color: #ADA394;
          font-size: .8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .enquiry-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #1e2640;
          font-size: .9rem;
          vertical-align: top;
        }
        .enquiry-table tr:hover td { background: rgba(201,161,91,.04); }
        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: .75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .actions { display: flex; gap: 6px; }
        .action-btn {
          padding: 4px 10px;
          border-radius: 4px;
          border: 1px solid #323A50;
          background: transparent;
          color: #ADA394;
          cursor: pointer;
          font-size: .75rem;
          font-family: inherit;
        }
        .action-btn:hover { border-color: #C9A15B; color: #C9A15B; }
        .action-btn.danger:hover { border-color: #C95B5B; color: #C95B5B; }
        .empty {
          text-align: center;
          padding: 60px 20px;
          color: #665C50;
        }
        .empty h3 { font-family: "Marcellus", Georgia, serif; font-weight: 400; }
        @media (max-width: 768px) {
          .admin-body { padding: 16px; }
          .enquiry-table { display: block; overflow-x: auto; }
        }
      `}</style>

      <div className="admin-header">
        <h1>Hotel Ganga Imperial - Admin</h1>
        <a href="/">View Website</a>
      </div>

      <div className="admin-body">
        <div className="admin-tabs">
          <button
            className={`admin-tab${tab === "enquiries" ? " active" : ""}`}
            onClick={() => setTab("enquiries")}
          >
            Enquiries ({enquiries.length})
          </button>
          <button
            className={`admin-tab${tab === "stats" ? " active" : ""}`}
            onClick={() => setTab("stats")}
          >
            Dashboard
          </button>
        </div>

        {tab === "stats" && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <strong>{stats.total}</strong>
                <span>Total Enquiries</span>
              </div>
              <div className="stat-card">
                <strong>{stats.new}</strong>
                <span>New</span>
              </div>
              <div className="stat-card">
                <strong>{stats.contacted}</strong>
                <span>Contacted</span>
              </div>
              <div className="stat-card">
                <strong>{stats.confirmed}</strong>
                <span>Confirmed</span>
              </div>
              <div className="stat-card">
                <strong>{stats.cancelled}</strong>
                <span>Cancelled</span>
              </div>
            </div>
            <div className="stat-card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: '"Marcellus", Georgia, serif', fontWeight: 400, marginBottom: 12 }}>
                Enquiries by Type
              </h3>
              {Array.from(new Set(enquiries.map((e) => e.type))).map((type) => {
                const count = enquiries.filter((e) => e.type === type).length;
                return (
                  <div key={type} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #323A50" }}>
                    <span>{type}</span>
                    <strong style={{ color: "#C9A15B" }}>{count}</strong>
                  </div>
                );
              })}
              {enquiries.length === 0 && <p style={{ color: "#665C50" }}>No data yet</p>}
            </div>
          </>
        )}

        {tab === "enquiries" && (
          <>
            <div className="filters">
              {["all", "new", "contacted", "confirmed", "cancelled"].map((f) => (
                <button
                  key={f}
                  className={`filter-btn${filter === f ? " active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== "all" && ` (${stats[f as keyof typeof stats]})`}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="empty"><p>Loading enquiries...</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <h3>No enquiries yet</h3>
                <p>Enquiries submitted through the website will appear here.</p>
              </div>
            ) : (
              <table className="enquiry-table">
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
                  {filtered
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((enq) => (
                      <tr key={enq.id}>
                        <td>{new Date(enq.createdAt).toLocaleDateString()}</td>
                        <td>
                          {enq.name}
                          {enq.email && <br />}
                          {enq.email && <small style={{ color: "#ADA394" }}>{enq.email}</small>}
                        </td>
                        <td>{enq.phone}</td>
                        <td>{enq.type}</td>
                        <td>
                          {enq.checkin}
                          {enq.checkout && ` to ${enq.checkout}`}
                        </td>
                        <td>{enq.guests}</td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              background: `${STATUS_COLORS[enq.status]}22`,
                              color: STATUS_COLORS[enq.status],
                            }}
                          >
                            {enq.status}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <select
                              value={enq.status}
                              onChange={(e) => updateStatus(enq.id, e.target.value as Enquiry["status"])}
                              className="action-btn"
                              style={{ background: "#1B2236", color: "#ADA394" }}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button
                              className="action-btn danger"
                              onClick={() => deleteEnquiry(enq.id)}
                            >
                              Delete
                            </button>
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
