export default function Dining() {
  return (
    <section className="dining" id="dining">
      <div className="wrap fan-wrap">
        <div className="head">
          <h2>Dining</h2>
          <p>From a hearty breakfast to a candlelit dinner, every meal is prepared fresh by our in-house chefs.</p>
        </div>
        <div className="dining-features" data-reveal>
          <div className="dining-card">
            <h3>Breakfast</h3>
            <p>A buffet of Indian and continental options to start your day.</p>
          </div>
          <div className="dining-card">
            <h3>Room service</h3>
            <p>Order from the full menu, delivered to your door any time.</p>
          </div>
          <div className="dining-card">
            <h3>Evening dining</h3>
            <p>A relaxed restaurant with seasonal menus and local specialties.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
