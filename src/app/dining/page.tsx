import { canonical } from "@/lib/seo";
import InteriorShell from "@/components/InteriorShell";
import Dining from "@/components/Dining";
import { getDiningOptions } from "@/lib/db";
export const revalidate = 300;
export const metadata = {
  ...canonical("/dining"),
  title: "Dining & menu | Hotel Ganga Imperial",
  description:
    "Breakfast to candlelit dinners prepared by our in-house chefs. Browse the menu and ask about dining or event catering.",
};
export default async function Page() {
  const options = await getDiningOptions();
  return (
    <InteriorShell>
      <div className="wrap page-intro">
        <span className="eyebrow">HOTEL GANGA IMPERIAL</span>
        <h1>Dining & menu</h1>
        <p>Explore the options below. Prices and inclusions are indicative and subject to hotel confirmation.</p>
      </div>
      <Dining options={options} />
    </InteriorShell>
  );
}
