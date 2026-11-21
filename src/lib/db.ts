import fs from "fs";
import path from "path";
import type { NotificationJob, Enquiry, Booking, Offer, Room, BanquetPackage, DiningOption, Review, DB } from "./types";
import { SITE_CONFIG } from "./config";

// Storage has two interchangeable backends with identical behaviour:
//   - Postgres (Neon) when DATABASE_URL is set, e.g. on Vercel;
//   - data/db.json otherwise, for local development.
// Collections share one generic implementation (below) so both backends apply the same fields,
// ordering and update semantics. Bookings and the notification outbox are written together
// atomically and keep their own code.
const IS_POSTGRES = !!process.env.DATABASE_URL;

/** Thrown when the JSON file cannot be written, e.g. on a read-only serverless filesystem. */
export class StorageUnavailableError extends Error {
  constructor() {
    super("Storage is read-only. Set DATABASE_URL to save changes in production.");
    this.name = "StorageUnavailableError";
  }
}

function getSQL() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require("@neondatabase/serverless");
  return neon(process.env.DATABASE_URL!);
}

// ============================================================
// JSON file
// ============================================================
const DB_PATH = path.join(process.cwd(), "data", "db.json");
const emptyDB = (): DB => ({
  enquiries: [],
  bookings: [],
  offers: [],
  banquetPackages: [],
  diningOptions: [],
  reviews: [],
  notificationJobs: [],
  config: { ...SITE_CONFIG, rooms: SITE_CONFIG.rooms.map(r => ({ ...r })) },
});

function readDB(): DB {
  let data: DB;
  try {
    data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; // A corrupt file is never overwritten.
    data = emptyDB();
    try {
      writeDB(data);
    } catch (e) {
      if (!(e instanceof StorageUnavailableError)) throw e;
    }
    return withRoomIds(data);
  }
  for (const key of [
    "enquiries",
    "bookings",
    "offers",
    "banquetPackages",
    "diningOptions",
    "reviews",
    "notificationJobs",
  ] as const)
    data[key] ??= [];
  data.config ??= emptyDB().config;
  return withRoomIds(data);
}

function writeDB(data: DB): void {
  const temporaryPath = DB_PATH + "." + crypto.randomUUID() + ".tmp";
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(temporaryPath, DB_PATH);
  } catch (error) {
    if (["EROFS", "EACCES", "EPERM"].includes((error as NodeJS.ErrnoException).code || ""))
      throw new StorageUnavailableError();
    throw error;
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

// ============================================================
// Generic collections (enquiries, offers, banquet packages, dining options, reviews)
// ============================================================
interface Field {
  key: string;
  column: string;
  encode?: (v: unknown) => unknown;
  decode?: (v: unknown) => unknown;
}
interface CollectionDef {
  table: string;
  jsonKey: "enquiries" | "offers" | "banquetPackages" | "diningOptions" | "reviews";
  newestFirst: boolean;
  fields: Field[];
}
const f = (key: string, column = key, codec: Partial<Pick<Field, "encode" | "decode">> = {}): Field => ({
  key,
  column,
  ...codec,
});
const jsonList = {
  encode: (v: unknown) => JSON.stringify(v ?? []),
  decode: (v: unknown) => JSON.parse((v as string) || "[]"),
};

const ENQUIRIES: CollectionDef = {
  table: "enquiries",
  jsonKey: "enquiries",
  newestFirst: true,
  fields: ["name", "phone", "email", "type", "guests", "checkin", "checkout", "message", "status"].map(k => f(k)),
};
const OFFERS: CollectionDef = {
  table: "offers",
  jsonKey: "offers",
  newestFirst: true,
  fields: [
    f("title"),
    f("description"),
    f("discount"),
    f("validFrom", "valid_from"),
    f("validTo", "valid_to"),
    f("active"),
  ],
};
const BANQUET: CollectionDef = {
  table: "banquet_packages",
  jsonKey: "banquetPackages",
  newestFirst: false,
  fields: [f("name"), f("description"), f("capacity"), f("price"), f("includes", "includes", jsonList), f("active")],
};
const DINING: CollectionDef = {
  table: "dining_options",
  jsonKey: "diningOptions",
  newestFirst: false,
  fields: [f("name"), f("description"), f("price"), f("category"), f("active")],
};
const REVIEWS: CollectionDef = {
  table: "reviews",
  jsonKey: "reviews",
  newestFirst: true,
  fields: [f("name"), f("rating"), f("text"), f("city"), f("active")],
};

type Item = { id: string; createdAt: string };
/** Only declared fields are stored, in both backends. */
function pick(def: CollectionDef, input: Record<string, unknown>) {
  return Object.fromEntries(def.fields.filter(x => input[x.key] !== undefined).map(x => [x.key, input[x.key]]));
}
function fromRow<T>(def: CollectionDef, r: Record<string, unknown>): T {
  const item: Record<string, unknown> = {
    id: r.id,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
  for (const x of def.fields) item[x.key] = x.decode ? x.decode(r[x.column]) : r[x.column];
  return item as T;
}
const byCreated = (newestFirst: boolean) => (a: Item, b: Item) =>
  (newestFirst ? -1 : 1) * a.createdAt.localeCompare(b.createdAt);

function collection<T extends Item>(def: CollectionDef) {
  const order = `ORDER BY created_at ${def.newestFirst ? "DESC" : "ASC"}`;
  return {
    async list(): Promise<T[]> {
      if (IS_POSTGRES)
        return (await getSQL().query(`SELECT * FROM ${def.table} ${order}`)).map((r: Record<string, unknown>) =>
          fromRow<T>(def, r),
        );
      return ([...readDB()[def.jsonKey]] as unknown as T[]).sort(byCreated(def.newestFirst));
    },
    async add(input: Omit<T, "id" | "createdAt">): Promise<T> {
      const item = {
        ...pick(def, input as Record<string, unknown>),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      } as unknown as T;
      if (IS_POSTGRES) {
        const fields = def.fields.filter(x => (item as Record<string, unknown>)[x.key] !== undefined);
        const columns = ["id", ...fields.map(x => x.column), "created_at"];
        const values = [
          item.id,
          ...fields.map(x =>
            x.encode ? x.encode((item as Record<string, unknown>)[x.key]) : (item as Record<string, unknown>)[x.key],
          ),
          item.createdAt,
        ];
        await getSQL().query(
          `INSERT INTO ${def.table} (${columns.join(", ")}) VALUES (${columns.map((_, i) => "$" + (i + 1)).join(", ")})`,
          values,
        );
        return item;
      }
      const db = readDB();
      (db[def.jsonKey] as unknown as T[]).push(item);
      writeDB(db);
      return item;
    },
    async update(id: string, updates: Partial<T>): Promise<T | null> {
      const changes = pick(def, updates as Record<string, unknown>);
      if (IS_POSTGRES) {
        const fields = def.fields.filter(x => x.key in changes);
        if (!fields.length) {
          const rows = await getSQL().query(`SELECT * FROM ${def.table} WHERE id = $1`, [id]);
          return rows[0] ? fromRow<T>(def, rows[0]) : null;
        }
        const sets = fields.map((x, i) => `${x.column} = $${i + 1}`).join(", ");
        const rows = await getSQL().query(
          `UPDATE ${def.table} SET ${sets} WHERE id = $${fields.length + 1} RETURNING *`,
          [...fields.map(x => (x.encode ? x.encode(changes[x.key]) : changes[x.key])), id],
        );
        return rows[0] ? fromRow<T>(def, rows[0]) : null;
      }
      const db = readDB();
      const list = db[def.jsonKey] as unknown as T[];
      const item = list.find(i => i.id === id);
      if (!item) return null;
      Object.assign(item, changes);
      writeDB(db);
      return item;
    },
    async remove(id: string): Promise<boolean> {
      if (IS_POSTGRES)
        return (await getSQL().query(`DELETE FROM ${def.table} WHERE id = $1 RETURNING id`, [id])).length > 0;
      const db = readDB();
      const list = db[def.jsonKey] as unknown as T[];
      const index = list.findIndex(i => i.id === id);
      if (index === -1) return false;
      list.splice(index, 1);
      writeDB(db);
      return true;
    },
  };
}

const enquiries = collection<Enquiry>(ENQUIRIES);
const offers = collection<Offer>(OFFERS);
const banquet = collection<BanquetPackage>(BANQUET);
const dining = collection<DiningOption>(DINING);
const reviews = collection<Review>(REVIEWS);

export const getEnquiries = enquiries.list;
export const addEnquiry = (e: Omit<Enquiry, "id" | "createdAt" | "status">) => enquiries.add({ ...e, status: "new" });
export const updateEnquiryStatus = (id: string, status: Enquiry["status"]) => enquiries.update(id, { status });
export const deleteEnquiry = enquiries.remove;
export const getOffers = offers.list,
  addOffer = offers.add,
  updateOffer = offers.update,
  deleteOffer = offers.remove;
export const getBanquetPackages = banquet.list,
  addBanquetPackage = banquet.add,
  updateBanquetPackage = banquet.update,
  deleteBanquetPackage = banquet.remove;
export const getDiningOptions = dining.list,
  addDiningOption = dining.add,
  updateDiningOption = dining.update,
  deleteDiningOption = dining.remove;
export const getReviews = reviews.list,
  addReview = reviews.add,
  updateReview = reviews.update,
  deleteReview = reviews.remove;

// ============================================================
// Rooms: addressed by a stable id, never by list position.
// Postgres uses the serial `idx` key; JSON rooms get an id from their name on first read.
// ============================================================
const ROOM_FIELDS = ["name", "text", "image", "rate", "sample", "hidden"] as const;
type RoomInput = Omit<Room, "id">;
const pickRoom = (input: Partial<Room>) =>
  Object.fromEntries(ROOM_FIELDS.filter(k => input[k] !== undefined).map(k => [k, input[k]])) as Partial<RoomInput>;
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "room";
function withRoomIds(data: DB): DB {
  const used = new Set<string>();
  for (const room of data.config.rooms) {
    let id = room.id || slug(room.name);
    for (let n = 2; used.has(id); n++) id = slug(room.name) + "-" + n;
    room.id = id;
    used.add(id);
  }
  return data;
}
const roomRow = (r: Record<string, unknown>): Room =>
  ({
    id: String(r.idx),
    name: r.name,
    text: r.text,
    image: r.image,
    rate: r.rate,
    sample: !!r.sample,
    hidden: !!r.hidden,
  }) as Room;
const pgRoomKey = (id: string) => (/^\d+$/.test(id) ? Number(id) : null);

export async function getRooms(): Promise<Room[]> {
  if (IS_POSTGRES) return (await getSQL().query("SELECT * FROM rooms ORDER BY idx")).map(roomRow);
  return readDB().config.rooms;
}
export async function addRoom(input: RoomInput): Promise<Room> {
  const room = pickRoom(input) as RoomInput;
  if (IS_POSTGRES)
    return roomRow(
      (
        await getSQL().query(
          "INSERT INTO rooms (name, text, image, rate, sample, hidden) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
          [room.name, room.text, room.image, room.rate, room.sample, !!room.hidden],
        )
      )[0],
    );
  const db = readDB();
  const created = { ...room, id: "" } as Room;
  db.config.rooms.push(created);
  withRoomIds(db);
  writeDB(db);
  return created;
}
export async function updateRoom(id: string, updates: Partial<Room>): Promise<Room | null> {
  const changes = pickRoom(updates);
  if (IS_POSTGRES) {
    const key = pgRoomKey(id);
    if (key === null) return null;
    const columns = Object.keys(changes);
    const rows = columns.length
      ? await getSQL().query(
          `UPDATE rooms SET ${columns.map((c, i) => `${c} = $${i + 1}`).join(", ")} WHERE idx = $${columns.length + 1} RETURNING *`,
          [...Object.values(changes), key],
        )
      : await getSQL().query("SELECT * FROM rooms WHERE idx = $1", [key]);
    return rows[0] ? roomRow(rows[0]) : null;
  }
  const db = readDB();
  const room = db.config.rooms.find(r => r.id === id);
  if (!room) return null;
  Object.assign(room, changes);
  writeDB(db);
  return room;
}
export async function deleteRoom(id: string): Promise<boolean> {
  if (IS_POSTGRES) {
    const key = pgRoomKey(id);
    return key !== null && (await getSQL().query("DELETE FROM rooms WHERE idx = $1 RETURNING idx", [key])).length > 0;
  }
  const db = readDB();
  const index = db.config.rooms.findIndex(r => r.id === id);
  if (index === -1) return false;
  db.config.rooms.splice(index, 1);
  writeDB(db);
  return true;
}

// ============================================================
// Bookings and the notification outbox (written in one transaction / one file write)
// ============================================================
type NewBooking = Omit<Booking, "id" | "createdAt" | "paymentId" | "paymentStatus" | "bookingStatus">;
function mapBookingRow(r: Record<string, unknown>): Booking {
  return {
    id: r.id,
    name: r.name,
    mobile: r.mobile,
    email: r.email,
    city: r.city,
    country: r.country,
    gender: r.gender,
    roomType: r.room_type,
    checkin: r.checkin,
    checkout: r.checkout,
    guests: r.guests,
    amount: r.amount,
    paymentStatus: r.payment_status,
    bookingStatus: r.booking_status,
    paymentId: r.payment_id,
    roomsRequested: Number(r.rooms_requested ?? 1),
    specialRequests: String(r.special_requests ?? ""),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  } as Booking;
}
let bookingSetup: Promise<void> | undefined;
async function prepareBookingExtensions() {
  if (!IS_POSTGRES) return;
  bookingSetup ??= (async () => {
    const sql = getSQL();
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rooms_requested INT DEFAULT 1`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT DEFAULT ''`;
    await sql`CREATE TABLE IF NOT EXISTS notification_outbox (id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`;
  })().catch(error => {
    bookingSetup = undefined;
    throw error;
  });
  await bookingSetup;
}

export async function getBookings(): Promise<Booking[]> {
  if (IS_POSTGRES) {
    const sql = getSQL();
    return (await sql`SELECT * FROM bookings ORDER BY created_at DESC`).map(mapBookingRow);
  }
  return [...readDB().bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function addBooking(b: NewBooking): Promise<Booking> {
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  const booking: Booking = {
    ...b,
    id,
    createdAt: now,
    paymentId: "",
    paymentStatus: "pending",
    bookingStatus: "pending",
  };
  if (IS_POSTGRES) {
    const sql = getSQL();
    await prepareBookingExtensions();
    await sql.transaction([
      sql`INSERT INTO bookings (
        id, name, mobile, email, city, country, gender, room_type, checkin, checkout, guests, amount,
        payment_status, booking_status, payment_id, created_at, rooms_requested, special_requests) VALUES (${id}, ${b.name}, ${b.mobile}, ${b.email}, ${b.city}, ${b.country}, ${b.gender}, ${b.roomType}, ${b.checkin}, ${b.checkout}, ${b.guests}, ${b.amount}, 'pending', 'pending', '', ${now}, ${b.roomsRequested ?? 1}, ${b.specialRequests ?? ""})`,
      sql`INSERT INTO notification_outbox (id, booking_id, status, attempts, created_at) VALUES (${id}, ${id}, 'pending', 0, ${now})`,
    ]);
    return booking;
  }
  const db = readDB();
  db.bookings.push(booking);
  db.notificationJobs!.push({ id, bookingId: id, status: "pending", attempts: 0, createdAt: now });
  writeDB(db);
  return booking;
}
/** Staff can only change a request's status. Payment fields are not used: no payments are taken. */
export async function updateBooking(id: string, updates: Pick<Booking, "bookingStatus">): Promise<Booking | null> {
  if (IS_POSTGRES) {
    const sql = getSQL();
    const rows = await sql`UPDATE bookings SET booking_status = ${updates.bookingStatus} WHERE id = ${id} RETURNING *`;
    return rows[0] ? mapBookingRow(rows[0]) : null;
  }
  const db = readDB();
  const booking = db.bookings.find(x => x.id === id);
  if (!booking) return null;
  booking.bookingStatus = updates.bookingStatus;
  writeDB(db);
  return booking;
}
export async function deleteBooking(id: string): Promise<boolean> {
  if (IS_POSTGRES) {
    const sql = getSQL();
    await prepareBookingExtensions();
    const [, rows] = await sql.transaction([
      sql`DELETE FROM notification_outbox WHERE booking_id = ${id}`,
      sql`DELETE FROM bookings WHERE id = ${id} RETURNING id`,
    ]);
    return rows.length > 0;
  }
  const db = readDB();
  const index = db.bookings.findIndex(x => x.id === id);
  if (index === -1) return false;
  db.bookings.splice(index, 1);
  db.notificationJobs = db.notificationJobs!.filter(j => j.bookingId !== id);
  writeDB(db);
  return true;
}

export async function getNotificationJobs(): Promise<NotificationJob[]> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows = await sql`SELECT * FROM notification_outbox ORDER BY created_at ASC`;
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      bookingId: String(r.booking_id),
      status: r.status as NotificationJob["status"],
      attempts: Number(r.attempts),
      createdAt: String(r.created_at),
    }));
  }
  return readDB().notificationJobs!;
}
export async function markNotification(id: string, delivered: boolean) {
  if (IS_POSTGRES) {
    const sql = getSQL();
    await sql`UPDATE notification_outbox SET status = CASE WHEN status = 'delivered' THEN status ELSE ${delivered ? "delivered" : "pending"} END, attempts = attempts + 1 WHERE id = ${id}`;
    return;
  }
  const db = readDB();
  const job = db.notificationJobs!.find(j => j.id === id);
  if (job) {
    job.attempts++;
    job.status = job.status === "delivered" || delivered ? "delivered" : "pending";
    writeDB(db);
  }
}
