"use client";

import Image from "next/image";
import { SITE_CONFIG } from "@/lib/config";

export default function Rooms() {
  return (
    <section className="rooms" id="rooms">
      <div className="wrap">
        <div className="head">
          <h2>Rooms</h2>
          <p>Each room is designed for comfort, with marble flooring, cove lighting and a city view.</p>
        </div>
        <div className="room-grid">
          <div className="room-photo" data-reveal>
            <Image src="/images/image-10.jpeg" alt="Room interior" width={600} height={400} />
          </div>
          <div className="room-photo" data-reveal>
            <Image src="/images/image-11.jpeg" alt="Room detail" width={600} height={400} />
          </div>
          <div className="room-photo wide" data-reveal>
            <Image src="/images/image-12.jpeg" alt="Room view" width={800} height={400} />
          </div>
        </div>

        <div className="head types-head">
          <h2>Room types</h2>
          <p>Rates depend on dates and availability. Choose a room and send an enquiry.</p>
        </div>
        <div className="types">
          {SITE_CONFIG.rooms.map((room, i) => (
            <article key={i} className="rcard" data-reveal>
              <div className="rcard-in">
                <figure>
                  <Image src={room.image} alt={room.name} width={400} height={300} />
                  {room.sample && <span className="chip">Sample photo</span>}
                </figure>
                <div className="rcard-body">
                  <h3>{room.name}</h3>
                  <p>{room.text}</p>
                  <div className="rcard-foot">
                    <span>{room.rate || "Rate on request"}</span>
                    <a href="#enquire">Enquire</a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="room-note">
          <p>All rooms include complimentary Wi-Fi, daily housekeeping and 24-hour room service.</p>
        </div>
      </div>
    </section>
  );
}
