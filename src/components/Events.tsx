import Image from "next/image";
import { PHOTOS } from "@/lib/config";
import type { BanquetPackage } from "@/lib/types";

const photo = PHOTOS.banquet;

// In preview mode (homepage) only the introduction is shown; /celebrations passes the packages.
export default function Events({ packages = [], preview = false }: { packages?: BanquetPackage[]; preview?: boolean }) {
  const active = packages.filter(p => p.active);
  return (
    <section id="events">
      <div className="wrap events">
        <div>
          <h2>Banquet hall</h2>
          <p style={{ marginTop: 24 }}>
            A grand, chandeliered hall for weddings, receptions, corporate events and family functions. The space seats
            up to 300 guests and includes in-house catering, AV equipment and dedicated event coordination.
          </p>
          <p>Share your date and guest count and the team will come back with availability.</p>
          <a className="btn btn-solid" href="/book?type=banquet">
            Enquire about events
          </a>
        </div>
        <div className="media">
          <Image src={photo.src} alt={photo.caption} width={600} height={450} loading={preview ? "lazy" : "eager"} />
          {photo.sample && <span className="chip">Representative photo</span>}
        </div>
      </div>

      {preview && (
        <div className="wrap section-action">
          <a className="text-action" href="/celebrations">
            Explore celebration packages <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
      {!preview && active.length > 0 && (
        <div className="wrap">
          <div className="head" style={{ marginTop: 48 }}>
            <h2>Banquet Packages</h2>
            <p>Choose a package that fits your celebration. All packages include hall rental and coordination.</p>
          </div>
          <div className="banquet-grid">
            {active.map(pkg => (
              <div key={pkg.id} className="banquet-card">
                <div className="banquet-price">{pkg.price}</div>
                <h3>{pkg.name}</h3>
                <p className="banquet-cap">{pkg.capacity}</p>
                <p>{pkg.description}</p>
                {pkg.includes.length > 0 && (
                  <ul className="banquet-includes">
                    {pkg.includes.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
                <a
                  className="btn btn-solid"
                  href={"/book?type=banquet&package=" + encodeURIComponent("Banquet - " + pkg.name)}
                >
                  Enquire about events
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
