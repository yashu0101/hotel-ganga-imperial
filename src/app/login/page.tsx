"use client";
import Link from "next/link";

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
      <div className="login-card">
        <div className="login-logo">
          <small>Hotel</small>
          <span>Ganga Imperial</span>
        </div>
        <h1>Admin Login</h1>
        <p className="subtitle">Sign in to manage your hotel</p>

        {/* Always mounted so screen readers announce wrong-password and rate-limit messages when they appear. */}
        <div role="alert" aria-live="assertive">
          {error && (
            <div className="login-error" id="login-error">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "login-error" : undefined}
            autoFocus
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            required
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <Link href="/" className="back-link">
          Back to website
        </Link>
      </div>
    </div>
  );
}
