"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/admin");
      } else {
        setError(data.error || "Login failed.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          min-height: 100vh;
          background: #0f1320;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: "Mulish", system-ui, sans-serif;
          padding: 20px;
        }
        .login-card {
          background: #1B2236;
          border: 1px solid #323A50;
          border-radius: 12px;
          padding: 48px 40px;
          width: 100%;
          max-width: 400px;
        }
        .login-card h1 {
          font-family: "Marcellus", Georgia, serif;
          font-weight: 400;
          font-size: 1.6rem;
          color: #C9A15B;
          text-align: center;
          margin: 0 0 8px;
        }
        .login-card .subtitle {
          text-align: center;
          color: #ADA394;
          font-size: .85rem;
          margin-bottom: 32px;
        }
        .login-card label {
          display: block;
          color: #ADA394;
          font-size: .85rem;
          margin-bottom: 6px;
        }
        .login-card input {
          width: 100%;
          padding: 12px 16px;
          background: #121827;
          border: 1px solid #323A50;
          border-radius: 6px;
          color: #EDE6DA;
          font: inherit;
          font-size: .95rem;
          margin-bottom: 20px;
          box-sizing: border-box;
        }
        .login-card input:focus {
          outline: none;
          border-color: #C9A15B;
        }
        .login-btn {
          width: 100%;
          padding: 14px;
          background: #C9A15B;
          color: #121827;
          border: none;
          border-radius: 6px;
          font: inherit;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background .2s;
        }
        .login-btn:hover { background: #E2C68E; }
        .login-btn:disabled { opacity: .6; cursor: not-allowed; }
        .login-error {
          background: rgba(201,91,91,.15);
          border: 1px solid rgba(201,91,91,.4);
          color: #E88;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: .85rem;
          margin-bottom: 16px;
          text-align: center;
        }
        .login-logo {
          text-align: center;
          margin-bottom: 32px;
        }
        .login-logo small {
          display: block;
          font-size: .6rem;
          letter-spacing: .4em;
          color: #ADA394;
        }
        .login-logo span {
          font-family: "Marcellus", Georgia, serif;
          color: #F4E6C6;
          font-size: 1.1rem;
          letter-spacing: .14em;
        }
        .back-link {
          display: block;
          text-align: center;
          margin-top: 20px;
          color: #665C50;
          font-size: .85rem;
          text-decoration: none;
        }
        .back-link:hover { color: #C9A15B; }
      `}</style>

      <div className="login-card">
        <div className="login-logo">
          <small>Hotel</small>
          <span>Ganga Imperial</span>
        </div>
        <h1>Admin Login</h1>
        <p className="subtitle">Sign in to manage your hotel</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@gangaimperial.com"
            required
            autoFocus
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <a href="/" className="back-link">Back to website</a>
      </div>
    </div>
  );
}
