import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Hotel Ganga Imperial",
  description: "Admin dashboard for Hotel Ganga Imperial",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
