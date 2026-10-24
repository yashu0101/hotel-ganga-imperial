"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/context";

interface Review {
  id: string; name: string; rating: number; text: string; city: string; active: boolean;
}

export default function Reviews() {
  const { t } = useApp();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch("/api/reviews").then(r => r.json()).then((data: Review[]) => {
      setReviews(data.filter(r => r.active));
    }).catch(() => {});
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="reviews-sec" id="reviews">
      <div className="wrap">
        <div className="head">
          <div>
            <h2>{t("reviews.title")}</h2>
            <p>{t("reviews.subtitle")}</p>
          </div>
        </div>
        <div className="reviews-grid">
          {reviews.map(r => (
            <div key={r.id} className="review-card">
              <div className="review-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              <p className="review-text">&ldquo;{r.text}&rdquo;</p>
              <div className="review-author">
                <strong>{r.name}</strong>
                {r.city && <span>{r.city}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
