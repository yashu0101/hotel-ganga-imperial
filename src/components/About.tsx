export default function About() {
  return (
    <section id="about">
      <div className="wrap intro">
        <h2>Where marble meets warmth</h2>
        <p>
          Hotel Ganga Imperial is a premium stay in the heart of the city.
          Every floor is finished in polished marble and brass, with cove-lit
          corridors that lead to spacious, thoughtfully designed rooms.
        </p>
        <p>
          Above the city, a rooftop swimming pool catches the morning light
          while the spa and gym sit one floor below. On the ground level,
          a chandeliered banquet hall opens its doors for weddings,
          receptions and family celebrations.
        </p>
        <div className="stat-row" data-reveal>
          <div className="stat">
            <strong>4+</strong>
            <span>Room types</span>
          </div>
          <div className="stat">
            <strong>1</strong>
            <span>Rooftop pool</span>
          </div>
          <div className="stat">
            <strong>24/7</strong>
            <span>Security</span>
          </div>
          <div className="stat">
            <strong>1</strong>
            <span>Banquet hall</span>
          </div>
        </div>
      </div>
    </section>
  );
}
