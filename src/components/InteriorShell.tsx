import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import MotionEffects from "@/components/MotionEffects";
import MobileReserve from "@/components/MobileReserve";
import Footer from "@/components/Footer";

const PAGES = [
  { href: "/rooms", label: "Rooms" },
  { href: "/dining", label: "Dining" },
  { href: "/celebrations", label: "Celebrations" },
  { href: "/guest-information", label: "Guest guide" },
  { href: "/contact", label: "Contact" },
];

export default function InteriorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="interior-page">
      <MotionEffects />
      <a className="skip" href="#page-content">
        Skip to content
      </a>
      <header className="interior-header">
        <Link className="wordmark" href="/">
          <small>Hotel</small>Ganga Imperial
        </Link>
        <nav aria-label="Hotel pages">
          {PAGES.map(page => (
            <Link key={page.href} href={page.href}>
              {page.label}
            </Link>
          ))}
        </nav>
        <div className="interior-actions">
          <ThemeToggle />
          <Link className="btn btn-solid interior-cta" href="/book" data-reserve-cta>
            Request a reservation
          </Link>
        </div>
      </header>
      <main id="page-content">{children}</main>
      <Footer />
      <MobileReserve />
    </div>
  );
}
