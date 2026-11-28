import { canonical } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import InteriorShell from "@/components/InteriorShell";
import Rooms from "@/components/Rooms";
import { getRooms } from "@/lib/db";
import Icon from "@/components/Icon";

export const revalidate = 300;
export const metadata = {
  ...canonical("/rooms"),
  title: "Rooms & suites | Hotel Ganga Imperial",
  description: "Compare room preferences, indicative rates and the details to confirm before your stay.",
};
// Comparison columns appear only once at least one room has an approved value for them.
const COMPARE_COLUMNS = [
  ["size", "Room size"],
  ["bed", "Bed"],
  ["occupancy", "Occupancy"],
] as const;
export default async function RoomsPage() {
  const rooms = (await getRooms()).filter(r => !r.hidden);
  const columns = COMPARE_COLUMNS.filter(([key]) => rooms.some(r => r[key]?.trim()));
  return (
    <InteriorShell>
      <div className="page-intro wrap">
        <Link className="back-inline" href="/">
          <Icon name="arrow-left" position="start" />
          The hotel
        </Link>
        <span className="eyebrow">A SPACE OF YOUR OWN</span>
        <h1>Choose your kind of comfort.</h1>
        <p>
          Compare our room preferences, then tell us your dates. We will confirm the room details and final quote before
          you book.
        </p>
      </div>
      <Rooms rooms={rooms} showHeading={false} />
      <section className="wrap compare-section">
        <span className="eyebrow">AT A GLANCE</span>
        <h2>Find the right fit</h2>
        <p className="section-note">
          Rates are indicative and before taxes. Room size, bed set-up and occupancy for your dates are confirmed in the
          hotel’s reply.
        </p>
        <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Room comparison table">
          <table className="room-comparison">
            <caption>Compare room preferences and indicative nightly rates</caption>
            <thead>
              <tr>
                <th scope="col">Room</th>
                <th scope="col">Nightly rate</th>
                {columns.map(([key, label]) => (
                  <th key={key} scope="col">
                    {label}
                  </th>
                ))}
                <th scope="col">Explore</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(r => (
                <tr key={r.slug}>
                  <th scope="row">
                    <Image src={r.image} alt="" width={80} height={60} />
                    {r.name}
                  </th>
                  <td>{r.rate || "On request"}</td>
                  {columns.map(([key]) => (
                    <td key={key}>{r[key]?.trim() || "On request"}</td>
                  ))}
                  <td>
                    <Link href={"/rooms/" + r.slug}>
                      View details <Icon name="arrow-right" position="end" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </InteriorShell>
  );
}
