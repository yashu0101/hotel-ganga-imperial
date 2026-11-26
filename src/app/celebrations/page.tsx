import { canonical } from "@/lib/seo";
import InteriorShell from "@/components/InteriorShell";
import Events from "@/components/Events";
import { getBanquetPackages } from "@/lib/db";
export const revalidate = 300;
export const metadata = {
  ...canonical("/celebrations"),
  title: "Celebrations & banquet packages | Hotel Ganga Imperial",
  description:
    "Weddings, receptions and corporate events for up to 300 guests, with in-house catering and event coordination. Compare banquet packages.",
};
export default async function Page() {
  const packages = await getBanquetPackages();
  return (
    <InteriorShell>
      <div className="wrap page-intro">
        <span className="eyebrow">HOTEL GANGA IMPERIAL</span>
        <h1>Celebrations & banquet packages</h1>
        <p>Explore the options below. Prices and inclusions are indicative and subject to hotel confirmation.</p>
      </div>
      <Events packages={packages} />
    </InteriorShell>
  );
}
