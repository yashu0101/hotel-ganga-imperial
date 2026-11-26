import Image from "next/image";
import type { DiningOption } from "@/lib/types";

// In preview mode (homepage) only the introduction is shown; /dining passes the menu options.
export default function Dining({ options = [], preview = false }: { options?: DiningOption[]; preview?: boolean }) {
  const active = options.filter(d => d.active);
  return (
    <section className="dining" id="dining">
      <div className="wrap fan-wrap">
        <div>
          <h2>Dining</h2>
          <p style={{ marginTop: 24 }}>
            From a hearty breakfast to a candlelit dinner, every meal is prepared fresh by our in-house chefs.
          </p>
          <a className="btn btn-solid" href="/book?type=dining">
            Ask about dining
          </a>
        </div>
        <div className="fan">
          <figure>
            <Image src="/images/image-51.jpeg" alt="Restaurant" width={380} height={475} loading="lazy" />
            <figcaption>Restaurant</figcaption>
          </figure>
        </div>
      </div>

      {preview && (
        <div className="wrap section-action">
          <a className="text-action" href="/dining">
            Explore dining & menu ↗
          </a>
        </div>
      )}
      {!preview && active.length > 0 && (
        <div className="wrap">
          <div className="head" style={{ marginTop: 48 }}>
            <h2>Menu & Pricing</h2>
            <p>Fresh, seasonal meals prepared by our in-house chefs.</p>
          </div>
          <div className="dining-grid">
            {active.map(opt => (
              <div key={opt.id} className="dining-card card-lift">
                <div className="dining-cat">{opt.category.replace("-", " ")}</div>
                <h3>{opt.name}</h3>
                <p>{opt.description}</p>
                <div className="dining-price">{opt.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
