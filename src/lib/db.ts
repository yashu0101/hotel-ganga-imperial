import fs from "fs";
import path from "path";
import { DB, Enquiry, Booking, Offer, Room } from "./types";
import { SITE_CONFIG } from "./config";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function readDB(): DB {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!data.bookings) data.bookings = [];
    if (!data.offers) data.offers = [];
    return data;
  } catch {
    const initial: DB = { enquiries: [], bookings: [], offers: [], config: SITE_CONFIG };
    writeDB(initial);
    return initial;
  }
}

function writeDB(data: DB): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// Enquiries
export function getEnquiries(): Enquiry[] {
  return readDB().enquiries;
}

export function addEnquiry(
  enquiry: Omit<Enquiry, "id" | "createdAt" | "status">
): Enquiry {
  const db = readDB();
  const newEnquiry: Enquiry = {
    ...enquiry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "new",
  };
  db.enquiries.push(newEnquiry);
  writeDB(db);
  return newEnquiry;
}

export function updateEnquiryStatus(
  id: string,
  status: Enquiry["status"]
): Enquiry | null {
  const db = readDB();
  const idx = db.enquiries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  db.enquiries[idx].status = status;
  writeDB(db);
  return db.enquiries[idx];
}

export function deleteEnquiry(id: string): boolean {
  const db = readDB();
  const idx = db.enquiries.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  db.enquiries.splice(idx, 1);
  writeDB(db);
  return true;
}

// Bookings
export function getBookings(): Booking[] {
  return readDB().bookings;
}

export function addBooking(
  booking: Omit<Booking, "id" | "createdAt" | "paymentId" | "paymentStatus" | "bookingStatus">
): Booking {
  const db = readDB();
  const newBooking: Booking = {
    ...booking,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    paymentId: "",
    paymentStatus: "pending",
    bookingStatus: "pending",
  };
  db.bookings.push(newBooking);
  writeDB(db);
  return newBooking;
}

export function updateBooking(
  id: string,
  updates: Partial<Pick<Booking, "paymentStatus" | "bookingStatus" | "paymentId">>
): Booking | null {
  const db = readDB();
  const idx = db.bookings.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  Object.assign(db.bookings[idx], updates);
  writeDB(db);
  return db.bookings[idx];
}

export function deleteBooking(id: string): boolean {
  const db = readDB();
  const idx = db.bookings.findIndex((b) => b.id === id);
  if (idx === -1) return false;
  db.bookings.splice(idx, 1);
  writeDB(db);
  return true;
}

// Config
export function getConfig() {
  return readDB().config;
}

export function updateConfig(config: Partial<DB["config"]>) {
  const db = readDB();
  db.config = { ...db.config, ...config };
  writeDB(db);
  return db.config;
}

// Rooms (managed via config)
export function getRooms(): Room[] {
  return readDB().config.rooms;
}

export function addRoom(room: Room): Room[] {
  const db = readDB();
  db.config.rooms.push(room);
  writeDB(db);
  return db.config.rooms;
}

export function updateRoom(index: number, updates: Partial<Room>): Room[] {
  const db = readDB();
  if (index < 0 || index >= db.config.rooms.length) return db.config.rooms;
  Object.assign(db.config.rooms[index], updates);
  writeDB(db);
  return db.config.rooms;
}

export function deleteRoom(index: number): Room[] {
  const db = readDB();
  if (index < 0 || index >= db.config.rooms.length) return db.config.rooms;
  db.config.rooms.splice(index, 1);
  writeDB(db);
  return db.config.rooms;
}

// Offers
export function getOffers(): Offer[] {
  return readDB().offers;
}

export function addOffer(offer: Omit<Offer, "id" | "createdAt">): Offer {
  const db = readDB();
  const newOffer: Offer = {
    ...offer,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.offers.push(newOffer);
  writeDB(db);
  return newOffer;
}

export function updateOffer(id: string, updates: Partial<Offer>): Offer | null {
  const db = readDB();
  const idx = db.offers.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  Object.assign(db.offers[idx], updates);
  writeDB(db);
  return db.offers[idx];
}

export function deleteOffer(id: string): boolean {
  const db = readDB();
  const idx = db.offers.findIndex((o) => o.id === id);
  if (idx === -1) return false;
  db.offers.splice(idx, 1);
  writeDB(db);
  return true;
}
