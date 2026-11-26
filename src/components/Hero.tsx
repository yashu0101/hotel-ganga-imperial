import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="hero" id="home" aria-label="Welcome">
      <div className="hero-inner">
        <span className="eyebrow">HOTEL GANGA IMPERIAL</span>
        <h1>
          A little grandeur.
          <br />
          <em>A warmer welcome.</em>
        </h1>
        <p>Premium rooms, a rooftop swimming pool and a banquet hall under one warmly lit roof.</p>
        <div className="btns">
          <Link className="btn btn-solid" href="/book">
            Request a stay <span aria-hidden="true">↗</span>
          </Link>
          <a className="btn btn-ghost" href="#rooms">
            See the rooms
          </a>
        </div>
        <div className="hero-details">
          <span>STAY</span>
          <span>UNWIND</span>
          <span>CELEBRATE</span>
        </div>
      </div>
      <div className="hero-media">
        <Image
          src="/images/image-43.jpeg"
          alt="Warmly illuminated Hotel Ganga Imperial exterior at night"
          fill
          sizes="(max-width:900px) 100vw, 55vw"
          preload
        />
        <span className="hero-caption">YOUR STAY BEGINS HERE</span>
      </div>
    </section>
  );
}
