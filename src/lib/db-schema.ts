import { neon } from "@neondatabase/serverless";

export async function initDB() {
  if (!process.env.DATABASE_URL) return;
  const sql = neon(process.env.DATABASE_URL);

  await sql`CREATE TABLE IF NOT EXISTS enquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    type TEXT DEFAULT '',
    guests INT DEFAULT 1,
    checkin TEXT DEFAULT '',
    checkout TEXT DEFAULT '',
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT DEFAULT '',
    city TEXT DEFAULT '',
    country TEXT DEFAULT '',
    gender TEXT DEFAULT 'other',
    room_type TEXT DEFAULT '',
    checkin TEXT DEFAULT '',
    checkout TEXT DEFAULT '',
    guests INT DEFAULT 1,
    amount INT DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    booking_status TEXT DEFAULT 'pending',
    payment_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS rooms (
    idx SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    text TEXT DEFAULT '',
    image TEXT DEFAULT '',
    rate TEXT DEFAULT '',
    sample BOOLEAN DEFAULT true,
    hidden BOOLEAN DEFAULT false
  )`;

  await sql`CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    discount TEXT DEFAULT '',
    valid_from TEXT DEFAULT '',
    valid_to TEXT DEFAULT '',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS banquet_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    capacity TEXT DEFAULT '',
    price TEXT DEFAULT '',
    includes TEXT DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS dining_options (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price TEXT DEFAULT '',
    category TEXT DEFAULT 'dinner',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}
