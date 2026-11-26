import Image from "next/image";
import Link from "next/link";
import { roomSlug, roomPhoto } from "@/lib/hotel-content";
import type { Room } from "@/lib/types";

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
        {showHeading && (
          <>
            <span className="eyebrow">MAKE YOURSELF AT HOME</span>
            <div className="head">
              <h2>Find your kind of comfort</h2>
              <p>Rates depend on dates and availability. Choose a room and send an enquiry.</p>
            </div>
          </>
        )}
        <div className="stay-grid">
          {(preview ? rooms.slice(0, 2) : rooms).map((room, i) => (
            <article className="stay-card" key={room.name}>
              <div className="stay-photo">
                <Image
                  src={roomPhoto(room)}
                  alt={room.sample ? "Representative imagery for " + room.name : room.name}
                  width={640}
                  height={440}
                  sizes="(max-width:700px) 100vw, 50vw"
                />
                {room.sample && (
                  <span className="chip">
                    {room.name === "Family Room" ? "Room illustration" : "Representative photo"}
                  </span>
                )}
                <span className="room-number">0{i + 1}</span>
              </div>
              <div className="stay-body">
                <h3>{room.name}</h3>
                <p>{room.text}</p>
                <Link className="room-details-link" href={"/rooms/" + roomSlug(room.name)}>
                  Room details & practical information ↗
                </Link>
                <div className="stay-price">
                  <div>
                    <small>Indicative nightly rate</small>
                    <strong>{room.rate || "On request"}</strong>
                  </div>
                  <Link href={"/book?room=" + encodeURIComponent(room.name)}>
                    Request this room <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        {preview && (
          <div className="section-action">
            <Link className="btn btn-solid" href="/rooms">
              Explore all rooms & compare ↗
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
