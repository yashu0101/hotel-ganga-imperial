import Image from "next/image";

export default function Events() {
  return (
    <section id="events">
      <div className="wrap events">
        <div className="events-text" data-reveal>
          <h2>Banquet hall</h2>
          <p>
            A grand, chandeliered hall for weddings, receptions, corporate
            events and family functions. The space seats up to 300 guests
            and includes in-house catering, AV equipment and dedicated
            event coordination.
          </p>
          <a className="btn btn-solid" href="#enquire">Enquire about events</a>
        </div>
        <div className="events-img" data-reveal>
          <Image src="/images/image-13.jpeg" alt="Banquet hall" width={600} height={400} />
        </div>
      </div>
    </section>
  );
}
