import { NAV_ITEMS } from "@/lib/config";

export default function Footer() {
  return (
    <footer style={{ paddingTop: 0 }}>
      <div className="foot-strip" />
      <div style={{ height: 56 }} />
      <div className="wrap">
        <div>
          <div className="wordmark" style={{ textShadow: "none" }}>
            <small>Hotel</small>Ganga Imperial
          </div>
          <p style={{ margin: "14px 0 0" }}>
            &copy; {new Date().getFullYear()} Hotel Ganga Imperial
          </p>
        </div>
        <nav aria-label="Footer">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
          <a href="#enquire">Enquire</a>
        </nav>
      </div>
    </footer>
  );
}
