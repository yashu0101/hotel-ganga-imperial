import { canonical } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import InteriorShell from "@/components/InteriorShell";
import { getRooms } from "@/lib/db";
import { ROOM_SPECIFICATIONS, roomFacts, roomSlug, roomPhoto } from "@/lib/hotel-content";
export const revalidate = 300;
export async function generateStaticParams() {
  return (await getRooms()).filter(r => !r.hidden).map(r => ({ slug: roomSlug(r.name) }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = (await getRooms()).find(r => !r.hidden && roomSlug(r.name) === slug);
  return {
    title: (room?.name || "Room") + " | Hotel Ganga Imperial",
    description: room?.text,
    ...canonical("/rooms/" + slug),
  };
}
export default async function RoomDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = (await getRooms()).find(r => !r.hidden && roomSlug(r.name) === slug);
  if (!room) notFound();
  const facts = roomFacts(ROOM_SPECIFICATIONS[room.name]);
  return (
    <InteriorShell>
      <div className="wrap room-detail">
        <Link className="back-inline" href="/rooms">
          ← All rooms & comparison
        </Link>
        <div className="room-detail-grid">
          <div className="detail-photograph">
            <Image
              src={roomPhoto(room)}
              alt={room.sample ? "Representative room imagery" : room.name}
              width={1000}
              height={750}
              sizes="(max-width:900px) 100vw, 55vw"
              preload
            />
            {room.sample && <p>Representative photo. Your room’s layout and furnishings may differ.</p>}
          </div>
          <div>
            <span className="eyebrow">YOUR QUIET RETREAT</span>
            <h1>{room.name}</h1>
            <p>{room.text}</p>
            <div className="detail-rate">
              <small>Indicative nightly rate, before taxes</small>
              <strong>{room.rate || "On request"}</strong>
            </div>
            <Link className="btn btn-solid" href={"/book?room=" + encodeURIComponent(room.name)}>
              Request this room ↗
            </Link>
            <p className="small-note">
              Availability, occupancy, inclusions and final pricing are confirmed by the hotel.
            </p>
          </div>
        </div>
        <section className="room-practical">
          <h2>The practical details</h2>
          {facts.length > 0 ? (
            <dl className="spec-grid">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="page-lead">
              Room size, bed set-up and occupancy for your dates are confirmed in the hotel’s reply to your request.
            </p>
          )}
          <div className="decision-note">
            <h3>Before you reserve</h3>
            <p>
              Ask the hotel to confirm the room layout, breakfast inclusion, extra beds, accessibility and cancellation
              conditions for your dates.
            </p>
            <Link href="/guest-information">Read the guest guide ↗</Link>
          </div>
        </section>
        <section className="detail-gallery">
          <h2>A closer look</h2>
          <p className="small-note">
            Representative photos of our room style and interiors. Ask the hotel about your specific room.
          </p>
          <div>
            {[roomPhoto(room), "/images/image-52.jpeg"].map((src, i) => (
              <Image
                key={src + i}
                src={src}
                alt={i === 0 ? "Representative room view" : "Representative interior detail"}
                width={700}
                height={500}
                sizes="(max-width:700px) 100vw, 50vw"
              />
            ))}
          </div>
        </section>
      </div>
    </InteriorShell>
  );
}
