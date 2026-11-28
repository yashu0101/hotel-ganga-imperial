import { canonical } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import InteriorShell from "@/components/InteriorShell";
import ContactActions from "@/components/ContactActions";
import { AMENITY_LIST } from "@/components/Amenities";
import { getRooms, getSettings } from "@/lib/db";
import { PHOTOS } from "@/lib/config";
import { roomFacts } from "@/lib/hotel-content";
import Icon from "@/components/Icon";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getRooms()).filter(r => !r.hidden).map(r => ({ slug: r.slug }));
}

/** Visible rooms, and the one at this address: its current slug, or one it had before staff changed it. */
async function roomFor(slug: string) {
  const rooms = (await getRooms()).filter(r => !r.hidden);
  const room = rooms.find(r => r.slug === slug) ?? rooms.find(r => r.previousSlugs?.includes(slug));
  return { rooms, room };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { room } = await roomFor(slug);
  return {
    title: (room?.name || "Room") + " | Hotel Ganga Imperial",
    description: room?.text,
    ...canonical("/rooms/" + (room?.slug || slug)),
  };
}

// How a request becomes a specific room. Reservations are requests: nothing is held until the hotel confirms.
const ALLOCATION_STEPS = [
  {
    title: "You send a request",
    text: "Choose your dates, number of rooms and guests. Add any preferences, such as a higher floor, a quieter room or rooms next to each other.",
  },
  {
    title: "The hotel checks availability",
    text: "Staff review your dates and match you to suitable rooms of this type. Preferences are considered but can’t be guaranteed.",
  },
  {
    title: "You receive a confirmed quote",
    text: "The hotel replies with the final rate including taxes, what’s included, and the terms for your stay. Nothing is reserved until the hotel confirms it.",
  },
  {
    title: "Your room number at check-in",
    text: "The exact room, and its floor, is assigned at reception when you arrive. Show your identification and the hotel will hand you your key.",
  },
];

// Hotel-wide facilities; "Premium rooms" is the room itself, so it is left out here.
const FACILITIES = AMENITY_LIST.filter(a => a.label !== "Premium rooms");

export default async function RoomDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { rooms, room } = await roomFor(slug);
  if (!room) notFound();
  // An address the room had before staff changed it: send guests (and search engines) to the current one.
  if (room.slug !== slug) permanentRedirect("/rooms/" + room.slug);
  const info = await getSettings();
  const facts = roomFacts(room);
  const inclusions = room.inRoom.length || room.services.length ? room : null;
  const highlights = inclusions ? [...inclusions.inRoom, ...inclusions.services].slice(0, 4) : [];
  const others = rooms.filter(r => r.slug !== room.slug).slice(0, 3);
  const bookHref = "/book?room=" + encodeURIComponent(room.slug);
  const policies = (
    [
      ["Check-in", info.checkIn],
      ["Check-out", info.checkOut],
      ["Children & extra beds", info.children],
      ["Cancellation", info.cancellation],
      ["Identification", info.identification],
    ] as const
  ).filter(([, value]) => value.trim());

  return (
    <InteriorShell>
      <div className="wrap room-detail">
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/rooms">Rooms</Link>
            </li>
            <li aria-current="page">{room.name}</li>
          </ol>
        </nav>

        <div className="room-detail-grid">
          <figure className="detail-photograph">
            <Image
              src={room.image}
              alt={room.sample ? "Representative imagery for " + room.name : room.name}
              width={1000}
              height={750}
              sizes="(max-width:900px) 100vw, 55vw"
              preload
              loading="eager"
            />
            {room.sample && <span className="chip">Representative photo</span>}
            {room.sample && <figcaption>Your room’s layout and furnishings may differ.</figcaption>}
          </figure>

          <aside className="room-summary" aria-label={room.name + " summary"}>
            <span className="eyebrow">YOUR QUIET RETREAT</span>
            <h1>{room.name}</h1>
            <p>{room.text}</p>
            {highlights.length > 0 && (
              <ul className="room-highlights" aria-label="Highlights">
                {highlights.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <div className="detail-rate">
              <small>Indicative nightly rate, before taxes</small>
              <strong>{room.rate || "On request"}</strong>
            </div>
            <Link className="btn btn-solid" href={bookHref} data-reserve-cta>
              Request this room <Icon name="arrow-right" position="end" />
            </Link>
            <ContactActions message={`Hello, I'd like to ask about the ${room.name}.`} />
            <p className="small-note">
              Sending a request doesn’t reserve a room. Availability, inclusions and the final price are confirmed by
              the hotel.
            </p>
          </aside>
        </div>

        <section className="room-section" aria-labelledby="included-heading">
          <span className="eyebrow">WHAT COMES WITH THIS ROOM</span>
          <h2 id="included-heading">Included in your stay</h2>
          {inclusions ? (
            <div className="inclusion-columns">
              {(
                [
                  ["In the room", inclusions.inRoom],
                  ["Services & extras", inclusions.services],
                ] as const
              )
                .filter(([, items]) => items.length)
                .map(([title, items]) => (
                  <div key={title}>
                    <h3>{title}</h3>
                    <ul className="inclusion-list">
                      {items.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          ) : (
            <p className="page-lead">{room.text}</p>
          )}
          <p className="small-note">
            Inclusions are confirmed in your quote and may depend on your dates or rate. Ask the hotel if something
            matters to you.
          </p>
        </section>

        <section className="room-section" aria-labelledby="facts-heading">
          <span className="eyebrow">THE PRACTICAL DETAILS</span>
          <h2 id="facts-heading">Room facts</h2>
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
              Room size, bed set-up, occupancy and where your room is in the hotel are confirmed in the hotel’s reply to
              your request.
            </p>
          )}
        </section>

        <section className="room-section allocation" aria-labelledby="allocation-heading">
          <span className="eyebrow">HOW YOUR ROOM IS ALLOCATED</span>
          <h2 id="allocation-heading">From request to room key</h2>
          <p className="page-lead">
            You request a room type, not a specific room. The hotel allocates the room that suits your dates and party
            best.
          </p>
          <ol className="allocation-steps">
            {ALLOCATION_STEPS.map((step, i) => (
              <li key={step.title}>
                <span aria-hidden="true">0{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="room-section" aria-labelledby="facilities-heading">
          <span className="eyebrow">AROUND THE HOTEL</span>
          <h2 id="facilities-heading">Beyond your room</h2>
          <ul className="facility-list">
            {FACILITIES.map(a => (
              <li key={a.label}>
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  <path d={a.icon} />
                  {a.circle && <circle cx="16" cy="25" r="1.5" />}
                </svg>
                {a.label}
              </li>
            ))}
          </ul>
          <p className="small-note">Opening hours and any charges for facilities are confirmed by the hotel.</p>
        </section>

        {policies.length > 0 && (
          <section className="room-section" aria-labelledby="policies-heading">
            <span className="eyebrow">GOOD TO KNOW</span>
            <h2 id="policies-heading">Stay policies</h2>
            <dl className="room-policies">
              {policies.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <Link className="text-action" href="/guest-information">
              Read the full guest guide <Icon name="arrow-right" position="end" />
            </Link>
          </section>
        )}

        <section className="room-section detail-gallery" aria-labelledby="gallery-heading">
          <span className="eyebrow">A CLOSER LOOK</span>
          <h2 id="gallery-heading">Room style and interiors</h2>
          <div>
            {/* Not the hero photo again: show interiors the page has not used yet. */}
            {[PHOTOS.roomDetail, PHOTOS.lobby]
              .filter(photo => photo.src !== room.image)
              .map(photo => (
                <Image
                  key={photo.src}
                  src={photo.src}
                  alt={photo.sample ? "Representative photo: " + photo.caption.toLowerCase() : photo.caption}
                  width={700}
                  height={500}
                  sizes="(max-width:700px) 100vw, 50vw"
                />
              ))}
          </div>
          <p className="small-note">
            Representative photos of our room style and interiors. Ask the hotel about your specific room.
          </p>
        </section>

        {others.length > 0 && (
          <section className="room-section" aria-labelledby="others-heading">
            <span className="eyebrow">KEEP EXPLORING</span>
            <h2 id="others-heading">Other rooms</h2>
            <ul className="other-rooms">
              {others.map(r => (
                <li key={r.slug}>
                  <Link href={"/rooms/" + r.slug}>
                    <Image
                      src={r.image}
                      alt={r.sample ? "Representative imagery for " + r.name : r.name}
                      width={480}
                      height={340}
                      sizes="(max-width:600px) 100vw, 33vw"
                    />
                    <strong>{r.name}</strong>
                    <small>{r.rate ? r.rate + " · indicative" : "Rate on request"}</small>
                  </Link>
                </li>
              ))}
            </ul>
            <Link className="text-action" href="/rooms">
              Compare all rooms <Icon name="arrow-right" position="end" />
            </Link>
          </section>
        )}

        <section className="room-cta" aria-labelledby="cta-heading">
          <h2 id="cta-heading">Like the look of the {room.name}?</h2>
          <p>Send your dates and the hotel will reply with availability and a quote. No payment is taken online.</p>
          <Link className="btn btn-solid" href={bookHref}>
            Request this room <Icon name="arrow-right" position="end" />
          </Link>
        </section>
      </div>
    </InteriorShell>
  );
}
