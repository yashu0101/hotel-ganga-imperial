import { Enquiry, Booking, Offer, Room, BanquetPackage, DiningOption, Review } from "./types";

// ---------- Detect environment ----------
const IS_POSTGRES = !!process.env.DATABASE_URL;

// ============================================================
// POSTGRES (Neon) — used on Vercel
// ============================================================
function getSQL() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require("@neondatabase/serverless");
  return neon(process.env.DATABASE_URL!);
}

// ---------- Enquiries (Postgres) ----------
async function pgGetEnquiries(): Promise<Enquiry[]> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM enquiries ORDER BY created_at DESC`;
  return rows.map((r: Record<string, unknown>) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, type: r.type, guests: r.guests, checkin: r.checkin, checkout: r.checkout, message: r.message, status: r.status, createdAt: r.created_at })) as Enquiry[];
}
async function pgAddEnquiry(e: Omit<Enquiry, "id" | "createdAt" | "status">): Promise<Enquiry> {
  const sql = getSQL();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await sql`INSERT INTO enquiries (id, name, phone, email, type, guests, checkin, checkout, message, status, created_at) VALUES (${id}, ${e.name}, ${e.phone}, ${e.email}, ${e.type}, ${e.guests}, ${e.checkin}, ${e.checkout}, ${e.message}, 'new', ${now})`;
  return { ...e, id, createdAt: now, status: "new" };
}
async function pgUpdateEnquiryStatus(id: string, status: Enquiry["status"]): Promise<Enquiry | null> {
  const sql = getSQL();
  const rows = await sql`UPDATE enquiries SET status = ${status} WHERE id = ${id} RETURNING *`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return { id: r.id, name: r.name, phone: r.phone, email: r.email, type: r.type, guests: r.guests, checkin: r.checkin, checkout: r.checkout, message: r.message, status: r.status, createdAt: r.created_at } as Enquiry;
}
async function pgDeleteEnquiry(id: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`DELETE FROM enquiries WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ---------- Bookings (Postgres) ----------
function mapBookingRow(r: Record<string, unknown>): Booking {
  return { id: r.id, name: r.name, mobile: r.mobile, email: r.email, city: r.city, country: r.country, gender: r.gender, roomType: r.room_type, checkin: r.checkin, checkout: r.checkout, guests: r.guests, amount: r.amount, paymentStatus: r.payment_status, bookingStatus: r.booking_status, paymentId: r.payment_id, createdAt: r.created_at } as Booking;
}
async function pgGetBookings(): Promise<Booking[]> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
  return rows.map(mapBookingRow);
}
async function pgAddBooking(b: Omit<Booking, "id" | "createdAt" | "paymentId" | "paymentStatus" | "bookingStatus">): Promise<Booking> {
  const sql = getSQL();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await sql`INSERT INTO bookings (id, name, mobile, email, city, country, gender, room_type, checkin, checkout, guests, amount, payment_status, booking_status, payment_id, created_at) VALUES (${id}, ${b.name}, ${b.mobile}, ${b.email}, ${b.city}, ${b.country}, ${b.gender}, ${b.roomType}, ${b.checkin}, ${b.checkout}, ${b.guests}, ${b.amount}, 'pending', 'pending', '', ${now})`;
  return { ...b, id, createdAt: now, paymentId: "", paymentStatus: "pending", bookingStatus: "pending" };
}
async function pgUpdateBooking(id: string, updates: Partial<Pick<Booking, "paymentStatus" | "bookingStatus" | "paymentId">>): Promise<Booking | null> {
  const sql = getSQL();
  const ps = updates.paymentStatus;
  const bs = updates.bookingStatus;
  const pi = updates.paymentId;
  // Update all three fields (use coalesce to keep existing values)
  const rows = await sql`UPDATE bookings SET
    payment_status = COALESCE(${ps ?? null}, payment_status),
    booking_status = COALESCE(${bs ?? null}, booking_status),
    payment_id = COALESCE(${pi ?? null}, payment_id)
    WHERE id = ${id} RETURNING *`;
  if (rows.length === 0) return null;
  return mapBookingRow(rows[0]);
}
async function pgDeleteBooking(id: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`DELETE FROM bookings WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ---------- Rooms (Postgres) ----------
async function pgGetRooms(): Promise<Room[]> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM rooms ORDER BY idx`;
  return rows.map((r: Record<string, unknown>) => ({ name: r.name, text: r.text, image: r.image, rate: r.rate, sample: r.sample, hidden: r.hidden })) as Room[];
}
async function pgAddRoom(room: Room): Promise<Room[]> {
  const sql = getSQL();
  await sql`INSERT INTO rooms (name, text, image, rate, sample, hidden) VALUES (${room.name}, ${room.text}, ${room.image}, ${room.rate}, ${room.sample}, ${!!room.hidden})`;
  return pgGetRooms();
}
async function pgUpdateRoom(index: number, updates: Partial<Room>): Promise<Room[]> {
  const sql = getSQL();
  const allRows = await sql`SELECT idx FROM rooms ORDER BY idx`;
  if (index < 0 || index >= allRows.length) return pgGetRooms();
  const dbIdx = allRows[index].idx;
  // Update all fields, using COALESCE to preserve existing values
  await sql`UPDATE rooms SET
    name = COALESCE(${updates.name ?? null}, name),
    text = COALESCE(${updates.text ?? null}, text),
    image = COALESCE(${updates.image ?? null}, image),
    rate = COALESCE(${updates.rate ?? null}, rate),
    sample = COALESCE(${updates.sample ?? null}, sample),
    hidden = COALESCE(${updates.hidden ?? null}, hidden)
    WHERE idx = ${dbIdx}`;
  return pgGetRooms();
}
async function pgDeleteRoom(index: number): Promise<Room[]> {
  const sql = getSQL();
  const allRows = await sql`SELECT idx FROM rooms ORDER BY idx`;
  if (index < 0 || index >= allRows.length) return pgGetRooms();
  const dbIdx = allRows[index].idx;
  await sql`DELETE FROM rooms WHERE idx = ${dbIdx}`;
  return pgGetRooms();
}

// ---------- Offers (Postgres) ----------
function mapOfferRow(r: Record<string, unknown>): Offer {
  return { id: r.id, title: r.title, description: r.description, discount: r.discount, validFrom: r.valid_from, validTo: r.valid_to, active: r.active, createdAt: r.created_at } as Offer;
}
async function pgGetOffers(): Promise<Offer[]> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM offers ORDER BY created_at DESC`;
  return rows.map(mapOfferRow);
}
async function pgAddOffer(o: Omit<Offer, "id" | "createdAt">): Promise<Offer> {
  const sql = getSQL();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await sql`INSERT INTO offers (id, title, description, discount, valid_from, valid_to, active, created_at) VALUES (${id}, ${o.title}, ${o.description}, ${o.discount}, ${o.validFrom}, ${o.validTo}, ${o.active}, ${now})`;
  return { ...o, id, createdAt: now };
}
async function pgUpdateOffer(id: string, updates: Partial<Offer>): Promise<Offer | null> {
  const sql = getSQL();
  const rows = await sql`UPDATE offers SET
    title = COALESCE(${updates.title ?? null}, title),
    description = COALESCE(${updates.description ?? null}, description),
    discount = COALESCE(${updates.discount ?? null}, discount),
    valid_from = COALESCE(${updates.validFrom ?? null}, valid_from),
    valid_to = COALESCE(${updates.validTo ?? null}, valid_to),
    active = COALESCE(${updates.active ?? null}, active)
    WHERE id = ${id} RETURNING *`;
  if (rows.length === 0) return null;
  return mapOfferRow(rows[0]);
}
async function pgDeleteOffer(id: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`DELETE FROM offers WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ---------- Banquet Packages (Postgres) ----------
function mapBanquetRow(r: Record<string, unknown>): BanquetPackage {
  return { id: r.id, name: r.name, description: r.description, capacity: r.capacity, price: r.price, includes: JSON.parse((r.includes as string) || "[]"), active: r.active, createdAt: r.created_at } as BanquetPackage;
}
async function pgGetBanquetPackages(): Promise<BanquetPackage[]> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM banquet_packages ORDER BY created_at`;
  return rows.map(mapBanquetRow);
}
async function pgAddBanquetPackage(p: Omit<BanquetPackage, "id" | "createdAt">): Promise<BanquetPackage> {
  const sql = getSQL();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await sql`INSERT INTO banquet_packages (id, name, description, capacity, price, includes, active, created_at) VALUES (${id}, ${p.name}, ${p.description}, ${p.capacity}, ${p.price}, ${JSON.stringify(p.includes)}, ${p.active}, ${now})`;
  return { ...p, id, createdAt: now };
}
async function pgUpdateBanquetPackage(id: string, updates: Partial<BanquetPackage>): Promise<BanquetPackage | null> {
  const sql = getSQL();
  const inc = updates.includes ? JSON.stringify(updates.includes) : null;
  const rows = await sql`UPDATE banquet_packages SET
    name = COALESCE(${updates.name ?? null}, name),
    description = COALESCE(${updates.description ?? null}, description),
    capacity = COALESCE(${updates.capacity ?? null}, capacity),
    price = COALESCE(${updates.price ?? null}, price),
    includes = COALESCE(${inc}, includes),
    active = COALESCE(${updates.active ?? null}, active)
    WHERE id = ${id} RETURNING *`;
  if (rows.length === 0) return null;
  return mapBanquetRow(rows[0]);
}
async function pgDeleteBanquetPackage(id: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`DELETE FROM banquet_packages WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ---------- Dining Options (Postgres) ----------
function mapDiningRow(r: Record<string, unknown>): DiningOption {
  return { id: r.id, name: r.name, description: r.description, price: r.price, category: r.category, active: r.active, createdAt: r.created_at } as DiningOption;
}
async function pgGetDiningOptions(): Promise<DiningOption[]> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM dining_options ORDER BY created_at`;
  return rows.map(mapDiningRow);
}
async function pgAddDiningOption(d: Omit<DiningOption, "id" | "createdAt">): Promise<DiningOption> {
  const sql = getSQL();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await sql`INSERT INTO dining_options (id, name, description, price, category, active, created_at) VALUES (${id}, ${d.name}, ${d.description}, ${d.price}, ${d.category}, ${d.active}, ${now})`;
  return { ...d, id, createdAt: now };
}
async function pgUpdateDiningOption(id: string, updates: Partial<DiningOption>): Promise<DiningOption | null> {
  const sql = getSQL();
  const rows = await sql`UPDATE dining_options SET
    name = COALESCE(${updates.name ?? null}, name),
    description = COALESCE(${updates.description ?? null}, description),
    price = COALESCE(${updates.price ?? null}, price),
    category = COALESCE(${updates.category ?? null}, category),
    active = COALESCE(${updates.active ?? null}, active)
    WHERE id = ${id} RETURNING *`;
  if (rows.length === 0) return null;
  return mapDiningRow(rows[0]);
}
async function pgDeleteDiningOption(id: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`DELETE FROM dining_options WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ---------- Reviews (Postgres) ----------
function mapReviewRow(r: Record<string, unknown>): Review {
  return { id: r.id, name: r.name, rating: r.rating, text: r.text, city: r.city, active: r.active, createdAt: r.created_at } as Review;
}
async function pgGetReviews(): Promise<Review[]> {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM reviews ORDER BY created_at DESC`;
  return rows.map(mapReviewRow);
}
async function pgAddReview(rev: Omit<Review, "id" | "createdAt">): Promise<Review> {
  const sql = getSQL();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await sql`INSERT INTO reviews (id, name, rating, text, city, active, created_at) VALUES (${id}, ${rev.name}, ${rev.rating}, ${rev.text}, ${rev.city}, ${rev.active}, ${now})`;
  return { ...rev, id, createdAt: now };
}
async function pgUpdateReview(id: string, updates: Partial<Review>): Promise<Review | null> {
  const sql = getSQL();
  const rows = await sql`UPDATE reviews SET
    name = COALESCE(${updates.name ?? null}, name),
    rating = COALESCE(${updates.rating ?? null}, rating),
    text = COALESCE(${updates.text ?? null}, text),
    city = COALESCE(${updates.city ?? null}, city),
    active = COALESCE(${updates.active ?? null}, active)
    WHERE id = ${id} RETURNING *`;
  if (rows.length === 0) return null;
  return mapReviewRow(rows[0]);
}
async function pgDeleteReview(id: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`DELETE FROM reviews WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

// ============================================================
// JSON FILE — used in local development
// ============================================================
import fs from "fs";
import path from "path";
import { DB } from "./types";
import { SITE_CONFIG } from "./config";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function readDB(): DB {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!data.bookings) data.bookings = [];
    if (!data.offers) data.offers = [];
    if (!data.banquetPackages) data.banquetPackages = [];
    if (!data.diningOptions) data.diningOptions = [];
    if (!data.reviews) data.reviews = [];
    return data;
  } catch {
    const initial: DB = { enquiries: [], bookings: [], offers: [], banquetPackages: [], diningOptions: [], reviews: [], config: SITE_CONFIG };
    writeDB(initial);
    return initial;
  }
}

function writeDB(data: DB): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function jsonGetEnquiries(): Enquiry[] { return readDB().enquiries; }
function jsonAddEnquiry(enquiry: Omit<Enquiry, "id" | "createdAt" | "status">): Enquiry {
  const db = readDB();
  const n: Enquiry = { ...enquiry, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "new" };
  db.enquiries.push(n); writeDB(db); return n;
}
function jsonUpdateEnquiryStatus(id: string, status: Enquiry["status"]): Enquiry | null {
  const db = readDB(); const idx = db.enquiries.findIndex(e => e.id === id);
  if (idx === -1) return null; db.enquiries[idx].status = status; writeDB(db); return db.enquiries[idx];
}
function jsonDeleteEnquiry(id: string): boolean {
  const db = readDB(); const idx = db.enquiries.findIndex(e => e.id === id);
  if (idx === -1) return false; db.enquiries.splice(idx, 1); writeDB(db); return true;
}
function jsonGetBookings(): Booking[] { return readDB().bookings; }
function jsonAddBooking(booking: Omit<Booking, "id" | "createdAt" | "paymentId" | "paymentStatus" | "bookingStatus">): Booking {
  const db = readDB();
  const n: Booking = { ...booking, id: crypto.randomUUID(), createdAt: new Date().toISOString(), paymentId: "", paymentStatus: "pending", bookingStatus: "pending" };
  db.bookings.push(n); writeDB(db); return n;
}
function jsonUpdateBooking(id: string, updates: Partial<Pick<Booking, "paymentStatus" | "bookingStatus" | "paymentId">>): Booking | null {
  const db = readDB(); const idx = db.bookings.findIndex(b => b.id === id);
  if (idx === -1) return null; Object.assign(db.bookings[idx], updates); writeDB(db); return db.bookings[idx];
}
function jsonDeleteBooking(id: string): boolean {
  const db = readDB(); const idx = db.bookings.findIndex(b => b.id === id);
  if (idx === -1) return false; db.bookings.splice(idx, 1); writeDB(db); return true;
}
function jsonGetRooms(): Room[] { return readDB().config.rooms; }
function jsonAddRoom(room: Room): Room[] { const db = readDB(); db.config.rooms.push(room); writeDB(db); return db.config.rooms; }
function jsonUpdateRoom(index: number, updates: Partial<Room>): Room[] {
  const db = readDB(); if (index < 0 || index >= db.config.rooms.length) return db.config.rooms;
  Object.assign(db.config.rooms[index], updates); writeDB(db); return db.config.rooms;
}
function jsonDeleteRoom(index: number): Room[] {
  const db = readDB(); if (index < 0 || index >= db.config.rooms.length) return db.config.rooms;
  db.config.rooms.splice(index, 1); writeDB(db); return db.config.rooms;
}
function jsonGetOffers(): Offer[] { return readDB().offers; }
function jsonAddOffer(offer: Omit<Offer, "id" | "createdAt">): Offer {
  const db = readDB(); const n: Offer = { ...offer, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  db.offers.push(n); writeDB(db); return n;
}
function jsonUpdateOffer(id: string, updates: Partial<Offer>): Offer | null {
  const db = readDB(); const idx = db.offers.findIndex(o => o.id === id);
  if (idx === -1) return null; Object.assign(db.offers[idx], updates); writeDB(db); return db.offers[idx];
}
function jsonDeleteOffer(id: string): boolean {
  const db = readDB(); const idx = db.offers.findIndex(o => o.id === id);
  if (idx === -1) return false; db.offers.splice(idx, 1); writeDB(db); return true;
}
function jsonGetBanquetPackages(): BanquetPackage[] { return readDB().banquetPackages; }
function jsonAddBanquetPackage(pkg: Omit<BanquetPackage, "id" | "createdAt">): BanquetPackage {
  const db = readDB(); const n: BanquetPackage = { ...pkg, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  db.banquetPackages.push(n); writeDB(db); return n;
}
function jsonUpdateBanquetPackage(id: string, updates: Partial<BanquetPackage>): BanquetPackage | null {
  const db = readDB(); const idx = db.banquetPackages.findIndex(p => p.id === id);
  if (idx === -1) return null; Object.assign(db.banquetPackages[idx], updates); writeDB(db); return db.banquetPackages[idx];
}
function jsonDeleteBanquetPackage(id: string): boolean {
  const db = readDB(); const idx = db.banquetPackages.findIndex(p => p.id === id);
  if (idx === -1) return false; db.banquetPackages.splice(idx, 1); writeDB(db); return true;
}
function jsonGetDiningOptions(): DiningOption[] { return readDB().diningOptions; }
function jsonAddDiningOption(opt: Omit<DiningOption, "id" | "createdAt">): DiningOption {
  const db = readDB(); const n: DiningOption = { ...opt, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  db.diningOptions.push(n); writeDB(db); return n;
}
function jsonUpdateDiningOption(id: string, updates: Partial<DiningOption>): DiningOption | null {
  const db = readDB(); const idx = db.diningOptions.findIndex(d => d.id === id);
  if (idx === -1) return null; Object.assign(db.diningOptions[idx], updates); writeDB(db); return db.diningOptions[idx];
}
function jsonDeleteDiningOption(id: string): boolean {
  const db = readDB(); const idx = db.diningOptions.findIndex(d => d.id === id);
  if (idx === -1) return false; db.diningOptions.splice(idx, 1); writeDB(db); return true;
}
function jsonGetReviews(): Review[] { return readDB().reviews; }
function jsonAddReview(rev: Omit<Review, "id" | "createdAt">): Review {
  const db = readDB(); const n: Review = { ...rev, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  db.reviews.push(n); writeDB(db); return n;
}
function jsonUpdateReview(id: string, updates: Partial<Review>): Review | null {
  const db = readDB(); const idx = db.reviews.findIndex(r => r.id === id);
  if (idx === -1) return null; Object.assign(db.reviews[idx], updates); writeDB(db); return db.reviews[idx];
}
function jsonDeleteReview(id: string): boolean {
  const db = readDB(); const idx = db.reviews.findIndex(r => r.id === id);
  if (idx === -1) return false; db.reviews.splice(idx, 1); writeDB(db); return true;
}

// ============================================================
// EXPORTED API
// ============================================================
export async function getEnquiries() { return IS_POSTGRES ? pgGetEnquiries() : jsonGetEnquiries(); }
export async function addEnquiry(e: Omit<Enquiry, "id" | "createdAt" | "status">) { return IS_POSTGRES ? pgAddEnquiry(e) : jsonAddEnquiry(e); }
export async function updateEnquiryStatus(id: string, status: Enquiry["status"]) { return IS_POSTGRES ? pgUpdateEnquiryStatus(id, status) : jsonUpdateEnquiryStatus(id, status); }
export async function deleteEnquiry(id: string) { return IS_POSTGRES ? pgDeleteEnquiry(id) : jsonDeleteEnquiry(id); }

export async function getBookings() { return IS_POSTGRES ? pgGetBookings() : jsonGetBookings(); }
export async function addBooking(b: Omit<Booking, "id" | "createdAt" | "paymentId" | "paymentStatus" | "bookingStatus">) { return IS_POSTGRES ? pgAddBooking(b) : jsonAddBooking(b); }
export async function updateBooking(id: string, updates: Partial<Pick<Booking, "paymentStatus" | "bookingStatus" | "paymentId">>) { return IS_POSTGRES ? pgUpdateBooking(id, updates) : jsonUpdateBooking(id, updates); }
export async function deleteBooking(id: string) { return IS_POSTGRES ? pgDeleteBooking(id) : jsonDeleteBooking(id); }

export async function getRooms() { return IS_POSTGRES ? pgGetRooms() : jsonGetRooms(); }
export async function addRoom(room: Room) { return IS_POSTGRES ? pgAddRoom(room) : jsonAddRoom(room); }
export async function updateRoom(index: number, updates: Partial<Room>) { return IS_POSTGRES ? pgUpdateRoom(index, updates) : jsonUpdateRoom(index, updates); }
export async function deleteRoom(index: number) { return IS_POSTGRES ? pgDeleteRoom(index) : jsonDeleteRoom(index); }

export async function getOffers() { return IS_POSTGRES ? pgGetOffers() : jsonGetOffers(); }
export async function addOffer(offer: Omit<Offer, "id" | "createdAt">) { return IS_POSTGRES ? pgAddOffer(offer) : jsonAddOffer(offer); }
export async function updateOffer(id: string, updates: Partial<Offer>) { return IS_POSTGRES ? pgUpdateOffer(id, updates) : jsonUpdateOffer(id, updates); }
export async function deleteOffer(id: string) { return IS_POSTGRES ? pgDeleteOffer(id) : jsonDeleteOffer(id); }

export async function getBanquetPackages() { return IS_POSTGRES ? pgGetBanquetPackages() : jsonGetBanquetPackages(); }
export async function addBanquetPackage(pkg: Omit<BanquetPackage, "id" | "createdAt">) { return IS_POSTGRES ? pgAddBanquetPackage(pkg) : jsonAddBanquetPackage(pkg); }
export async function updateBanquetPackage(id: string, updates: Partial<BanquetPackage>) { return IS_POSTGRES ? pgUpdateBanquetPackage(id, updates) : jsonUpdateBanquetPackage(id, updates); }
export async function deleteBanquetPackage(id: string) { return IS_POSTGRES ? pgDeleteBanquetPackage(id) : jsonDeleteBanquetPackage(id); }

export async function getDiningOptions() { return IS_POSTGRES ? pgGetDiningOptions() : jsonGetDiningOptions(); }
export async function addDiningOption(opt: Omit<DiningOption, "id" | "createdAt">) { return IS_POSTGRES ? pgAddDiningOption(opt) : jsonAddDiningOption(opt); }
export async function updateDiningOption(id: string, updates: Partial<DiningOption>) { return IS_POSTGRES ? pgUpdateDiningOption(id, updates) : jsonUpdateDiningOption(id, updates); }
export async function deleteDiningOption(id: string) { return IS_POSTGRES ? pgDeleteDiningOption(id) : jsonDeleteDiningOption(id); }

export async function getReviews() { return IS_POSTGRES ? pgGetReviews() : jsonGetReviews(); }
export async function addReview(rev: Omit<Review, "id" | "createdAt">) { return IS_POSTGRES ? pgAddReview(rev) : jsonAddReview(rev); }
export async function updateReview(id: string, updates: Partial<Review>) { return IS_POSTGRES ? pgUpdateReview(id, updates) : jsonUpdateReview(id, updates); }
export async function deleteReview(id: string) { return IS_POSTGRES ? pgDeleteReview(id) : jsonDeleteReview(id); }

export function getConfig() { return readDB().config; }
export function updateConfig(config: Partial<DB["config"]>) { const db = readDB(); db.config = { ...db.config, ...config }; writeDB(db); return db.config; }
