import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin - Hotel Ganga Imperial",
  description: "Admin dashboard for Hotel Ganga Imperial",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
