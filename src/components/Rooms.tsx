import Image from "next/image";
import Link from "next/link";
import { ILLUSTRATION_IMAGES } from "@/lib/config";
import type { Room } from "@/lib/types";
import Icon from "@/components/Icon";

// Rooms are loaded once on the server by the page and passed in (visible rooms only).
export default function Rooms({
  rooms,
  preview = false,
  showHeading = true,
}: {
  rooms: Room[];
  preview?: boolean;
  showHeading?: boolean;
}) {
  return (
    <section className="rooms" id="rooms">
      <div className="wrap">
        {showHeading ? (
          <>
            <span className="eyebrow">MAKE YOURSELF AT HOME</span>
            <div className="head">
              <h2>Find your kind of comfort</h2>
              <p>Rates depend on dates and availability. Choose a room and send an enquiry.</p>
            </div>
          </>
        ) : (
          <h2 className="sr-only">Our rooms</h2>
        )}
        <div className="stay-grid">
          {(preview ? rooms.slice(0, 2) : rooms).map((room, i) => (
            <article className="stay-card" key={room.slug}>
              <div className="stay-photo">
                <Image
                  src={room.image}
                  alt={room.sample ? "Representative imagery for " + room.name : room.name}
                  width={640}
                  height={440}
                  sizes="(max-width:700px) 100vw, 50vw"
                  // On /rooms the first cards sit above the fold; on the home page they are further down.
                  loading={!preview && i < 2 ? "eager" : "lazy"}
                />
                {room.sample && (
                  <span className="chip">
                    {ILLUSTRATION_IMAGES.includes(room.image) ? "Room illustration" : "Representative photo"}
                  </span>
                )}
                <span className="room-number">0{i + 1}</span>
              </div>
              <div className="stay-body">
                <h3>{room.name}</h3>
                <p>{room.text}</p>
                <Link className="room-details-link" href={"/rooms/" + room.slug}>
                  Room details & practical information <Icon name="arrow-right" position="end" />
                </Link>
                <div className="stay-price">
                  <div>
                    <small>Indicative nightly rate</small>
                    <strong>{room.rate || "On request"}</strong>
                  </div>
                  <Link href={"/book?room=" + encodeURIComponent(room.slug)}>
                    Request this room <Icon name="arrow-right" position="end" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        {preview && (
          <div className="section-action">
            <Link className="btn btn-solid" href="/rooms">
              Explore all rooms & compare <Icon name="arrow-right" position="end" />
            </Link>
          </div>
        )}
        <p className="section-note">
          Photos are representative; room layouts may vary. Final rates, taxes, inclusions and availability are
          confirmed by the hotel before a reservation is made.
        </p>
      </div>
    </section>
  );
}
