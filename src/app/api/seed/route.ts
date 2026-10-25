import { NextResponse } from "next/server";
import { initDB } from "@/lib/db-schema";
import { neon } from "@neondatabase/serverless";

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "No DATABASE_URL configured" }, { status: 400 });
  }
  if (process.env.SEED_SECRET && process.env.SEED_SECRET !== "allow") {
    return NextResponse.json({ error: "Seeding disabled" }, { status: 403 });
  }

  const sql = neon(process.env.DATABASE_URL);

  // Create tables
  await initDB();

  // Seed reviews (always check independently)
  const existingReviews2 = await sql`SELECT COUNT(*) as cnt FROM reviews`;
  if (Number(existingReviews2[0].cnt) === 0) {
    await sql`INSERT INTO reviews (id, name, rating, text, city, active, created_at) VALUES
      ('rev-001', 'Rajesh Sharma', 5, 'Excellent hospitality and beautiful rooms. The rooftop pool is stunning. Will definitely come back!', 'Delhi', true, NOW()),
      ('rev-002', 'Priya Patel', 5, 'We hosted our wedding reception here. The banquet hall was beautifully decorated and the staff was incredibly helpful.', 'Mumbai', true, NOW()),
      ('rev-003', 'Amit Kumar', 4, 'Very comfortable stay. The breakfast buffet was delicious and the staff was friendly. Great value for money.', 'Lucknow', true, NOW()),
      ('rev-004', 'Sneha Gupta', 5, 'The suite was amazing! Marble floors, great city views, and the spa treatment was so relaxing. Highly recommended.', 'Jaipur', true, NOW()),
      ('rev-005', 'Vikram Singh', 4, 'Clean rooms, excellent room service, and the location is perfect. The gym facilities are top-notch.', 'Chandigarh', true, NOW())`;
  }

  // Check if already seeded
  const existing = await sql`SELECT COUNT(*) as cnt FROM rooms`;
  if (Number(existing[0].cnt) > 0) {
    return NextResponse.json({ message: "Database seeded (reviews added if missing)." });
  }

  // Seed rooms
  await sql`INSERT INTO rooms (name, text, image, rate, sample, hidden) VALUES
    ('Deluxe Room', 'A warm, cove-lit room with an upholstered headboard, work desk and city view. Includes AC, Wi-Fi, TV, mini-bar and complimentary breakfast.', '/images/image-14.jpeg', '₹3,000/night', true, false),
    ('Premium Room', 'Extra space, brass accents and a sitting area for a more relaxed stay. Includes all Deluxe amenities plus a lounge area and premium toiletries.', '/images/image-15.jpeg', '₹4,500/night', true, false),
    ('Suite', 'A separate living room, king bed and premium bath amenities for longer visits. Includes butler service, welcome drink and late checkout.', '/images/image-16.jpeg', '₹8,000/night', true, false),
    ('Family Room', 'Twin beds, extra floor space and everything a family needs under one roof. Includes kids welcome kit, extra bedding and family breakfast.', '/images/image-17.jpeg', '₹5,500/night', true, false)`;

  // Seed offers
  await sql`INSERT INTO offers (id, title, description, discount, valid_from, valid_to, active, created_at) VALUES
    ('offer-001', 'Early Bird Discount', 'Book 30 days in advance and get 20% off on all room types.', '20%', '2026-10-01', '2027-03-31', true, NOW()),
    ('offer-002', 'Weekend Getaway', 'Special weekend rates - stay Friday to Sunday and save.', '15%', '2026-11-01', '2027-02-28', true, NOW()),
    ('offer-003', 'Honeymoon Package', 'Suite with complimentary spa, breakfast and room decoration.', 'Complimentary extras', '2026-10-01', '2027-12-31', false, NOW())`;

  // Seed banquet packages
  await sql`INSERT INTO banquet_packages (id, name, description, capacity, price, includes, active, created_at) VALUES
    ('banq-001', 'Silver Package', 'Ideal for small gatherings and birthday parties. Includes basic hall decoration, sound system and standard catering.', 'Up to 100 guests', '₹75,000', '["Hall rental","Basic decoration","Sound system","Standard catering","Valet parking"]', true, NOW()),
    ('banq-002', 'Gold Package', 'Perfect for wedding receptions and corporate events. Includes premium decoration, DJ, catering and photography.', 'Up to 200 guests', '₹1,50,000', '["Hall rental","Premium decoration","DJ & sound","Premium catering","Photography","Valet parking","Stage setup"]', true, NOW()),
    ('banq-003', 'Platinum Package', 'The complete celebration experience. Everything in Gold plus luxury flower decoration, videography, live music and bridal suite.', 'Up to 300 guests', '₹2,50,000', '["Hall rental","Luxury decoration","Live music & DJ","Gourmet catering","Photography & videography","Bridal suite","Valet parking","Stage & lighting","Welcome drinks"]', true, NOW())`;

  // Seed dining options
  await sql`INSERT INTO dining_options (id, name, description, price, category, active, created_at) VALUES
    ('din-001', 'Breakfast Buffet', 'A rich spread of Indian and continental options including fresh juices, eggs, parathas, cereals and more.', '₹500/person', 'breakfast', true, NOW()),
    ('din-002', 'Lunch Thali', 'Traditional North Indian thali with dal, paneer, seasonal vegetables, rice, roti and dessert.', '₹600/person', 'lunch', true, NOW()),
    ('din-003', 'Dinner - A La Carte', 'Evening dining with seasonal menus, local specialties and international cuisine in a candle-lit restaurant.', '₹800–1,500/person', 'dinner', true, NOW()),
    ('din-004', 'Room Service', 'Full menu delivered to your room 24 hours a day. Order anything from snacks to full meals.', '₹300–1,200', 'room-service', true, NOW()),
    ('din-005', 'Event Catering', 'Custom catering packages for banquet events, weddings and private parties. Veg and non-veg menus available.', '₹800/plate onwards', 'event-catering', true, NOW())`;

  return NextResponse.json({ success: true, message: "Database seeded successfully" });
}
