import Image from "next/image";

const amenities = [
  { icon: "pool", title: "Rooftop Swimming Pool", text: "An open-air pool on the top floor with skyline views." },
  { icon: "spa", title: "Spa", text: "Professional treatments to unwind after a long day." },
  { icon: "gym", title: "Fitness Gym", text: "Modern equipment available round the clock." },
  { icon: "lounge", title: "Club Lounge", text: "A quiet space to work, read or meet over coffee." },
  { icon: "security", title: "24/7 Security", text: "CCTV surveillance and trained staff at every entrance." },
];

export default function Amenities() {
  return (
    <section className="amen" id="amenities">
      <div className="wrap">
        <div className="head">
          <h2>Amenities</h2>
          <p>Everything you need for a comfortable and complete stay.</p>
        </div>
        <div className="amen-feature">
          <div className="amen-img" data-reveal>
            <Image src="/images/image-8.jpeg" alt="Rooftop pool" width={600} height={400} />
          </div>
          <div className="amen-text" data-reveal>
            <h3>Rooftop swimming pool</h3>
            <p>
              The pool sits on the top floor, open to the sky. Swim in the morning
              light or float under the stars. Towels, loungers and a poolside bar
              are all included.
            </p>
          </div>
        </div>
        <div className="amen-grid">
          {amenities.map((item, i) => (
            <div key={i} className="amen-card" data-reveal>
              <div className="amen-icon" data-icon={item.icon} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
