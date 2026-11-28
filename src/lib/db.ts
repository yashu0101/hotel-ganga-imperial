import fs from "fs";
import path from "path";
import type {
  NotificationJob,
  Enquiry,
  Booking,
  Offer,
  Room,
  BanquetPackage,
  DiningOption,
  Review,
  DB,
  HotelSettings,
  AuditEntry,
} from "./types";
import { SITE_CONFIG } from "./config";
import { DEFAULT_SETTINGS } from "./hotel-content";
import { slugify } from "./validation";

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
/** A change that clashes with stored content, which staff can fix in the form. Admin routes answer 409. */
export class ConflictError extends Error {}

function getSQL() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require("@neondatabase/serverless");
  return neon(process.env.DATABASE_URL!);
}

// ============================================================
// JSON file
// ============================================================
// HOTEL_DB_FILE (relative to the project) lets end-to-end tests use a throwaway copy instead of data/db.json. The
// default path stays static so file tracing ships only data/db.json; the override is excluded from tracing.
const DB_PATH = process.env.HOTEL_DB_FILE
  ? path.join(/*turbopackIgnore: true*/ process.cwd(), process.env.HOTEL_DB_FILE)
  : path.join(process.cwd(), "data", "db.json");
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
    return normalizeRooms(data);
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
  data.bookings = data.bookings.map(withCouponFields);
  return normalizeRooms(data);
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
  /** Idempotent Postgres migrations run once per process before first use (columns added after launch). */
  migrations?: string[];
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
  fields: [
    ...["name", "phone", "email", "type", "guests", "checkin", "checkout", "message", "status"].map(k => f(k)),
    f("deletedAt", "deleted_at", { decode: v => (v ? String(v) : undefined) }),
  ],
  migrations: ["ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS deleted_at TEXT"],
};
const OFFERS: CollectionDef = {
  table: "offers",
  jsonKey: "offers",
  newestFirst: true,
  fields: [
    f("title"),
    f("description"),
    f("discount"),
    f("code", "code", { decode: v => (v as string | null) ?? "" }),
    f("validFrom", "valid_from"),
    f("validTo", "valid_to"),
    f("active"),
    f("minAdvanceDays", "min_advance_days", { decode: v => Number(v ?? 0) }),
    f("minNights", "min_nights", { decode: v => Number(v ?? 0) }),
    f("sample", "sample", { decode: v => !!v }),
  ],
  migrations: [
    "ALTER TABLE offers ADD COLUMN IF NOT EXISTS code TEXT DEFAULT ''",
    // Columns added after launch are added without a default first, so the rows stored before (and only those) are
    // NULL and get the seeded content's values once: its conditions, and the sample flag for the seeded offers.
    "ALTER TABLE offers ADD COLUMN IF NOT EXISTS min_advance_days INT",
    "UPDATE offers SET min_advance_days = CASE WHEN id = 'offer-001' THEN 30 ELSE 0 END WHERE min_advance_days IS NULL",
    "ALTER TABLE offers ALTER COLUMN min_advance_days SET DEFAULT 0",
    "ALTER TABLE offers ADD COLUMN IF NOT EXISTS min_nights INT",
    "UPDATE offers SET min_nights = CASE WHEN id = 'offer-002' THEN 2 ELSE 0 END WHERE min_nights IS NULL",
    "ALTER TABLE offers ALTER COLUMN min_nights SET DEFAULT 0",
    "ALTER TABLE offers ADD COLUMN IF NOT EXISTS sample BOOLEAN",
    "UPDATE offers SET sample = (id IN ('offer-001', 'offer-002', 'offer-003')) WHERE sample IS NULL",
    "ALTER TABLE offers ALTER COLUMN sample SET DEFAULT false",
  ],
};
const BANQUET: CollectionDef = {
  table: "banquet_packages",
  jsonKey: "banquetPackages",
  newestFirst: false,
  fields: [
    f("name"),
    f("description"),
    f("capacity"),
    f("price"),
    f("includes", "includes", jsonList),
    f("active"),
    f("sample", "sample", { decode: v => !!v }),
  ],
  // Seeded packages (stored before this column existed) are flagged as samples once.
  migrations: [
    "ALTER TABLE banquet_packages ADD COLUMN IF NOT EXISTS sample BOOLEAN",
    "UPDATE banquet_packages SET sample = (id IN ('banq-001', 'banq-002', 'banq-003')) WHERE sample IS NULL",
    "ALTER TABLE banquet_packages ALTER COLUMN sample SET DEFAULT false",
  ],
};
const DINING: CollectionDef = {
  table: "dining_options",
  jsonKey: "diningOptions",
  newestFirst: false,
  fields: [
    f("name"),
    f("description"),
    f("price"),
    f("category"),
    f("active"),
    f("sample", "sample", { decode: v => !!v }),
  ],
  // Seeded dining options (stored before this column existed) are flagged as samples once.
  migrations: [
    "ALTER TABLE dining_options ADD COLUMN IF NOT EXISTS sample BOOLEAN",
    "UPDATE dining_options SET sample = (id IN ('din-001', 'din-002', 'din-003', 'din-004', 'din-005')) WHERE sample IS NULL",
    "ALTER TABLE dining_options ALTER COLUMN sample SET DEFAULT false",
  ],
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
  let migrated: Promise<void> | undefined;
  const sql = () => {
    if (def.migrations?.length)
      migrated ??= (async () => {
        for (const statement of def.migrations!) await getSQL().query(statement);
      })().catch(error => {
        migrated = undefined;
        throw error;
      });
    return (migrated ?? Promise.resolve()).then(getSQL);
  };
  return {
    async list(): Promise<T[]> {
      if (IS_POSTGRES)
        return (await (await sql()).query(`SELECT * FROM ${def.table} ${order}`)).map((r: Record<string, unknown>) =>
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
        await (
          await sql()
        ).query(
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
          const rows = await (await sql()).query(`SELECT * FROM ${def.table} WHERE id = $1`, [id]);
          return rows[0] ? fromRow<T>(def, rows[0]) : null;
        }
        const sets = fields.map((x, i) => `${x.column} = $${i + 1}`).join(", ");
        const rows = await (
          await sql()
        ).query(`UPDATE ${def.table} SET ${sets} WHERE id = $${fields.length + 1} RETURNING *`, [
          ...fields.map(x => (x.encode ? x.encode(changes[x.key]) : changes[x.key])),
          id,
        ]);
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
        return (await (await sql()).query(`DELETE FROM ${def.table} WHERE id = $1 RETURNING id`, [id])).length > 0;
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

/** Older enquiries; `deleted: true` lists the ones in Deleted instead. */
export const getEnquiries = async ({ deleted = false } = {}) =>
  (await enquiries.list()).filter(e => !!e.deletedAt === deleted);
export const addEnquiry = (e: Omit<Enquiry, "id" | "createdAt" | "status">) => enquiries.add({ ...e, status: "new" });
/** Changes an enquiry's status; null when it doesn't exist or is in Deleted. */
export async function updateEnquiryStatus(id: string, status: Enquiry["status"]) {
  const current = (await enquiries.list()).find(e => e.id === id && !e.deletedAt);
  return current ? enquiries.update(id, { status }) : null;
}
/** Moves an enquiry to Deleted, from where it can be restored for 30 days. */
export async function deleteEnquiry(id: string) {
  const current = (await enquiries.list()).find(e => e.id === id && !e.deletedAt);
  return !!current && !!(await enquiries.update(id, { deletedAt: new Date().toISOString() }));
}
export async function restoreEnquiry(id: string) {
  const current = (await enquiries.list()).find(e => e.id === id && e.deletedAt);
  return !!current && !!(await enquiries.update(id, { deletedAt: null } as unknown as Partial<Enquiry>));
}
/** Erase an enquiry that is already in Deleted (e.g. when a guest asks for their data to be erased). */
export async function eraseEnquiry(id: string) {
  const current = (await enquiries.list()).find(e => e.id === id && e.deletedAt);
  return !!current && enquiries.remove(id);
}
/** Thrown when another offer already uses the code: guests could not tell which offer they were given. */
export class OfferCodeTakenError extends ConflictError {
  constructor(code: string, title: string) {
    super(`The code "${code}" is already used by the offer “${title}”. Choose a different code.`);
    this.name = "OfferCodeTakenError";
  }
}
/** Codes are saved in capitals, as guests see them and as the booking form sends them. */
const offerCode = (value: unknown) => (typeof value === "string" ? value.trim().toUpperCase() : "");
async function withFreeCode<T extends Partial<Offer>>(changes: T, id?: string): Promise<T> {
  if (changes.code === undefined) return changes;
  const code = offerCode(changes.code);
  const clash = code && (await offers.list()).find(o => o.id !== id && offerCode(o.code) === code);
  if (clash) throw new OfferCodeTakenError(code, clash.title);
  return { ...changes, code };
}
export const getOffers = offers.list,
  addOffer = async (offer: Omit<Offer, "id" | "createdAt">) => offers.add(await withFreeCode(offer)),
  updateOffer = async (id: string, updates: Partial<Offer>) => offers.update(id, await withFreeCode(updates, id)),
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
// Rooms: addressed by a stable id, never by list position or name.
// Postgres uses the serial `idx` key; JSON rooms get an id from their name on first read.
// Guests reach a room at /rooms/<slug>. Renaming a room keeps its slug. When staff change the slug, the old one is
// kept in previousSlugs so existing links redirect to the new address.
// ============================================================
const ROOM_FACTS = ["size", "bed", "occupancy", "bathroom", "location", "view"] as const;
const ROOM_FIELDS = [
  "slug",
  "name",
  "text",
  "image",
  "rate",
  "sampleRate",
  "sample",
  "hidden",
  ...ROOM_FACTS,
  "inRoom",
  "services",
] as const;
type RoomInput = Omit<Room, "id" | "previousSlugs">;
/** Postgres column per room field where the names differ. Lists are stored as JSON text. */
const ROOM_COLUMNS: Record<string, string> = {
  inRoom: "in_room",
  previousSlugs: "previous_slugs",
  view: "room_view",
  sampleRate: "sample_rate",
};
const ROOM_LISTS = new Set(["inRoom", "services", "previousSlugs"]);
const roomColumn = (key: string) => ROOM_COLUMNS[key] ?? key;
const encodeRoomValue = (key: string, value: unknown) => (ROOM_LISTS.has(key) ? JSON.stringify(value ?? []) : value);

/** Thrown when a room's web address is already used by another room. */
export class RoomAddressTakenError extends ConflictError {
  constructor(slug: string) {
    super(`The web address "${slug}" is already used by another room. Choose a different one.`);
    this.name = "RoomAddressTakenError";
  }
}

const pickRoom = (input: Partial<Room>) =>
  Object.fromEntries(ROOM_FIELDS.filter(k => input[k] !== undefined).map(k => [k, input[k]])) as Partial<RoomInput>;
/** `base`, or `base-2`, `base-3` … whichever is not taken yet. */
function freeSlug(base: string, taken: Set<string>) {
  const root = base || "room";
  let candidate = root;
  for (let n = 2; taken.has(candidate); n++) candidate = root + "-" + n;
  return candidate;
}
/** Old addresses after moving from `from` to `to`: `from` is added, `to` is live again, so it is no longer old. */
const movedSlugs = (previous: string[], from: string, to: string) =>
  [...new Set([...previous, from])].filter(s => s && s !== to).slice(-20);
const parseList = (value: unknown): string[] => {
  try {
    const list = JSON.parse(String(value ?? "[]"));
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
};

/**
 * Rooms saved before facts, inclusions and slugs were part of the record. Inclusions come from the built-in room
 * with the same name (they used to be looked up by name). Sample rooms used to show a photo chosen by name instead
 * of their stored image, so that photo becomes the stored image and guests keep seeing the same picture.
 */
const LEGACY_SAMPLE_PHOTOS: Record<string, string> = {
  "Family Room": "/images/image-40.jpeg",
  Suite: "/images/image-17.jpeg",
};
function legacyRoomUpgrade(room: { name: string; sample?: boolean }) {
  const builtIn = SITE_CONFIG.rooms.find(r => r.name === room.name);
  return {
    inRoom: builtIn?.inRoom ?? [],
    services: builtIn?.services ?? [],
    ...(room.sample ? { image: LEGACY_SAMPLE_PHOTOS[room.name] ?? "/images/image-49.jpeg" } : {}),
  };
}

function normalizeRooms(data: DB): DB {
  const ids = new Set<string>(),
    slugs = new Set<string>();
  for (const room of data.config.rooms) {
    room.id = room.id && !ids.has(room.id) ? room.id : freeSlug(slugify(room.name), ids);
    ids.add(room.id);
    if (room.inRoom === undefined) Object.assign(room, legacyRoomUpgrade(room));
    room.services ??= [];
    for (const key of ROOM_FACTS) room[key] ??= "";
    room.slug = room.slug && !slugs.has(room.slug) ? room.slug : freeSlug(slugify(room.name), slugs);
    slugs.add(room.slug);
  }
  return data;
}

const roomRow = (r: Record<string, unknown>): Room =>
  ({
    id: String(r.idx),
    slug: r.slug ?? "",
    previousSlugs: parseList(r.previous_slugs),
    name: r.name,
    text: r.text,
    image: r.image,
    rate: r.rate,
    sampleRate: !!r.sample_rate,
    sample: !!r.sample,
    hidden: !!r.hidden,
    ...Object.fromEntries(ROOM_FACTS.map(k => [k, r[roomColumn(k)] ?? ""])),
    inRoom: parseList(r.in_room),
    services: parseList(r.services),
  }) as Room;
const pgRoomKey = (id: string) => (/^\d+$/.test(id) ? Number(id) : null);
const isUniqueViolation = (error: unknown) => (error as { code?: string })?.code === "23505";

let roomSetup: Promise<void> | undefined;
/** Add the newer room columns, give older rows a slug and their inclusions once, then enforce unique slugs. */
async function prepareRooms() {
  if (!IS_POSTGRES) return;
  roomSetup ??= (async () => {
    const sql = getSQL();
    // in_room has no default, so rows saved before this change are recognisable (NULL) and upgraded once.
    await sql.query("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS in_room TEXT");
    await sql.query("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS slug TEXT");
    await sql.query("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS previous_slugs TEXT DEFAULT '[]'");
    await sql.query("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS services TEXT DEFAULT '[]'");
    // Rooms stored before sample_rate existed get it once: a room still showing its seeded name and rate is a sample.
    await sql.query("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS sample_rate BOOLEAN");
    const seeded = SITE_CONFIG.rooms.filter(r => r.sampleRate);
    if (seeded.length)
      await sql.query(
        `UPDATE rooms SET sample_rate = ((name, rate) IN (${seeded.map((_, i) => `($${2 * i + 1}, $${2 * i + 2})`).join(", ")})) WHERE sample_rate IS NULL`,
        seeded.flatMap(r => [r.name, r.rate]),
      );
    else await sql.query("UPDATE rooms SET sample_rate = false WHERE sample_rate IS NULL");
    await sql.query("ALTER TABLE rooms ALTER COLUMN sample_rate SET DEFAULT false");
    for (const key of ROOM_FACTS)
      await sql.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS ${roomColumn(key)} TEXT DEFAULT ''`);
    const rows: Record<string, unknown>[] = await sql.query("SELECT * FROM rooms ORDER BY idx");
    const taken = new Set(rows.map(r => String(r.slug ?? "")).filter(Boolean));
    for (const r of rows) {
      const changes: Record<string, unknown> = {};
      if (!r.slug) taken.add((changes.slug = freeSlug(slugify(String(r.name)), taken)));
      if (r.in_room == null) {
        const upgrade = legacyRoomUpgrade({ name: String(r.name), sample: !!r.sample });
        changes.in_room = JSON.stringify(upgrade.inRoom);
        changes.services = JSON.stringify(upgrade.services);
        if (upgrade.image) changes.image = upgrade.image;
      }
      const columns = Object.keys(changes);
      if (columns.length)
        await sql.query(
          `UPDATE rooms SET ${columns.map((c, i) => `${c} = $${i + 1}`).join(", ")} WHERE idx = $${columns.length + 1}`,
          [...Object.values(changes), r.idx],
        );
    }
    await sql.query("CREATE UNIQUE INDEX IF NOT EXISTS rooms_slug_key ON rooms (slug)");
  })().catch(error => {
    roomSetup = undefined;
    throw error;
  });
  await roomSetup;
}

export async function getRooms(): Promise<Room[]> {
  if (IS_POSTGRES) {
    await prepareRooms();
    return (await getSQL().query("SELECT * FROM rooms ORDER BY idx")).map(roomRow);
  }
  return readDB().config.rooms;
}
/** A new room gets the slug it was given, or one made from its name. A slug already in use is refused. */
export async function addRoom(input: Omit<RoomInput, "slug"> & { slug?: string }): Promise<Room> {
  const room = {
    inRoom: [],
    services: [],
    ...Object.fromEntries(ROOM_FACTS.map(k => [k, ""])),
    ...pickRoom(input),
  } as RoomInput;
  if (IS_POSTGRES) {
    await prepareRooms();
    const sql = getSQL();
    const taken = new Set<string>((await sql.query("SELECT slug FROM rooms")).map((r: { slug: string }) => r.slug));
    if (room.slug && taken.has(room.slug)) throw new RoomAddressTakenError(room.slug);
    room.slug ||= freeSlug(slugify(room.name), taken);
    const keys = Object.keys(room);
    try {
      const rows = await sql.query(
        `INSERT INTO rooms (${keys.map(roomColumn).join(", ")}) VALUES (${keys.map((_, i) => "$" + (i + 1)).join(", ")}) RETURNING *`,
        keys.map(k => encodeRoomValue(k, room[k as keyof RoomInput])),
      );
      return roomRow(rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new RoomAddressTakenError(room.slug);
      throw error;
    }
  }
  const db = readDB();
  if (room.slug && db.config.rooms.some(r => r.slug === room.slug)) throw new RoomAddressTakenError(room.slug);
  // Never reuse an id older requests point at (a deleted room's, or one a request still names), so a new room with
  // an old name does not take over that room's past requests.
  const usedIds = new Set([
    ...db.config.rooms.map(r => r.id ?? ""),
    ...(db.retiredRoomIds ?? []),
    ...db.bookings.map(b => b.roomId ?? ""),
  ]);
  const created = { ...room, id: freeSlug(slugify(room.name), usedIds), slug: room.slug || "" } as Room;
  db.config.rooms.push(created);
  normalizeRooms(db);
  writeDB(db);
  return created;
}
/** An empty slug keeps the current one. A changed slug keeps the old one as a redirect. */
export async function updateRoom(id: string, updates: Partial<Room>): Promise<Room | null> {
  const changes: Partial<Room> = pickRoom(updates);
  if (!changes.slug) delete changes.slug;
  if (IS_POSTGRES) {
    const key = pgRoomKey(id);
    if (key === null) return null;
    await prepareRooms();
    const sql = getSQL();
    const current = (await sql.query("SELECT * FROM rooms WHERE idx = $1", [key]))[0];
    if (!current) return null;
    if (changes.slug && changes.slug !== current.slug) {
      if ((await sql.query("SELECT idx FROM rooms WHERE slug = $1 AND idx <> $2", [changes.slug, key])).length)
        throw new RoomAddressTakenError(changes.slug);
      changes.previousSlugs = movedSlugs(parseList(current.previous_slugs), current.slug, changes.slug);
    }
    const keys = Object.keys(changes);
    if (!keys.length) return roomRow(current);
    try {
      const rows = await sql.query(
        `UPDATE rooms SET ${keys.map((k, i) => `${roomColumn(k)} = $${i + 1}`).join(", ")} WHERE idx = $${keys.length + 1} RETURNING *`,
        [...keys.map(k => encodeRoomValue(k, changes[k as keyof Room])), key],
      );
      return rows[0] ? roomRow(rows[0]) : null;
    } catch (error) {
      if (isUniqueViolation(error)) throw new RoomAddressTakenError(changes.slug ?? "");
      throw error;
    }
  }
  const db = readDB();
  const room = db.config.rooms.find(r => r.id === id);
  if (!room) return null;
  if (changes.slug && changes.slug !== room.slug) {
    if (db.config.rooms.some(r => r !== room && r.slug === changes.slug)) throw new RoomAddressTakenError(changes.slug);
    changes.previousSlugs = movedSlugs(room.previousSlugs ?? [], room.slug, changes.slug);
  }
  Object.assign(room, changes);
  writeDB(db);
  return room;
}
export async function deleteRoom(id: string): Promise<boolean> {
  if (IS_POSTGRES) {
    const key = pgRoomKey(id);
    if (key === null) return false;
    await prepareRooms();
    return (await getSQL().query("DELETE FROM rooms WHERE idx = $1 RETURNING idx", [key])).length > 0;
  }
  const db = readDB();
  const index = db.config.rooms.findIndex(r => r.id === id);
  if (index === -1) return false;
  db.config.rooms.splice(index, 1);
  db.retiredRoomIds = [...new Set([...(db.retiredRoomIds ?? []), id])];
  writeDB(db);
  return true;
}

// ============================================================
// Bookings and the notification outbox (written in one transaction / one file write)
// ============================================================
type NewBooking = Omit<Booking, "id" | "createdAt" | "paymentId" | "paymentStatus" | "bookingStatus" | "source">;
/** Staff-added bookings choose their status, are marked as staff and queue no guest notification. */
export interface NewBookingOptions {
  status?: "pending" | "confirmed";
  source?: "staff";
  notify?: boolean;
}
function mapBookingRow(r: Record<string, unknown>): Booking {
  return withCouponFields({
    id: r.id,
    name: r.name,
    mobile: r.mobile,
    email: r.email,
    city: r.city,
    country: r.country,
    gender: r.gender,
    roomType: r.room_type,
    roomId: r.room_id ? String(r.room_id) : undefined,
    source: r.source === "staff" ? "staff" : undefined,
    checkin: r.checkin,
    checkout: r.checkout,
    guests: r.guests,
    amount: r.amount,
    paymentStatus: r.payment_status,
    bookingStatus: r.booking_status,
    paymentId: r.payment_id,
    roomsRequested: Number(r.rooms_requested ?? 1),
    specialRequests: String(r.special_requests ?? ""),
    // NULL only on requests saved before these columns existed; newer requests always store a value.
    couponCode: r.coupon_code == null ? undefined : String(r.coupon_code),
    couponOffer: r.coupon_offer == null ? undefined : String(r.coupon_offer),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    ...(r.deleted_at ? { deletedAt: isoString(r.deleted_at) } : {}),
  } as Booking);
}
/**
 * Requests saved before offer codes had their own fields carry the code in the note as "Coupon CODE (Offer) · note".
 * Only those (no coupon field at all) are read this way, so a guest typing that text today cannot fake a code.
 */
const LEGACY_COUPON = /^Coupon (\S{1,30}) \((.{1,100}?)\)(?: · ([\s\S]*))?$/;
function withCouponFields(b: Booking): Booking {
  if (b.couponCode !== undefined || !b.specialRequests) return b;
  const match = LEGACY_COUPON.exec(b.specialRequests);
  return match ? { ...b, couponCode: match[1], couponOffer: match[2], specialRequests: match[3] ?? "" } : b;
}
let bookingSetup: Promise<void> | undefined;
async function prepareBookingExtensions() {
  if (!IS_POSTGRES) return;
  bookingSetup ??= (async () => {
    const sql = getSQL();
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rooms_requested INT DEFAULT 1`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_id TEXT DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_offer TEXT`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
    await sql`CREATE TABLE IF NOT EXISTS notification_outbox (id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`ALTER TABLE notification_outbox ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ`;
  })().catch(error => {
    bookingSetup = undefined;
    throw error;
  });
  await bookingSetup;
}
// Kept separate from the bookings DDL: sign-in needs this table before /api/seed has created any other table.
let adminStateSetup: Promise<void> | undefined;
async function prepareAdminState() {
  if (!IS_POSTGRES) return;
  adminStateSetup ??= (async () => {
    const sql = getSQL();
    await sql`CREATE TABLE IF NOT EXISTS admin_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
  })().catch(error => {
    adminStateSetup = undefined;
    throw error;
  });
  await adminStateSetup;
}
/**
 * Apply every additive schema change now instead of on first use. Run once before launch (via /api/seed), so a
 * production role that cannot ALTER tables fails during setup rather than on a guest's request.
 */
export async function prepareStorage() {
  if (!IS_POSTGRES) return;
  await prepareBookingExtensions();
  await prepareAdminState();
  await prepareRooms();
  await prepareSettings();
  await prepareAudit();
  for (const def of [ENQUIRIES, OFFERS, BANQUET, DINING, REVIEWS])
    for (const statement of def.migrations ?? []) await getSQL().query(statement);
}

/**
 * Guest self-service lookup. Needs the email given with the request plus either the full reference or
 * the 8+ character short reference shown on the receipt.
 */
export async function getBookingByIdAndEmail(reference: string, email: string): Promise<Booking | null> {
  const ref = reference.trim().toLowerCase(),
    wanted = email.trim().toLowerCase();
  // References are UUIDs. Anything else cannot match, which also keeps LIKE wildcards out of the query.
  if (!/^[0-9a-f-]{8,36}$/.test(ref) || !wanted) return null;
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows =
      await sql`SELECT * FROM bookings WHERE id LIKE ${ref + "%"} AND LOWER(TRIM(email)) = ${wanted} AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`;
    return rows[0] ? mapBookingRow(rows[0]) : null;
  }
  return (
    (await getBookings()).find(
      b => b.id.toLowerCase().startsWith(ref) && !!b.email && b.email.trim().toLowerCase() === wanted,
    ) ?? null
  );
}
/** A request that is not in Deleted, or null. */
export async function getBooking(id: string): Promise<Booking | null> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows = await sql`SELECT * FROM bookings WHERE id = ${id} AND deleted_at IS NULL`;
    return rows[0] ? mapBookingRow(rows[0]) : null;
  }
  return readDB().bookings.find(b => b.id === id && !b.deletedAt) ?? null;
}

/**
 * Delete requests (bookings with their notification events, and enquiries) sent before `before` whose requested
 * dates are also before it. Used by the retention job so the privacy notice's deletion promise holds.
 */
export async function purgeRequestsBefore(before: Date): Promise<number> {
  const sentBefore = before.toISOString(),
    datesBefore = sentBefore.slice(0, 10);
  const expired = (r: { createdAt: string; checkin?: string; checkout?: string }) =>
    r.createdAt < sentBefore && (r.checkin || "") < datesBefore && (r.checkout || "") < datesBefore;
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const [bookings, enquiries] = await sql.transaction([
      sql`WITH gone AS (DELETE FROM bookings WHERE created_at < ${sentBefore} AND COALESCE(checkin, '') < ${datesBefore} AND COALESCE(checkout, '') < ${datesBefore} RETURNING id), events AS (DELETE FROM notification_outbox WHERE booking_id IN (SELECT id FROM gone)) SELECT COUNT(*)::int AS n FROM gone`,
      sql`WITH gone AS (DELETE FROM enquiries WHERE created_at < ${sentBefore} AND COALESCE(checkin, '') < ${datesBefore} AND COALESCE(checkout, '') < ${datesBefore} RETURNING id) SELECT COUNT(*)::int AS n FROM gone`,
    ]);
    return Number(bookings[0]?.n ?? 0) + Number(enquiries[0]?.n ?? 0);
  }
  const db = readDB();
  const gone = new Set(db.bookings.filter(expired).map(b => b.id));
  const enquiryCount = db.enquiries.length;
  db.enquiries = db.enquiries.filter(e => !expired(e));
  const removed = gone.size + enquiryCount - db.enquiries.length;
  if (!removed) return 0;
  db.bookings = db.bookings.filter(b => !gone.has(b.id));
  db.notificationJobs = db.notificationJobs!.filter(j => !gone.has(j.bookingId));
  writeDB(db);
  return removed;
}
/** Statuses that still need staff: always loaded with the recent requests, however old the request is. */
const OPEN_STATUSES = ["pending", "confirmed", "checked-in"];
export interface BookingQuery {
  /** Recent and open requests: sent on or after this day, with dates on or after it, or still open. */
  since?: string;
  /** One page of older requests: sent before this moment (ISO), newest first, at most `limit`. */
  before?: string;
  /** With `before`: the last request of the previous page, so requests sent in the same millisecond aren't skipped. */
  beforeId?: string;
  limit?: number;
  /** Requests whose stay or event touches these days (YYYY-MM-DD, inclusive), for a calendar month. */
  staysFrom?: string;
  staysTo?: string;
  /** The requests in Deleted instead (most recently deleted first). */
  deleted?: boolean;
}
/** Requests newest first. Without options: every request not in Deleted. */
export async function getBookings({
  since,
  before,
  beforeId = "",
  limit = 200,
  staysFrom,
  staysTo,
  deleted = false,
}: BookingQuery = {}): Promise<Booking[]> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows = deleted
      ? await sql`SELECT * FROM bookings WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
      : since
        ? await sql`SELECT * FROM bookings WHERE deleted_at IS NULL AND (created_at >= ${since + "T00:00:00Z"} OR checkin >= ${since} OR checkout >= ${since} OR booking_status = ANY(${OPEN_STATUSES})) ORDER BY created_at DESC`
        : before
          ? await sql`SELECT * FROM bookings WHERE deleted_at IS NULL AND (created_at < ${before} OR (created_at = ${before} AND id < ${beforeId})) ORDER BY created_at DESC, id DESC LIMIT ${limit}`
          : staysFrom && staysTo
            ? await sql`SELECT * FROM bookings WHERE deleted_at IS NULL AND checkin <> '' AND checkin <= ${staysTo} AND COALESCE(NULLIF(checkout, ''), checkin) >= ${staysFrom} ORDER BY created_at DESC`
            : await sql`SELECT * FROM bookings WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return rows.map(mapBookingRow);
  }
  const all = readDB().bookings;
  if (deleted) return all.filter(b => b.deletedAt).sort((a, b) => b.deletedAt!.localeCompare(a.deletedAt!));
  const live = all
    .filter(b => !b.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  if (since)
    return live.filter(
      b =>
        b.createdAt >= since ||
        (b.checkin || "") >= since ||
        (b.checkout || "") >= since ||
        OPEN_STATUSES.includes(b.bookingStatus),
    );
  if (before)
    return live
      .filter(b => b.createdAt < before || (b.createdAt === before && !!beforeId && b.id < beforeId))
      .slice(0, limit);
  if (staysFrom && staysTo)
    return live.filter(b => !!b.checkin && b.checkin <= staysTo && (b.checkout || b.checkin) >= staysFrom);
  return live;
}
export async function addBooking(b: NewBooking, options: NewBookingOptions = {}): Promise<Booking> {
  const { status = "pending", source, notify = true } = options;
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  const booking: Booking = {
    ...b,
    id,
    createdAt: now,
    paymentId: "",
    paymentStatus: "pending",
    bookingStatus: status,
    ...(source ? { source } : {}),
  };
  if (IS_POSTGRES) {
    const sql = getSQL();
    await prepareBookingExtensions();
    const insert = sql`INSERT INTO bookings (
        id, name, mobile, email, city, country, gender, room_type, checkin, checkout, guests, amount,
        payment_status, booking_status, payment_id, created_at, rooms_requested, special_requests, room_id, source, coupon_code, coupon_offer) VALUES (${id}, ${b.name}, ${b.mobile}, ${b.email}, ${b.city}, ${b.country}, ${b.gender}, ${b.roomType}, ${b.checkin}, ${b.checkout}, ${b.guests}, ${b.amount}, 'pending', ${status}, '', ${now}, ${b.roomsRequested ?? 1}, ${b.specialRequests ?? ""}, ${b.roomId ?? ""}, ${source ?? ""}, ${b.couponCode ?? ""}, ${b.couponOffer ?? ""})`;
    // A website request and its notification event are saved together; a staff booking has no event.
    if (notify)
      await sql.transaction([
        insert,
        sql`INSERT INTO notification_outbox (id, booking_id, status, attempts, created_at) VALUES (${id}, ${id}, 'pending', 0, ${now})`,
      ]);
    else await sql.transaction([insert]);
    return booking;
  }
  const db = readDB();
  db.bookings.push(booking);
  if (notify) db.notificationJobs!.push({ id, bookingId: id, status: "pending", attempts: 0, createdAt: now });
  writeDB(db);
  return booking;
}
/** Staff can only change a request's status. Payment fields are not used: no payments are taken. */
export async function updateBooking(id: string, updates: Pick<Booking, "bookingStatus">): Promise<Booking | null> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows =
      await sql`UPDATE bookings SET booking_status = ${updates.bookingStatus} WHERE id = ${id} AND deleted_at IS NULL RETURNING *`;
    return rows[0] ? mapBookingRow(rows[0]) : null;
  }
  const db = readDB();
  const booking = db.bookings.find(x => x.id === id && !x.deletedAt);
  if (!booking) return null;
  booking.bookingStatus = updates.bookingStatus;
  writeDB(db);
  return booking;
}
/**
 * Moves a request to Deleted. It disappears from the dashboard and tracking, its queued notification waits unsent,
 * and it can be restored for 30 days before the retention job erases it.
 */
export async function deleteBooking(id: string): Promise<boolean> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows = await sql`UPDATE bookings SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL RETURNING id`;
    return rows.length > 0;
  }
  const db = readDB();
  const booking = db.bookings.find(x => x.id === id && !x.deletedAt);
  if (!booking) return false;
  booking.deletedAt = new Date().toISOString();
  writeDB(db);
  return true;
}
/** Whether a request is in Deleted (restorable), as opposed to erased or never stored. */
export async function isBookingInDeleted(id: string): Promise<boolean> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    return (await sql`SELECT id FROM bookings WHERE id = ${id} AND deleted_at IS NOT NULL`).length > 0;
  }
  return readDB().bookings.some(b => b.id === id && !!b.deletedAt);
}
/** Brings a request back from Deleted. */
export async function restoreBooking(id: string): Promise<boolean> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows =
      await sql`UPDATE bookings SET deleted_at = NULL WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING id`;
    return rows.length > 0;
  }
  const db = readDB();
  const booking = db.bookings.find(x => x.id === id && x.deletedAt);
  if (!booking) return false;
  delete booking.deletedAt;
  writeDB(db);
  return true;
}
/** Erases a request that is already in Deleted, with its notification event (e.g. a guest's erasure request). */
export async function eraseBooking(id: string): Promise<boolean> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows =
      await sql`WITH gone AS (DELETE FROM bookings WHERE id = ${id} AND deleted_at IS NOT NULL RETURNING id), events AS (DELETE FROM notification_outbox WHERE booking_id IN (SELECT id FROM gone)) SELECT COUNT(*)::int AS n FROM gone`;
    return Number(rows[0]?.n ?? 0) > 0;
  }
  const db = readDB();
  if (!db.bookings.some(x => x.id === id && x.deletedAt)) return false;
  db.bookings = db.bookings.filter(x => x.id !== id);
  db.notificationJobs = db.notificationJobs!.filter(j => j.bookingId !== id);
  writeDB(db);
  return true;
}
/** Erase everything that went into Deleted before `before` (the retention job passes 30 days ago). */
export async function purgeDeletedBefore(before: Date): Promise<number> {
  const cutoff = before.toISOString();
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    for (const statement of ENQUIRIES.migrations ?? []) await getSQL().query(statement);
    const sql = getSQL();
    const [bookings, enquiryRows] = await sql.transaction([
      sql`WITH gone AS (DELETE FROM bookings WHERE deleted_at < ${cutoff} RETURNING id), events AS (DELETE FROM notification_outbox WHERE booking_id IN (SELECT id FROM gone)) SELECT COUNT(*)::int AS n FROM gone`,
      sql`WITH gone AS (DELETE FROM enquiries WHERE deleted_at IS NOT NULL AND deleted_at < ${cutoff} RETURNING id) SELECT COUNT(*)::int AS n FROM gone`,
    ]);
    return Number(bookings[0]?.n ?? 0) + Number(enquiryRows[0]?.n ?? 0);
  }
  const db = readDB();
  const expired = (r: { deletedAt?: string | null }) => !!r.deletedAt && r.deletedAt < cutoff;
  const gone = new Set(db.bookings.filter(expired).map(b => b.id));
  const enquiryCount = db.enquiries.length;
  db.enquiries = db.enquiries.filter(e => !expired(e));
  const removed = gone.size + enquiryCount - db.enquiries.length;
  if (!removed) return 0;
  db.bookings = db.bookings.filter(b => !gone.has(b.id));
  db.notificationJobs = db.notificationJobs!.filter(j => !gone.has(j.bookingId));
  writeDB(db);
  return removed;
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
      createdAt: isoString(r.created_at),
      lastAttemptAt: r.last_attempt_at ? isoString(r.last_attempt_at) : undefined,
    }));
  }
  return readDB().notificationJobs!;
}
const isoString = (value: unknown) => (value instanceof Date ? value.toISOString() : String(value));
/** After this many failed deliveries an event is marked "failed", so it stops taking retry slots from newer ones. */
export const MAX_NOTIFICATION_ATTEMPTS = 8;
/**
 * An event picked up in the last 5 minutes is never picked up again, even by a forced retry. A delivery run sends at
 * most 10 events with a 4-second timeout each, so this comfortably covers a run still in progress, which makes it
 * unlikely that overlapping runs send an event twice. Delivery is still at least once: receivers deduplicate.
 */
export const NOTIFICATION_CLAIM_GUARD_MINUTES = 5;
/**
 * Minutes to wait after an attempt before trying an event again: 5, 10, 20 … capped at 6 hours, so an outage at the
 * receiver uses up the 8 attempts over about 10 hours instead of in a few clicks. Never less than the claim guard.
 */
export const notificationRetryDelayMinutes = (attempts: number) =>
  Math.max(NOTIFICATION_CLAIM_GUARD_MINUTES, Math.min(5 * 2 ** (attempts - 1), 360));

/**
 * Pick up to `limit` pending events that are due (least-attempted first, then oldest) and stamp them as being
 * attempted now, in one step, so an overlapping retry run skips them. `force` (staff pressing Retry, e.g. after
 * fixing the receiver) skips the back-off but still respects the claim guard.
 */
export async function claimNotificationJobs({
  limit = 10,
  bookingId,
  force = false,
}: { limit?: number; bookingId?: string; force?: boolean } = {}): Promise<NotificationJob[]> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows = await sql`UPDATE notification_outbox SET last_attempt_at = NOW() WHERE id IN (
      SELECT id FROM notification_outbox
      WHERE status = 'pending' AND (${bookingId ?? null}::text IS NULL OR booking_id = ${bookingId ?? null})
        AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = notification_outbox.booking_id AND b.deleted_at IS NOT NULL)
        AND (last_attempt_at IS NULL OR last_attempt_at <= NOW() - (CASE WHEN ${force} THEN ${NOTIFICATION_CLAIM_GUARD_MINUTES} ELSE GREATEST(${NOTIFICATION_CLAIM_GUARD_MINUTES}, LEAST(5 * POWER(2, attempts - 1), 360)) END) * INTERVAL '1 minute')
      ORDER BY attempts ASC, created_at ASC LIMIT ${limit} FOR UPDATE SKIP LOCKED
    ) RETURNING *`;
    return rows
      .map((r: Record<string, unknown>) => ({
        id: String(r.id),
        bookingId: String(r.booking_id),
        status: r.status as NotificationJob["status"],
        attempts: Number(r.attempts),
        createdAt: isoString(r.created_at),
        lastAttemptAt: isoString(r.last_attempt_at),
      }))
      .sort(
        (a: NotificationJob, b: NotificationJob) => a.attempts - b.attempts || a.createdAt.localeCompare(b.createdAt),
      );
  }
  const db = readDB();
  const now = Date.now();
  const inDeleted = deletedIds(db);
  const due = db
    .notificationJobs!.filter(
      j =>
        j.status === "pending" &&
        !inDeleted.has(j.bookingId) &&
        (!bookingId || j.bookingId === bookingId) &&
        (!j.lastAttemptAt ||
          Date.parse(j.lastAttemptAt) <=
            now - (force ? NOTIFICATION_CLAIM_GUARD_MINUTES : notificationRetryDelayMinutes(j.attempts ?? 0)) * 60_000),
    )
    .sort((a, b) => (a.attempts ?? 0) - (b.attempts ?? 0) || a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
  if (!due.length) return [];
  for (const job of due) job.lastAttemptAt = new Date(now).toISOString();
  writeDB(db);
  return due.map(j => ({ ...j }));
}
export async function countNotifications(): Promise<Record<NotificationJob["status"], number>> {
  const counts = { pending: 0, delivered: 0, failed: 0 };
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    for (const r of await sql`SELECT status, COUNT(*)::int AS n FROM notification_outbox WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = notification_outbox.booking_id AND b.deleted_at IS NOT NULL) GROUP BY status`)
      if (r.status in counts) counts[r.status as keyof typeof counts] = Number(r.n);
    return counts;
  }
  const db = readDB();
  const inDeleted = deletedIds(db);
  for (const j of db.notificationJobs!) if (j.status in counts && !inDeleted.has(j.bookingId)) counts[j.status]++;
  return counts;
}
/** Requests in Deleted: their notification events wait (unsent, uncounted) until the request is restored or erased. */
const deletedIds = (db: DB) => new Set(db.bookings.filter(b => b.deletedAt).map(b => b.id));
/** Remove an event whose request no longer exists, so it cannot hold a retry slot. */
export async function discardNotification(id: string) {
  if (IS_POSTGRES) {
    const sql = getSQL();
    await sql`DELETE FROM notification_outbox WHERE id = ${id}`;
    return;
  }
  const db = readDB();
  const count = db.notificationJobs!.length;
  db.notificationJobs = db.notificationJobs!.filter(j => j.id !== id);
  if (db.notificationJobs.length !== count) writeDB(db);
}
export async function markNotification(id: string, delivered: boolean) {
  if (IS_POSTGRES) {
    const sql = getSQL();
    await sql`UPDATE notification_outbox SET status = CASE WHEN status = 'delivered' OR ${delivered} THEN 'delivered' WHEN attempts + 1 >= ${MAX_NOTIFICATION_ATTEMPTS} THEN 'failed' ELSE 'pending' END, attempts = attempts + 1 WHERE id = ${id}`;
    return;
  }
  const db = readDB();
  const job = db.notificationJobs!.find(j => j.id === id);
  if (job) {
    job.attempts++;
    job.status =
      job.status === "delivered" || delivered
        ? "delivered"
        : job.attempts >= MAX_NOTIFICATION_ATTEMPTS
          ? "failed"
          : "pending";
    writeDB(db);
  }
}
/** Put failed events back in the queue with a fresh attempt count. Returns how many were requeued. */
export async function requeueFailedNotifications(): Promise<number> {
  if (IS_POSTGRES) {
    await prepareBookingExtensions();
    const sql = getSQL();
    const rows =
      await sql`UPDATE notification_outbox SET status = 'pending', attempts = 0, last_attempt_at = NULL WHERE status = 'failed' RETURNING id`;
    return rows.length;
  }
  const db = readDB();
  const failed = db.notificationJobs!.filter(j => j.status === "failed");
  for (const job of failed) {
    job.status = "pending";
    job.attempts = 0;
    delete job.lastAttemptAt;
  }
  if (failed.length) writeDB(db);
  return failed.length;
}

// ============================================================
// Admin sessions: signing out bumps a version number that every session token carries,
// which ends all sessions of the shared admin account at once.
// ============================================================
export async function getSessionVersion(): Promise<number> {
  if (IS_POSTGRES) {
    await prepareAdminState();
    const sql = getSQL();
    const rows = await sql`SELECT value FROM admin_state WHERE key = 'session_version'`;
    return Number(rows[0]?.value ?? 0);
  }
  return readDB().adminState?.sessionVersion ?? 0;
}
export async function bumpSessionVersion(): Promise<number> {
  if (IS_POSTGRES) {
    await prepareAdminState();
    const sql = getSQL();
    const rows =
      await sql`INSERT INTO admin_state (key, value) VALUES ('session_version', '1') ON CONFLICT (key) DO UPDATE SET value = (admin_state.value::int + 1)::text RETURNING value`;
    return Number(rows[0].value);
  }
  const db = readDB();
  db.adminState = { ...db.adminState, sessionVersion: (db.adminState?.sessionVersion ?? 0) + 1 };
  writeDB(db);
  return db.adminState.sessionVersion!;
}

// ============================================================
// Hotel settings (policies and privacy facts, Admin → Settings). Only values staff changed are stored; the rest
// come from DEFAULT_SETTINGS, so a new default reaches sites that never changed that value.
// ============================================================
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof HotelSettings)[];
const storedSettings = (value: unknown): Partial<HotelSettings> => {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(SETTING_KEYS.filter(k => record[k] !== undefined).map(k => [k, record[k]]));
};
let settingsSetup: Promise<void> | undefined;
async function prepareSettings() {
  if (!IS_POSTGRES) return;
  settingsSetup ??= (async () => {
    await getSQL().query("CREATE TABLE IF NOT EXISTS hotel_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  })().catch(error => {
    settingsSetup = undefined;
    throw error;
  });
  await settingsSetup;
}
async function readStoredSettings(): Promise<Partial<HotelSettings>> {
  if (IS_POSTGRES) {
    await prepareSettings();
    const rows = await getSQL().query("SELECT value FROM hotel_settings WHERE key = 'hotel'");
    return storedSettings(rows[0] ? JSON.parse(String(rows[0].value)) : {});
  }
  return storedSettings(readDB().settings);
}
export async function getSettings(): Promise<HotelSettings> {
  return { ...DEFAULT_SETTINGS, ...(await readStoredSettings()) };
}
/** Saves only the given settings, merged into the stored ones in one step, so two saves never undo each other. */
export async function updateSettings(changes: Partial<HotelSettings>): Promise<HotelSettings> {
  if (IS_POSTGRES) {
    await prepareSettings();
    const rows = await getSQL().query(
      "INSERT INTO hotel_settings (key, value) VALUES ('hotel', $1) ON CONFLICT (key) DO UPDATE SET value = (hotel_settings.value::jsonb || EXCLUDED.value::jsonb)::text RETURNING value",
      [JSON.stringify(storedSettings(changes))],
    );
    return { ...DEFAULT_SETTINGS, ...storedSettings(JSON.parse(String(rows[0]?.value ?? "{}"))) };
  }
  const db = readDB();
  db.settings = { ...storedSettings(db.settings), ...storedSettings(changes) };
  writeDB(db);
  return { ...DEFAULT_SETTINGS, ...db.settings };
}

// ============================================================
// Activity log: who changed what in the admin. Entries name requests by reference, never by guest details.
// ============================================================
/** Entries kept in the local file; Postgres keeps about 13 months. */
const MAX_LOCAL_AUDIT_ENTRIES = 2000;
let auditSetup: Promise<void> | undefined;
async function prepareAudit() {
  if (!IS_POSTGRES) return;
  auditSetup ??= (async () => {
    const sql = getSQL();
    await sql.query(
      "CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT NOW(), actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, target_id TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '')",
    );
    await sql.query("CREATE INDEX IF NOT EXISTS audit_log_at ON audit_log (at DESC)");
  })().catch(error => {
    auditSetup = undefined;
    throw error;
  });
  await auditSetup;
}
export async function addAuditEntry(entry: Omit<AuditEntry, "id" | "at">): Promise<void> {
  const item: AuditEntry = { ...entry, id: crypto.randomUUID(), at: new Date().toISOString() };
  if (IS_POSTGRES) {
    await prepareAudit();
    const sql = getSQL();
    await sql.transaction([
      sql`INSERT INTO audit_log (id, at, actor, action, target, target_id, summary) VALUES (${item.id}, ${item.at}, ${item.actor}, ${item.action}, ${item.target}, ${item.targetId}, ${item.summary})`,
      sql`DELETE FROM audit_log WHERE at < NOW() - INTERVAL '400 days'`,
    ]);
    return;
  }
  const db = readDB();
  db.auditLog = [...(db.auditLog ?? []), item].slice(-MAX_LOCAL_AUDIT_ENTRIES);
  writeDB(db);
}
/** The latest entries, newest first. */
export async function getAuditLog(limit = 200): Promise<AuditEntry[]> {
  if (IS_POSTGRES) {
    await prepareAudit();
    const rows = await getSQL().query("SELECT * FROM audit_log ORDER BY at DESC LIMIT $1", [limit]);
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      at: isoString(r.at),
      actor: String(r.actor),
      action: String(r.action),
      target: String(r.target),
      targetId: String(r.target_id ?? ""),
      summary: String(r.summary ?? ""),
    }));
  }
  return [...(readDB().auditLog ?? [])].reverse().slice(0, limit);
}
