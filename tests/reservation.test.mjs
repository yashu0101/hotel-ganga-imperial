import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import path from "node:path";
import * as nodeCrypto from "node:crypto";
import { createHmac } from "node:crypto";
import * as jose from "jose";
// Silent logger used unless a test passes its own "@/lib/log" mock.
const silentLog = { logError: () => {}, logWarning: () => {} };
function load(file, mocks = {}, runtime = {}) {
  mocks = { "@/lib/log": silentLog, ...mocks };
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", "process", "fetch", source)(
    id => {
      if (!(id in mocks)) throw Error("Unexpected dependency: " + id);
      return mocks[id];
    },
    compiledModule,
    compiledModule.exports,
    runtime.process || process,
    runtime.fetch || fetch,
  );
  return compiledModule.exports;
}
const dates = load("src/lib/reservation.ts");
const future = "2099-01-10";
const response = { NextResponse: { json: (value, options = {}) => Response.json(value, options) } };
const records = [];
const db = {
  StorageUnavailableError: class extends Error {},
  getRooms: async () => [{ name: "Deluxe Room", hidden: false }],
  getBanquetPackages: async () => [{ name: "Gold", active: true }],
  getOffers: async () => [
    {
      title: "Early Bird",
      discount: "20%",
      code: "EARLY20",
      validFrom: "2000-01-01",
      validTo: "2999-12-31",
      active: true,
    },
    { title: "Old", discount: "10%", code: "OLD10", validFrom: "2000-01-01", validTo: "2000-12-31", active: true },
  ],
  addBooking: async b => {
    records.push(b);
    return { ...b, id: "request-reference" };
  },
};
const offersForTests = db.getOffers;
const booking = load("src/app/api/book/route.ts", {
  "@/lib/notifications": { deliverNotifications: async () => ({ configured: false }) },
  "next/server": response,
  "@/lib/db": db,
  "@/lib/reservation": dates,
  "@/lib/request-limit": { allowRequest: () => true, clientKey: () => "test" },
});
const payload = {
  name: "Test Guest",
  mobile: "+919999999999",
  email: "",
  roomType: "Deluxe Room",
  checkin: future,
  checkout: "2099-01-12",
  guests: 2,
};
const request = b =>
  new Request("http://localhost/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(b),
  });
test("rejects impossible dates, past dates and non-overnight stays", () => {
  assert.equal(dates.validDate("2099-02-30"), false);
  assert.ok(dates.dateError("2000-01-01", "2000-01-02", true));
  assert.ok(dates.dateError(future, future, true));
  assert.ok(dates.dateError(future, "", true));
  assert.equal(dates.dateError(future, "", false), "");
});
test("accepts multiple requests for the same category without falsely reserving all inventory", async () => {
  assert.equal((await booking.POST(request(payload))).status, 201);
  assert.equal((await booking.POST(request(payload))).status, 201);
  assert.equal(records.length, 2);
  assert.equal(records[0].amount, 0);
});
test("rejects unknown rooms, invalid guest counts and incomplete stays", async () => {
  for (const change of [
    { roomType: "Invalid" },
    { guests: -1 },
    { guests: 1.5 },
    { guests: 21 },
    { checkout: "" },
    { checkin: "2099-02-30" },
    { email: "bad" },
    { mobile: "(((((-----" },
    { mobile: "+91 98765 43210 12345" },
    { mobile: "98765x43210" },
    { name: "  " },
  ])
    assert.equal((await booking.POST(request({ ...payload, ...change }))).status, 400);
});
test("checks phone numbers with one rule shared by the form and the server", async () => {
  for (const ok of ["+91 98765 43210", "(022) 1234-5678", "9876543210"]) assert.equal(dates.phoneError(ok), "");
  for (const bad of ["", "12345", "(((((-----", "+1234567890123456", "98765x43210", "+91 " + "9".repeat(30)])
    assert.ok(dates.phoneError(bad), bad);
  const res = await booking.POST(request({ ...payload, mobile: "12345" }));
  assert.equal((await res.json()).error, dates.phoneError("12345"));
});
test("formats request dates for guests instead of showing ISO dates", () => {
  assert.match(dates.displayDate("2026-12-05"), /^Sat, 5 Dec,? 2026$/);
  assert.equal(dates.displayDate("2026-12-05", false), "Sat, 5 Dec");
  assert.equal(dates.displayDate("not-a-date"), "not-a-date");
});
test("accepts single-day event request and only exposes request reference", async () => {
  const result = await booking.POST(request({ ...payload, roomType: "Banquet - Gold", checkout: "", guests: 100 }));
  assert.equal(result.status, 201);
  assert.deepEqual(await result.json(), { success: true, reference: "request-reference" });
});
// Admin routes: load a route with the real validation + admin-route modules and a fake db/session.
const validation = load("src/lib/validation.ts");
class StorageUnavailableError extends Error {}
class ConflictError extends Error {}
class RoomAddressTakenError extends ConflictError {}
class OfferCodeTakenError extends ConflictError {}
function adminRoute(name, db, authenticated, revalidated = []) {
  const adminRouteModule = load("src/lib/admin-route.ts", {
    "next/server": response,
    "next/cache": { revalidatePath: (...a) => revalidated.push(a) },
    "@/lib/auth": { verifySession: async () => ({ authenticated }) },
    "@/lib/db": { StorageUnavailableError, ConflictError },
    "@/lib/validation": validation,
  });
  return load("src/app/api/" + name + "/route.ts", {
    "next/server": response,
    "@/lib/admin-route": adminRouteModule,
    "@/lib/db": db,
    "@/lib/validation": validation,
    "@/lib/reservation": dates,
  });
}
const jsonRequest = (method, body, query = "") =>
  new Request("http://localhost/api/x" + query, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test("unauthenticated users cannot read private data or change anything", async () => {
  const forbidden = async () => {
    throw Error("must not touch storage");
  };
  const db = new Proxy(
    {},
    { get: (_, key) => (key === "StorageUnavailableError" ? StorageUnavailableError : forbidden) },
  );
  for (const name of ["rooms", "offers", "reviews", "dining", "banquet", "enquiries", "bookings"]) {
    const route = adminRoute(name, db, false);
    for (const method of ["POST", "PATCH", "DELETE"])
      if (route[method])
        assert.equal(
          (await route[method](jsonRequest(method, { id: "x", name: "x" }, "?id=x"))).status,
          401,
          name + " " + method,
        );
  }
  for (const name of ["offers", "reviews", "dining", "enquiries", "bookings"])
    assert.equal((await adminRoute(name, db, false).GET()).status, 401, name + " GET");
});

test("guests only receive visible rooms and active packages from the public endpoints", async () => {
  const rooms = adminRoute(
    "rooms",
    {
      getRooms: async () => [
        { id: "a", name: "A" },
        { id: "b", name: "B", hidden: true },
      ],
    },
    false,
  );
  assert.deepEqual(
    (await (await rooms.GET()).json()).map(r => r.id),
    ["a"],
  );
  const banquet = adminRoute(
    "banquet",
    {
      getBanquetPackages: async () => [
        { id: "p", active: true },
        { id: "q", active: false },
      ],
    },
    false,
  );
  assert.deepEqual(
    (await (await banquet.GET()).json()).map(p => p.id),
    ["p"],
  );
});

test("admin edits accept only declared, valid fields and refresh the public pages", async () => {
  const saved = [];
  const revalidated = [];
  const db = {
    addOffer: async d => (saved.push(d), { ...d, id: "o1" }),
    updateOffer: async (id, d) => (saved.push(d), id === "o1" ? { id, ...d } : null),
  };
  const offers = adminRoute("offers", db, true, revalidated);
  assert.equal(
    (await offers.POST(jsonRequest("POST", { title: "Monsoon", id: "forged" }))).status,
    400,
    "unknown field rejected",
  );
  assert.equal((await offers.POST(jsonRequest("POST", { title: "  " }))).status, 400, "blank title rejected");
  assert.equal(
    (await offers.POST(jsonRequest("POST", { title: "Monsoon", validTo: "31/12/2099" }))).status,
    400,
    "bad date rejected",
  );
  assert.equal(
    (await offers.POST(jsonRequest("POST", { title: "Monsoon", active: "yes" }))).status,
    400,
    "non-boolean rejected",
  );
  const created = await offers.POST(jsonRequest("POST", { title: " Monsoon ", discount: "20% off" }));
  assert.equal(created.status, 201);
  assert.deepEqual(saved.at(-1), {
    title: "Monsoon",
    description: "",
    discount: "20% off",
    code: "",
    validFrom: "",
    validTo: "",
    active: true,
  });
  assert.equal((await created.json()).item.id, "o1");
  assert.equal((await offers.PATCH(jsonRequest("PATCH", { id: "o1", active: false }))).status, 200);
  assert.deepEqual(saved.at(-1), { active: false }, "partial update touches only the given field");
  assert.equal((await offers.PATCH(jsonRequest("PATCH", { id: "missing", active: false }))).status, 404);
  assert.equal((await offers.PATCH(jsonRequest("PATCH", { id: "o1", createdAt: "x" }))).status, 400);
  assert.ok(revalidated.length >= 2 && revalidated.every(a => a[0] === "/" && a[1] === "layout"));
});

test("booking and enquiry updates only change a valid status", async () => {
  const changes = [];
  const bookings = adminRoute("bookings", { updateBooking: async (id, d) => (changes.push(d), { id, ...d }) }, true);
  assert.equal((await bookings.PATCH(jsonRequest("PATCH", { id: "b1", paymentStatus: "paid" }))).status, 400);
  assert.equal((await bookings.PATCH(jsonRequest("PATCH", { id: "b1", bookingStatus: "teleported" }))).status, 400);
  assert.equal((await bookings.PATCH(jsonRequest("PATCH", { id: "b1", bookingStatus: "confirmed" }))).status, 200);
  assert.deepEqual(changes, [{ bookingStatus: "confirmed" }]);
  const enquiries = adminRoute("enquiries", { updateEnquiryStatus: async (id, status) => ({ id, status }) }, true);
  assert.equal((await enquiries.PATCH(jsonRequest("PATCH", { id: "e1", status: "contacted" }))).status, 200);
  assert.equal((await enquiries.PATCH(jsonRequest("PATCH", { id: "e1", status: "deleted" }))).status, 400);
});

test("read-only storage gives staff a clear 503 instead of a crash", async () => {
  const rooms = adminRoute(
    "rooms",
    {
      StorageUnavailableError,
      addRoom: async () => {
        throw new StorageUnavailableError("Storage is read-only.");
      },
    },
    true,
  );
  const res = await rooms.POST(jsonRequest("POST", { name: "Suite" }));
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /read-only/);
});

test("rate limiter blocks excessive attempts per key", () => {
  const limiter = load("src/lib/request-limit.ts");
  assert.equal(limiter.allowRequest("test", 2), true);
  assert.equal(limiter.allowRequest("test", 2), true);
  assert.equal(limiter.allowRequest("test", 2), false);
});
test("rate limiter never locks everyone out when an attacker floods it with new keys", () => {
  const limiter = load("src/lib/request-limit.ts");
  for (let i = 0; i < 20000; i++) limiter.allowRequest("flood:" + i, 5);
  assert.equal(limiter.allowRequest("real-guest", 5), true);
});
test("client key comes from the proxy-provided address, not from form fields", () => {
  const limiter = load("src/lib/request-limit.ts");
  assert.equal(limiter.clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(limiter.clientKey(new Headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(limiter.clientKey(new Headers()), "unknown");
});
test("failed logins are limited per address and per account, and success clears the address", () => {
  const limiter = load("src/lib/request-limit.ts");
  for (let i = 0; i < 10; i++) {
    assert.equal(limiter.loginAllowed("1.1.1.1", "admin@x"), true);
    limiter.recordLoginFailure("1.1.1.1", "admin@x");
  }
  assert.equal(limiter.loginAllowed("1.1.1.1", "admin@x"), false);
  assert.equal(limiter.loginAllowed("2.2.2.2", "admin@x"), true, "another address is not locked out by one attacker");
  limiter.recordLoginSuccess("1.1.1.1");
  assert.equal(limiter.loginAllowed("1.1.1.1", "admin@x"), true);
});

test("validates and persists requested room counts", async () => {
  assert.equal((await booking.POST(request({ ...payload, roomsRequested: 0 }))).status, 400);
  assert.equal((await booking.POST(request({ ...payload, roomsRequested: 11 }))).status, 400);
  assert.equal((await booking.POST(request({ ...payload, roomsRequested: 2.5 }))).status, 400);
  assert.equal((await booking.POST(request({ ...payload, roomsRequested: 3 }))).status, 201);
  assert.equal(records.at(-1).roomsRequested, 3);
});

test("requests are tied to the room's id, so a rename does not break or misfile them", async () => {
  const saved = [];
  const route = load("src/app/api/book/route.ts", {
    "@/lib/notifications": { deliverNotifications: async () => ({ configured: false }) },
    "next/server": response,
    "@/lib/db": {
      ...db,
      getRooms: async () => [
        { id: "7", name: "Deluxe King Room", hidden: false },
        { id: "8", name: "Old Room", hidden: true },
      ],
      addBooking: async b => (saved.push(b), { ...b, id: "ref" }),
    },
    "@/lib/reservation": dates,
    "@/lib/request-limit": { allowRequest: () => true, clientKey: () => "test" },
  });
  // The guest loaded the form before staff renamed "Deluxe Room" to "Deluxe King Room".
  assert.equal((await route.POST(request({ ...payload, roomType: "Deluxe Room", roomId: "7" }))).status, 201);
  assert.equal(saved.at(-1).roomId, "7");
  assert.equal(saved.at(-1).roomType, "Deluxe King Room", "stored under the room's current name");
  assert.equal((await route.POST(request({ ...payload, roomId: "8" }))).status, 400, "hidden rooms are refused");
  assert.equal((await route.POST(request({ ...payload, roomId: "99" }))).status, 400, "unknown ids are refused");
  assert.equal(
    (await route.POST(request({ ...payload, roomType: "Deluxe King Room" }))).status,
    201,
    "pages without the id still match by name",
  );
  assert.equal(saved.at(-1).roomId, "7");
});

test("local booking and its notification event are persisted in one atomic file replacement", async () => {
  const files = new Map([["/virtual/data/db.json", JSON.stringify({ bookings: [], config: { rooms: [] } })]]);
  let renames = 0;
  const fakeFs = {
    readFileSync: p => files.get(p),
    writeFileSync: (p, v) => files.set(p, v),
    existsSync: p => files.has(p) || p === "/virtual/data",
    mkdirSync: () => {},
    renameSync: (a, b) => {
      renames++;
      files.set(b, files.get(a));
      files.delete(a);
    },
    unlinkSync: p => files.delete(p),
  };
  const dbModule = load(
    "src/lib/db.ts",
    {
      fs: { default: fakeFs },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
    },
    { process: { env: {}, cwd: () => "/virtual" } },
  );
  const saved = await dbModule.addBooking({
    ...payload,
    roomsRequested: 2,
    gender: "other",
    country: "",
    city: "",
    amount: 0,
  });
  const result = JSON.parse(files.get("/virtual/data/db.json"));
  assert.equal(renames, 1);
  assert.equal(result.bookings[0].id, saved.id);
  assert.equal(result.notificationJobs[0].bookingId, saved.id);
  assert.equal(result.notificationJobs[0].status, "pending");
  files.set("/virtual/data/db.json", "broken JSON");
  await assert.rejects(() => dbModule.getBookings());
  assert.equal(files.get("/virtual/data/db.json"), "broken JSON");
});

test("a notification that keeps failing is marked failed and can be requeued", async () => {
  const files = new Map([["/virtual/data/db.json", JSON.stringify({ bookings: [], config: { rooms: [] } })]]);
  const fakeFs = {
    readFileSync: p => files.get(p),
    writeFileSync: (p, v) => files.set(p, v),
    existsSync: p => files.has(p) || p === "/virtual/data",
    mkdirSync: () => {},
    renameSync: (a, b) => {
      files.set(b, files.get(a));
      files.delete(a);
    },
    unlinkSync: p => files.delete(p),
  };
  const dbModule = load(
    "src/lib/db.ts",
    {
      fs: { default: fakeFs },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
    },
    { process: { env: {}, cwd: () => "/virtual" } },
  );
  const saved = await dbModule.addBooking({ ...payload, gender: "other", country: "", city: "", amount: 0 });
  const job = () => JSON.parse(files.get("/virtual/data/db.json")).notificationJobs[0];
  for (let i = 1; i < dbModule.MAX_NOTIFICATION_ATTEMPTS; i++) await dbModule.markNotification(saved.id, false);
  assert.equal(job().status, "pending");
  await dbModule.markNotification(saved.id, false);
  assert.equal(job().status, "failed");
  assert.equal(await dbModule.requeueFailedNotifications(), 1);
  assert.deepEqual([job().status, job().attempts], ["pending", 0]);
  await dbModule.markNotification(saved.id, true);
  assert.equal(job().status, "delivered");
  assert.equal(await dbModule.requeueFailedNotifications(), 0);
});

// db.ts on the JSON backend over an in-memory file.
function jsonDb(initial) {
  const files = new Map([
    ["/virtual/data/db.json", JSON.stringify({ bookings: [], config: { rooms: [] }, ...initial })],
  ]);
  const fakeFs = {
    readFileSync: p => files.get(p),
    writeFileSync: (p, v) => files.set(p, v),
    existsSync: p => files.has(p) || p === "/virtual/data",
    mkdirSync: () => {},
    renameSync: (a, b) => {
      files.set(b, files.get(a));
      files.delete(a);
    },
    unlinkSync: p => files.delete(p),
  };
  const dbModule = load(
    "src/lib/db.ts",
    {
      fs: { default: fakeFs },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
    },
    { process: { env: {}, cwd: () => "/virtual" } },
  );
  return { dbModule, stored: () => JSON.parse(files.get("/virtual/data/db.json")) };
}

test("retries take due events least-attempted first, back off after failures and skip claimed ones", async () => {
  const ago = minutes => new Date(Date.now() - minutes * 60_000).toISOString();
  const job = (id, extra) => ({ id, bookingId: "b-" + id, status: "pending", attempts: 0, ...extra });
  const { dbModule } = jsonDb({
    notificationJobs: [
      // 5 failures → 80 minutes' wait, long passed.
      ...Array.from({ length: 10 }, (_, i) =>
        job("busy-" + i, { attempts: 5, createdAt: "2026-01-0" + i, lastAttemptAt: ago(200) }),
      ),
      job("new-1", { createdAt: "2026-02-01" }),
      job("new-2", { createdAt: "2026-02-02" }),
      job("waiting", { attempts: 3, createdAt: "2026-01-01", lastAttemptAt: ago(10) }), // needs 20 minutes
      job("failed", { status: "failed", attempts: 8, createdAt: "2026-01-01" }),
      job("done", { status: "delivered", attempts: 1, createdAt: "2026-01-01" }),
    ],
  });
  assert.deepEqual([0, 1, 2, 3, 7, 8, 20].map(dbModule.notificationRetryDelayMinutes), [5, 5, 10, 20, 320, 360, 360]);
  const first = await dbModule.claimNotificationJobs({ limit: 10 });
  assert.equal(first.length, 10);
  assert.deepEqual(
    first.map(j => j.id),
    ["new-1", "new-2", ...Array.from({ length: 8 }, (_, i) => "busy-" + i)],
  );
  // Claimed events are stamped, so an overlapping run only gets the rest, and nothing is sent twice.
  assert.deepEqual(
    (await dbModule.claimNotificationJobs({ limit: 10 })).map(j => j.id),
    ["busy-8", "busy-9"],
  );
  assert.deepEqual(await dbModule.claimNotificationJobs(), []);
  assert.deepEqual(await dbModule.countNotifications(), { pending: 13, delivered: 1, failed: 1 });
  // A staff retry skips the 20-minute back-off of "waiting", but nothing picked up in the last 5 minutes.
  assert.deepEqual(
    (await dbModule.claimNotificationJobs({ force: true })).map(j => j.id),
    ["waiting"],
  );
  assert.deepEqual(await dbModule.claimNotificationJobs({ force: true }), []);
});

test("staff retries are forced; automatic and post-request deliveries respect the back-off", async () => {
  const claims = [];
  const notifications = load(
    "src/lib/notifications.ts",
    {
      "node:crypto": { createHmac },
      "@/lib/db": { claimNotificationJobs: async options => (claims.push(options), []) },
    },
    {
      process: {
        env: {
          NOTIFICATION_WEBHOOK_URL: "https://notifications.example.test/hotel",
          NOTIFICATION_WEBHOOK_SECRET: "test-secret-that-is-at-least-32-characters",
        },
      },
    },
  );
  await notifications.deliverNotifications();
  await notifications.deliverNotifications("booking-1");
  await notifications.deliverNotifications(undefined, { force: true });
  assert.deepEqual(
    claims.map(c => [c.bookingId, c.force]),
    [
      [undefined, false],
      ["booking-1", false],
      [undefined, true],
    ],
  );
  const route = load("src/app/api/notifications/route.ts", {
    "next/server": response,
    "@/lib/db": { requeueFailedNotifications: async () => 2 },
    "@/lib/notifications": {
      notificationConfigured: () => true,
      scheduledJobsConfigured: () => false,
      deliverNotifications: async (bookingId, options) => (claims.push({ bookingId, ...options }), { delivered: 0 }),
    },
    "@/lib/hotel-content": { PRIVACY_INFORMATION: { retentionMonths: 24 } },
    "@/lib/admin-route": {
      isAdmin: async () => true,
      json: (body, status = 200) => Response.json(body, { status }),
      readBody: async req => req.json().catch(() => undefined),
      serverError: () => Response.json({}, { status: 500 }),
      unauthorized: () => Response.json({}, { status: 401 }),
    },
  });
  const posted = await route.POST(
    new Request("http://x", { method: "POST", body: JSON.stringify({ action: "requeue" }) }),
  );
  assert.deepEqual(await posted.json(), { delivered: 0, requeued: 2 });
  assert.deepEqual(claims.at(-1), { bookingId: undefined, force: true });
});

test("delivery looks up each request and discards events whose request was deleted", async () => {
  const discarded = [],
    marked = [],
    sent = [];
  const notifications = load(
    "src/lib/notifications.ts",
    {
      "node:crypto": { createHmac },
      "@/lib/db": {
        claimNotificationJobs: async () => [
          { id: "orphan", bookingId: "gone", attempts: 0 },
          { id: "event-1", bookingId: "booking-1", attempts: 0 },
        ],
        getBooking: async id => (id === "booking-1" ? { ...payload, id } : null),
        discardNotification: async id => discarded.push(id),
        markNotification: async (id, ok) => marked.push([id, ok]),
      },
    },
    {
      process: {
        env: {
          NOTIFICATION_WEBHOOK_URL: "https://notifications.example.test/hotel",
          NOTIFICATION_WEBHOOK_SECRET: "test-secret-that-is-at-least-32-characters",
        },
      },
      fetch: async (url, options) => (sent.push(options.headers["Idempotency-Key"]), { ok: true }),
    },
  );
  assert.equal((await notifications.deliverNotifications()).delivered, 1);
  assert.deepEqual(discarded, ["orphan"]);
  assert.deepEqual(sent, ["event-1"]);
  assert.deepEqual(marked, [["event-1", true]]);
});

test("retention deletes only requests whose sent date and requested dates are past the cutoff", async () => {
  const booking = (id, createdAt, checkin, checkout) => ({ ...payload, id, createdAt, checkin, checkout });
  const { dbModule, stored } = jsonDb({
    bookings: [
      booking("old", "2024-01-05T10:00:00.000Z", "2024-02-01", "2024-02-03"),
      booking("old-request-future-stay", "2024-01-05T10:00:00.000Z", "2027-01-01", "2027-01-03"),
      booking("recent", "2026-10-01T10:00:00.000Z", "2026-12-01", "2026-12-02"),
    ],
    enquiries: [
      { id: "e-old", createdAt: "2023-05-01T00:00:00.000Z", checkin: "", checkout: "" },
      { id: "e-new", createdAt: "2026-11-01T00:00:00.000Z", checkin: "", checkout: "" },
    ],
    notificationJobs: [
      { id: "old", bookingId: "old", status: "delivered", attempts: 1, createdAt: "2024-01-05T10:00:00.000Z" },
      { id: "recent", bookingId: "recent", status: "pending", attempts: 0, createdAt: "2026-10-01T10:00:00.000Z" },
    ],
  });
  assert.equal(await dbModule.purgeRequestsBefore(new Date("2024-11-26T00:00:00.000Z")), 2);
  const after = stored();
  assert.deepEqual(
    after.bookings.map(b => b.id),
    ["old-request-future-stay", "recent"],
  );
  assert.deepEqual(
    after.enquiries.map(e => e.id),
    ["e-new"],
  );
  assert.deepEqual(
    after.notificationJobs.map(j => j.id),
    ["recent"],
  );
  assert.equal(await dbModule.purgeRequestsBefore(new Date("2024-11-26T00:00:00.000Z")), 0);

  const deleted = [];
  const retentionModule = months =>
    load("src/lib/retention.ts", {
      "@/lib/db": { purgeRequestsBefore: async date => (deleted.push(date.toISOString()), 3) },
      "@/lib/hotel-content": { PRIVACY_INFORMATION: { retentionMonths: months } },
    });
  const now = new Date("2026-11-26T12:00:00.000Z");
  assert.deepEqual(await retentionModule(0).purgeExpiredRequests(now), { configured: false, deleted: 0 });
  assert.equal(deleted.length, 0);
  assert.deepEqual(await retentionModule(24).purgeExpiredRequests(now), { configured: true, deleted: 3 });
  assert.deepEqual(deleted, ["2024-11-26T12:00:00.000Z"]);
  const { retentionCutoff } = retentionModule(1);
  const cutoff = (now, months) => retentionCutoff(months, new Date(now)).toISOString();
  assert.equal(cutoff("2027-03-31T08:00:00.000Z", 1), "2027-02-28T08:00:00.000Z");
  assert.equal(cutoff("2028-02-29T08:00:00.000Z", 24), "2026-02-28T08:00:00.000Z");
  assert.equal(cutoff("2028-03-31T08:00:00.000Z", 1), "2028-02-29T08:00:00.000Z");
  assert.equal(cutoff("2026-01-15T08:00:00.000Z", 2), "2025-11-15T08:00:00.000Z");
});

test("signing out ends every admin session, including copied tokens", async () => {
  let version = 0,
    cookie;
  const auth = load(
    "src/lib/auth.ts",
    {
      jose,
      "next/headers": { cookies: async () => ({ get: () => (cookie ? { value: cookie } : undefined) }) },
      "@/lib/db": {
        getSessionVersion: async () => version,
        bumpSessionVersion: async () => ++version,
      },
    },
    { process: { env: { JWT_SECRET: "j".repeat(32) } } },
  );
  cookie = await auth.createSession("staff@hotel.in");
  const copied = cookie;
  assert.equal((await auth.verifySession()).authenticated, true);
  const { payload: claims } = await jose.jwtVerify(cookie, new TextEncoder().encode("j".repeat(32)));
  assert.equal(claims.exp - claims.iat, auth.SESSION_SECONDS);
  assert.equal(auth.SESSION_SECONDS, 8 * 60 * 60);
  await auth.endAllSessions();
  cookie = copied;
  assert.equal((await auth.verifySession()).authenticated, false);
  cookie = await auth.createSession("staff@hotel.in");
  assert.equal((await auth.verifySession()).authenticated, true);
});

test("logout only ends sessions for a signed-in admin and reports when it could not", async () => {
  const ended = [];
  let failRevoke = false;
  const logout = authenticated =>
    load("src/app/api/auth/logout/route.ts", {
      "next/server": {
        NextResponse: {
          json: value => {
            const r = Response.json(value);
            r.cookies = { set: (...a) => (r.cookie = a) };
            return r;
          },
        },
      },
      "@/lib/auth": {
        COOKIE_NAME: "admin_session",
        verifySession: async () => ({ authenticated }),
        endAllSessions: async () => {
          if (failRevoke) throw Error("read-only storage");
          ended.push(1);
        },
      },
    });
  const anonymous = await logout(false).POST();
  assert.equal(ended.length, 0);
  assert.equal(anonymous.cookie[2].maxAge, 0);
  assert.deepEqual(await anonymous.json(), { success: true });
  assert.deepEqual(await (await logout(true).POST()).json(), { success: true, revoked: true });
  assert.equal(ended.length, 1);
  failRevoke = true;
  const partial = await logout(true).POST();
  assert.deepEqual(await partial.json(), { success: true, revoked: false });
  assert.equal(partial.cookie[2].maxAge, 0, "this browser is still signed out");
});

test("sign-in works on a new Postgres database before /api/seed has created any tables", async () => {
  const queries = [];
  const sql = strings => {
    const query = strings.join("?");
    queries.push(query);
    if (/\bbookings\b|notification_outbox/.test(query)) throw Error('relation "bookings" does not exist');
    if (/^SELECT value FROM admin_state/.test(query)) return [];
    if (/^INSERT INTO admin_state/.test(query)) return [{ value: "1" }];
    return [];
  };
  const dbModule = load(
    "src/lib/db.ts",
    {
      fs: { default: {} },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
      "@neondatabase/serverless": { neon: () => sql },
    },
    { process: { env: { DATABASE_URL: "test-only" }, cwd: () => "/virtual" } },
  );
  assert.equal(await dbModule.getSessionVersion(), 0);
  assert.equal(await dbModule.bumpSessionVersion(), 1);
  assert.ok(
    queries.every(q => !/bookings|notification_outbox/.test(q)),
    "session storage touches only admin_state",
  );
  assert.match(queries[0], /CREATE TABLE IF NOT EXISTS admin_state/);
});

test("Postgres saves the booking and event in the same transaction", async () => {
  let transaction = [];
  const sql = (strings, ...values) => ({ query: strings.join("?"), values });
  sql.transaction = async queries => {
    transaction = queries;
    return [[], []];
  };
  const dbModule = load(
    "src/lib/db.ts",
    {
      fs: { default: {} },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
      "@neondatabase/serverless": { neon: () => sql },
    },
    { process: { env: { DATABASE_URL: "test-only" }, cwd: () => "/virtual" } },
  );
  const saved = await dbModule.addBooking({
    ...payload,
    roomsRequested: 2,
    gender: "other",
    country: "",
    city: "",
    amount: 0,
  });
  assert.equal(transaction.length, 2);
  assert.match(transaction[0].query, /INSERT INTO bookings/);
  assert.match(transaction[1].query, /INSERT INTO notification_outbox/);
  assert.equal(transaction[1].values[0], saved.id);
});

test("Postgres marks repeatedly failing notifications failed, requeues them and returns ISO dates", async () => {
  const queries = [];
  const created = new Date("2026-11-20T10:00:00Z");
  const sql = (strings, ...values) => {
    const query = strings.join("?");
    queries.push({ query, values });
    if (/^SELECT \* FROM notification_outbox/.test(query))
      return [{ id: "e1", booking_id: "b1", status: "pending", attempts: 2, created_at: created }];
    if (/RETURNING id/.test(query)) return [{ id: "e1" }];
    return [];
  };
  const dbModule = load(
    "src/lib/db.ts",
    {
      fs: { default: {} },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
      "@neondatabase/serverless": { neon: () => sql },
    },
    { process: { env: { DATABASE_URL: "test-only" }, cwd: () => "/virtual" } },
  );
  assert.equal((await dbModule.getNotificationJobs())[0].createdAt, "2026-11-20T10:00:00.000Z");
  await dbModule.markNotification("e1", false);
  const mark = queries.at(-1);
  assert.match(mark.query, /UPDATE notification_outbox SET status = CASE .*'failed'/);
  assert.deepEqual(mark.values, [false, dbModule.MAX_NOTIFICATION_ATTEMPTS, "e1"]);
  assert.equal(await dbModule.requeueFailedNotifications(), 1);
  assert.match(
    queries.at(-1).query,
    /SET status = 'pending', attempts = 0, last_attempt_at = NULL WHERE status = 'failed'/,
  );
  // Claiming is one statement that skips rows another run holds and only takes due events.
  await dbModule.claimNotificationJobs({ limit: 10, bookingId: "b1" });
  const claim = queries.at(-1);
  assert.match(claim.query, /UPDATE notification_outbox SET last_attempt_at = NOW\(\)/);
  assert.match(claim.query, /FOR UPDATE SKIP LOCKED/);
  assert.match(claim.query, /ORDER BY attempts ASC, created_at ASC/);
  assert.deepEqual(claim.values, ["b1", "b1", false, 5, 5, 10]);
  // Lookups use WHERE clauses instead of reading every request.
  await dbModule.getBookingByIdAndEmail("3F9A12BC", "Guest@Example.com ");
  assert.match(queries.at(-1).query, /WHERE id LIKE \? AND LOWER\(TRIM\(email\)\) = \?/);
  assert.deepEqual(queries.at(-1).values, ["3f9a12bc%", "guest@example.com"]);
  const count = queries.length;
  assert.equal(await dbModule.getBookingByIdAndEmail("3f9a%_bc", "guest@example.com"), null);
  assert.equal(queries.length, count, "wildcards never reach the database");
  await dbModule.getBooking("b1");
  assert.match(queries.at(-1).query, /SELECT \* FROM bookings WHERE id = \?/);
});

test("notifications stay queued when disabled and never call an external endpoint", async () => {
  const notifications = load(
    "src/lib/notifications.ts",
    { "node:crypto": { createHmac }, "@/lib/db": {} },
    {
      process: { env: {} },
      fetch: () => {
        throw Error("Must not send");
      },
    },
  );
  assert.equal(notifications.notificationConfigured(), false);
  assert.equal((await notifications.deliverNotifications()).configured, false);
});

test("notification failures are retryable, signed and use a stable idempotency key", async () => {
  const secret = "test-secret-that-is-at-least-32-characters";
  const calls = [],
    statuses = [];
  const mocks = {
    claimNotificationJobs: async () => [{ id: "event-1", bookingId: "booking-1", status: "pending" }],
    getBooking: async id => ({ ...payload, id, roomType: payload.roomType }),
    markNotification: async (id, ok) => statuses.push(ok),
  };
  const notifications = load(
    "src/lib/notifications.ts",
    { "node:crypto": { createHmac }, "@/lib/db": mocks },
    {
      process: {
        env: {
          NOTIFICATION_WEBHOOK_URL: "https://notifications.example.test/hotel",
          NOTIFICATION_WEBHOOK_SECRET: secret,
        },
      },
      fetch: async (url, options) => {
        calls.push(options);
        return { ok: calls.length > 1 };
      },
    },
  );
  assert.equal((await notifications.deliverNotifications()).delivered, 0);
  assert.equal((await notifications.deliverNotifications()).delivered, 1);
  assert.deepEqual(statuses, [false, true]);
  assert.equal(calls[0].headers["Idempotency-Key"], calls[1].headers["Idempotency-Key"]);
  assert.equal(
    calls[0].headers["X-Hotel-Signature"],
    createHmac("sha256", secret)
      .update(calls[0].headers["X-Hotel-Timestamp"] + "." + calls[0].body)
      .digest("hex"),
  );
  assert.equal(JSON.parse(calls[0].body).request.status, "pending");
});

test("only unambiguous nightly rates produce an estimate", () => {
  assert.equal(dates.nightlyRate("₹3,000/night"), 3000);
  assert.equal(dates.nightlyRate("INR 4500 per night"), 4500);
  assert.equal(dates.nightlyRate("₹3000–4500/night"), null);
  assert.equal(dates.nightlyRate("Rate on request"), null);
  assert.equal(dates.nightlyRate("₹3000/night for 2 adults"), null);
});

test("special requests are optional, trimmed, capped and persisted with the request", async () => {
  assert.equal((await booking.POST(request(payload))).status, 201);
  assert.equal(records.at(-1).specialRequests, "");
  assert.equal(
    (await booking.POST(request({ ...payload, specialRequests: "  Ground floor, early check-in  " }))).status,
    201,
  );
  assert.equal(records.at(-1).specialRequests, "Ground floor, early check-in");
  assert.equal((await booking.POST(request({ ...payload, specialRequests: "x".repeat(900) }))).status, 201);
  assert.equal(records.at(-1).specialRequests.length, 500);
  assert.equal((await booking.POST(request({ ...payload, specialRequests: { note: "not text" } }))).status, 201);
  assert.equal(records.at(-1).specialRequests, "");
});

test("Postgres stores special requests and staff notifications include them", async () => {
  let transaction = [];
  const sql = (strings, ...values) => ({ query: strings.join("?"), values });
  sql.transaction = async queries => {
    transaction = queries;
    return [[], []];
  };
  const dbModule = load(
    "src/lib/db.ts",
    {
      fs: { default: {} },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
      "@neondatabase/serverless": { neon: () => sql },
    },
    { process: { env: { DATABASE_URL: "test-only" }, cwd: () => "/virtual" } },
  );
  await dbModule.addBooking({
    ...payload,
    specialRequests: "Cot for an infant",
    couponCode: "EARLY20",
    couponOffer: "Early Bird",
    roomsRequested: 1,
    gender: "other",
    country: "",
    city: "",
    amount: 0,
  });
  assert.match(transaction[0].query, /special_requests/);
  assert.match(transaction[0].query, /coupon_code, coupon_offer/);
  assert.ok(transaction[0].values.includes("Cot for an infant"));
  assert.ok(transaction[0].values.includes("EARLY20") && transaction[0].values.includes("Early Bird"));
  const secret = "test-secret-that-is-at-least-32-characters";
  let body;
  const mocks = {
    claimNotificationJobs: async () => [{ id: "event-2", bookingId: "booking-2", status: "pending" }],
    getBooking: async id => ({
      ...payload,
      id,
      specialRequests: "Cot for an infant",
      couponCode: "EARLY20",
      couponOffer: "Early Bird",
    }),
    markNotification: async () => {},
  };
  const notifications = load(
    "src/lib/notifications.ts",
    { "node:crypto": { createHmac }, "@/lib/db": mocks },
    {
      process: {
        env: {
          NOTIFICATION_WEBHOOK_URL: "https://notifications.example.test/hotel",
          NOTIFICATION_WEBHOOK_SECRET: secret,
        },
      },
      fetch: async (url, options) => {
        body = JSON.parse(options.body);
        return { ok: true };
      },
    },
  );
  await notifications.deliverNotifications();
  assert.equal(body.request.specialRequests, "Cot for an infant");
  assert.equal(body.request.couponCode, "EARLY20");
  assert.equal(body.request.couponOffer, "Early Bird");
});

test("hotel contact links are only built from usable numbers", () => {
  const contact = load("src/lib/contact.ts");
  assert.equal(contact.telHref("+91 98765 43210"), "tel:+919876543210");
  assert.equal(contact.telHref(""), "");
  assert.equal(contact.telHref("to be updated"), "");
  assert.equal(contact.whatsappHref("+91 98765-43210"), "https://wa.me/919876543210");
  assert.equal(
    contact.whatsappHref("+91 98765 43210", "Hello & welcome"),
    "https://wa.me/919876543210?text=Hello%20%26%20welcome",
  );
  assert.equal(contact.whatsappHref("12"), "");
});

test("guests only see known room facts; unknown ones are hidden rather than shown as placeholders", () => {
  const content = load("src/lib/hotel-content.ts");
  assert.deepEqual(content.roomFacts({ size: "", bed: "King bed", occupancy: "", bathroom: "" }), [
    ["Bed configuration", "King bed"],
  ]);
  assert.deepEqual(content.roomFacts(undefined), []);
  assert.deepEqual(
    content.roomFacts({ size: "", bed: "", occupancy: "", bathroom: "", location: "Floor 5", view: "" }),
    [["Location in the hotel", "Floor 5"]],
  );
  for (const value of Object.values(content.HOTEL_INFORMATION))
    assert.doesNotMatch(value, /to be (updated|confirmed)|not yet/i);
});

test("built-in rooms have their own address, real images and no placeholder facts or inclusions", () => {
  const { SITE_CONFIG } = load("src/lib/config.ts");
  const stored = JSON.parse(fs.readFileSync("data/db.json", "utf8")).config.rooms;
  for (const [source, rooms] of [
    ["config.ts", SITE_CONFIG.rooms],
    ["data/db.json", stored],
  ]) {
    assert.equal(new Set(rooms.map(r => r.slug)).size, rooms.length, source + ": slugs are unique");
    for (const room of rooms) {
      const where = source + " " + room.name;
      assert.match(room.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, where + ": slug");
      assert.ok(fs.existsSync("public" + room.image), where + ": image exists");
      for (const key of ["size", "bed", "occupancy", "bathroom", "location", "view"]) {
        assert.equal(typeof room[key], "string", where + ": " + key);
        assert.doesNotMatch(room[key], /to be (updated|confirmed)|tbd/i, where + ": " + key);
      }
      for (const item of [...room.inRoom, ...room.services]) {
        assert.ok(item.trim(), where + " has an empty inclusion");
        assert.doesNotMatch(item, /to be (updated|confirmed)|tbd/i);
      }
    }
  }
});

test("room links find the room by address, earlier address, then name", () => {
  const { findRoom } = load("src/lib/hotel-content.ts");
  const rooms = [
    { slug: "deluxe-king", name: "Deluxe King Room", previousSlugs: ["deluxe-room"] },
    { slug: "suite", name: "Suite" },
  ];
  assert.equal(findRoom(rooms, "deluxe-king").name, "Deluxe King Room");
  assert.equal(findRoom(rooms, "deluxe-room").slug, "deluxe-king", "old addresses still resolve");
  assert.equal(findRoom(rooms, "Suite").slug, "suite", "booking links that used the name still work");
  assert.equal(findRoom(rooms, "nope"), undefined);
  assert.equal(findRoom(rooms, ""), undefined);
});

test("admin launch checklist lists every missing guest-facing detail", () => {
  const content = load("src/lib/hotel-content.ts");
  const empty = { phone: "", whatsapp: "", email: "", address: "", mapEmbedUrl: "" };
  const missing = content.missingLaunchDetails({ contact: empty, rooms: [{ name: "Suite", sample: true }] });
  for (const item of ["phone", "WhatsApp", "email", "address", "directions", "check-in", "Suite"])
    assert.ok(
      missing.some(m => m.toLowerCase().includes(item.toLowerCase())),
      "missing " + item,
    );
  // Privacy facts the hotel has approved in hotel-content.ts are no longer listed.
  for (const item of ["legal business name", "grievance officer", "how long requests are kept", "last-reviewed date"])
    assert.ok(!missing.some(m => m.toLowerCase().includes(item)), "still listed: " + item);
  const ready = content.missingLaunchDetails({
    contact: {
      phone: "+91 1",
      whatsapp: "+91 1",
      email: "a@b.in",
      address: "Patna",
      mapEmbedUrl: "https://maps.example",
    },
    rooms: [],
  });
  assert.ok(!ready.some(m => /phone|whatsapp|email|address|directions/i.test(m)));
  // Room facts are checked for the rooms that actually exist, so a room added or renamed in the admin is covered.
  const facts = { size: "28 m²", bed: "King", occupancy: "2", bathroom: "Shower", location: "Floor 2", view: "" };
  const rooms = content.missingLaunchDetails({
    contact: empty,
    rooms: [
      { name: "Garden Room", sample: false, ...facts },
      { name: "Complete Room", sample: false, ...facts, view: "City" },
    ],
  });
  assert.ok(rooms.some(m => m.startsWith("Garden Room: view")));
  assert.ok(!rooms.some(m => m.startsWith("Complete Room")));
  assert.ok(!rooms.some(m => /Deluxe Room|Premium Room|Family Room/.test(m)), "no rooms that are not on the site");
});

test("Hotel JSON-LD uses only known facts and is safe to embed in a script tag", () => {
  const info = { HOTEL_INFORMATION: { checkIn: "", checkOut: "" } };
  const seo = load("src/lib/seo.ts", { "@/lib/reservation": dates, "@/lib/hotel-content": info });
  const rooms = [
    { name: "Deluxe Room", rate: "₹3,000/night", hidden: false },
    { name: "Suite", rate: "₹7,500/night", hidden: false },
    { name: "Hidden", rate: "₹99/night", hidden: true },
    { name: "Family", rate: "On request", hidden: false },
  ];
  const bare = seo.hotelJsonLd({
    rooms,
    contact: { phone: "", whatsapp: "", email: "", address: "", mapEmbedUrl: "" },
    siteUrl: "",
  });
  assert.equal(bare["@type"], "Hotel");
  assert.equal(bare.name, "Hotel Ganga Imperial");
  assert.equal(bare.telephone, undefined);
  assert.equal(bare.email, undefined);
  assert.equal(bare.address, undefined);
  assert.equal(bare.url, undefined);
  assert.equal(bare.priceRange, "₹3,000–₹7,500 per night");
  assert.equal(bare.checkinTime, undefined);
  assert.equal(bare.checkoutTime, undefined);
  assert.ok(bare.amenityFeature.some(a => a.name === "Rooftop swimming pool"));
  const full = seo.hotelJsonLd({
    rooms: [],
    contact: {
      phone: "+91 98765 43210",
      whatsapp: "",
      email: "stay@hotel.in",
      address: "Main Road, Patna",
      mapEmbedUrl: "https://maps.example/x",
    },
    siteUrl: "https://hotel.in",
  });
  assert.equal(full.telephone, "+91 98765 43210");
  assert.equal(full.url, "https://hotel.in");
  assert.equal(full.image, "https://hotel.in/images/image-43.jpeg");
  assert.equal(full.address, "Main Road, Patna");
  assert.equal(full.hasMap, "https://maps.example/x");
  assert.equal(full.priceRange, undefined);
  const timed = load("src/lib/seo.ts", {
    "@/lib/reservation": dates,
    "@/lib/hotel-content": { HOTEL_INFORMATION: { checkIn: "12:00", checkOut: "11:00" } },
  }).hotelJsonLd({
    rooms: [],
    contact: { phone: "", whatsapp: "", email: "", address: "", mapEmbedUrl: "" },
    siteUrl: "",
  });
  assert.equal(timed.checkinTime, "12:00");
  assert.equal(timed.checkoutTime, "11:00");
  assert.doesNotMatch(seo.jsonLdScript({ name: "</script><script>alert(1)</script>" }), /<\/script/i);
});

test("login rejects bad credentials, limits repeated failures and sets a secure session cookie", async () => {
  const limiter = load("src/lib/request-limit.ts");
  const env = {
    ADMIN_EMAIL: "staff@hotel.in",
    ADMIN_PASSWORD: "correct horse battery",
    JWT_SECRET: "x".repeat(32),
    NODE_ENV: "production",
  };
  const nextServer = {
    NextResponse: {
      json: (v, o = {}) => {
        const r = Response.json(v, o);
        r.cookies = { set: (...a) => (r.cookie = a) };
        return r;
      },
    },
  };
  const login = load(
    "src/app/api/auth/login/route.ts",
    {
      "node:crypto": nodeCrypto,
      "next/server": nextServer,
      "@/lib/request-limit": limiter,
      "@/lib/auth": {
        createSession: async e => "token-for-" + e,
        getAdminCredentials: () => ({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }),
        COOKIE_NAME: "admin_session",
        SESSION_SECONDS: 8 * 60 * 60,
      },
    },
    { process: { env } },
  );
  const attempt = (body, ip = "9.9.9.9") =>
    login.POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: JSON.stringify(body),
      }),
    );
  assert.equal((await attempt({ email: "staff@hotel.in" })).status, 400);
  assert.equal((await attempt({ email: "staff@hotel.in", password: "wrong" })).status, 401);
  const ok = await attempt({ email: "STAFF@hotel.in", password: "correct horse battery" });
  assert.equal(ok.status, 200);
  assert.equal(ok.cookie[0], "admin_session");
  assert.equal(ok.cookie[1], "token-for-staff@hotel.in");
  assert.deepEqual(
    {
      httpOnly: ok.cookie[2].httpOnly,
      secure: ok.cookie[2].secure,
      sameSite: ok.cookie[2].sameSite,
      maxAge: ok.cookie[2].maxAge,
    },
    { httpOnly: true, secure: true, sameSite: "lax", maxAge: 8 * 60 * 60 },
  );
  for (let i = 0; i < 10; i++) await attempt({ email: "staff@hotel.in", password: "guess" + i }, "6.6.6.6");
  assert.equal(
    (await attempt({ email: "staff@hotel.in", password: "correct horse battery" }, "6.6.6.6")).status,
    429,
    "attacking address is blocked",
  );
  assert.equal(
    (await attempt({ email: "staff@hotel.in", password: "correct horse battery" }, "7.7.7.7")).status,
    200,
    "staff elsewhere can still sign in",
  );
  env.JWT_SECRET = "short";
  assert.equal(
    (await attempt({ email: "staff@hotel.in", password: "correct horse battery" }, "8.8.8.8")).status,
    503,
    "fails closed without a strong secret",
  );
});

function jsonStore(initial, builtInRooms = [{ name: "Deluxe Room", text: "", image: "", rate: "", sample: true }]) {
  const files = new Map(initial === undefined ? [] : [["/virtual/data/db.json", JSON.stringify(initial)]]);
  let readOnly = false;
  const fakeFs = {
    readFileSync: p => {
      if (!files.has(p)) throw Object.assign(Error("missing"), { code: "ENOENT" });
      return files.get(p);
    },
    writeFileSync: (p, v) => {
      if (readOnly) throw Object.assign(Error("ro"), { code: "EROFS" });
      files.set(p, v);
    },
    existsSync: p => files.has(p) || p === "/virtual/data",
    mkdirSync: () => {},
    renameSync: (a, b) => {
      files.set(b, files.get(a));
      files.delete(a);
    },
    unlinkSync: p => files.delete(p),
  };
  const db = load(
    "src/lib/db.ts",
    {
      fs: { default: fakeFs },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: builtInRooms } },
    },
    { process: { env: {}, cwd: () => "/virtual" } },
  );
  return { db, setReadOnly: v => (readOnly = v), saved: () => JSON.parse(files.get("/virtual/data/db.json")) };
}

test("rooms are addressed by stable id, not list position", async () => {
  const store = jsonStore({
    bookings: [],
    config: {
      rooms: [
        { name: "Deluxe Room", text: "", image: "", rate: "", sample: true },
        { name: "Suite", text: "", image: "", rate: "", sample: true },
      ],
    },
  });
  assert.deepEqual(
    (await store.db.getRooms()).map(r => r.id),
    ["deluxe-room", "suite"],
  );
  const added = await store.db.addRoom({
    name: "Suite",
    text: "",
    image: "/images/a.jpeg",
    rate: "",
    sample: false,
    hidden: false,
  });
  assert.equal(added.id, "suite-2", "duplicate names still get unique ids");
  assert.equal(await store.db.deleteRoom("deluxe-room"), true);
  const updated = await store.db.updateRoom("suite-2", { rate: "9000", id: "hijack", bogus: 1 });
  assert.equal(updated.rate, "9000");
  assert.equal(updated.id, "suite-2");
  assert.equal(updated.bogus, undefined);
  assert.equal(
    (await store.db.getRooms()).find(r => r.id === "suite").rate,
    "",
    "the other Suite is untouched although a delete shifted positions",
  );
  assert.equal(await store.db.updateRoom("nope", { rate: "x" }), null);
});

test("renaming a room keeps its address; changing the address keeps the old one as a redirect", async () => {
  const store = jsonStore({
    bookings: [],
    config: {
      rooms: [
        {
          id: "deluxe-room",
          slug: "deluxe-room",
          name: "Deluxe Room",
          text: "",
          image: "",
          rate: "",
          sample: false,
          inRoom: ["Wi-Fi"],
          services: [],
        },
        {
          id: "suite",
          slug: "suite",
          name: "Suite",
          text: "",
          image: "",
          rate: "",
          sample: false,
          inRoom: [],
          services: [],
        },
      ],
    },
  });
  const renamed = await store.db.updateRoom("deluxe-room", { name: "Deluxe King Room", slug: "" });
  assert.equal(renamed.slug, "deluxe-room", "a rename (and a blank address field) keeps the address");
  assert.deepEqual(renamed.inRoom, ["Wi-Fi"], "content stays with the room, not its name");
  const moved = await store.db.updateRoom("deluxe-room", { slug: "deluxe-king" });
  assert.equal(moved.slug, "deluxe-king");
  assert.deepEqual(moved.previousSlugs, ["deluxe-room"]);
  const back = await store.db.updateRoom("deluxe-room", { slug: "deluxe-room" });
  assert.deepEqual(back.previousSlugs, ["deluxe-king"], "the live address is never also an old one");
  await assert.rejects(
    () => store.db.updateRoom("suite", { slug: "deluxe-room" }),
    e => e.name === "RoomAddressTakenError",
  );
  await assert.rejects(
    () => store.db.addRoom({ name: "Another Suite", slug: "suite", text: "", image: "", rate: "", sample: false }),
    e => e.name === "RoomAddressTakenError",
  );
  const added = await store.db.addRoom({ name: "Suite", text: "", image: "", rate: "", sample: false });
  assert.equal(added.slug, "suite-2", "a blank address is made from the name and kept unique");
  assert.deepEqual([added.inRoom, added.services, added.view], [[], [], ""]);
  assert.equal(store.saved().config.rooms.find(r => r.id === "suite").slug, "suite", "other rooms untouched");
});

test("rooms saved before rooms had addresses keep their URL, inclusions and photo", async () => {
  const store = jsonStore(
    {
      bookings: [],
      config: {
        rooms: [
          { name: "Family Room", text: "", image: "/images/image-17.jpeg", rate: "", sample: true },
          { name: "Garden Room", text: "", image: "/images/garden.jpeg", rate: "", sample: false },
        ],
      },
    },
    [{ name: "Family Room", inRoom: ["Twin beds"], services: ["Family breakfast"] }],
  );
  const [family, garden] = await store.db.getRooms();
  assert.equal(family.slug, "family-room", "same address as before");
  assert.deepEqual([family.inRoom, family.services], [["Twin beds"], ["Family breakfast"]]);
  assert.equal(family.image, "/images/image-40.jpeg", "the picture guests were shown");
  assert.equal(family.size, "");
  assert.equal(garden.slug, "garden-room");
  assert.deepEqual(garden.inRoom, []);
  assert.equal(garden.image, "/images/garden.jpeg", "real photos are left alone");
});

test("room addresses are validated and normalised; conflicts reach staff as 409", async () => {
  const ok = validation.parseInput(validation.ROOM_SCHEMA, { name: "Deluxe", slug: " Deluxe King Room! " });
  assert.equal(ok.data.slug, "deluxe-king-room");
  assert.deepEqual([ok.data.inRoom, ok.data.services, ok.data.view], [[], [], ""]);
  assert.equal(validation.parseInput(validation.ROOM_SCHEMA, { name: "Deluxe", slug: "!!!" }).ok, false);
  assert.equal(validation.parseInput(validation.ROOM_SCHEMA, { name: "D" }).data.slug, "", "blank means automatic");
  assert.equal(validation.parseInput(validation.ROOM_SCHEMA, { name: "D", previousSlugs: ["x"] }).ok, false);
  const rooms = adminRoute(
    "rooms",
    {
      updateRoom: async (_, d) => {
        throw new RoomAddressTakenError(`The web address "${d.slug}" is already used by another room.`);
      },
    },
    true,
  );
  const res = await rooms.PATCH(jsonRequest("PATCH", { id: "1", slug: "suite" }));
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /already used/);
});

test("Postgres gives older rooms an address and their inclusions once, then keeps addresses unique", async () => {
  const queries = [];
  const rows = [
    { idx: 1, name: "Suite", slug: null, in_room: null, sample: true, image: "/images/image-16.jpeg" },
    { idx: 2, name: "Garden Room", slug: "garden-room", in_room: "[]", sample: false, image: "/images/g.jpeg" },
  ];
  const sql = async () => [];
  sql.query = async (text, params = []) => {
    queries.push({ text, params });
    if (text.startsWith("SELECT * FROM rooms ORDER BY idx")) return rows;
    if (text.startsWith("SELECT slug FROM rooms")) return rows.map(r => ({ slug: r.slug ?? "suite" }));
    if (text.startsWith("INSERT INTO rooms")) return [{ idx: 3, ...Object.fromEntries(params.map((p, i) => [i, p])) }];
    return [];
  };
  const db = load(
    "src/lib/db.ts",
    {
      fs: { default: {} },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [{ name: "Suite", inRoom: ["King bed"], services: ["Butler service"] }] } },
      "@neondatabase/serverless": { neon: () => sql },
    },
    { process: { env: { DATABASE_URL: "test-only" }, cwd: () => "/virtual" } },
  );
  await db.getRooms();
  const upgrade = queries.find(q => q.text.startsWith("UPDATE rooms SET"));
  assert.match(
    upgrade.text,
    /^UPDATE rooms SET slug = \$1, in_room = \$2, services = \$3, image = \$4 WHERE idx = \$5$/,
  );
  assert.deepEqual(upgrade.params, ["suite", '["King bed"]', '["Butler service"]', "/images/image-17.jpeg", 1]);
  assert.equal(queries.filter(q => q.text.startsWith("UPDATE rooms SET")).length, 1, "current rows are left alone");
  assert.ok(queries.some(q => /CREATE UNIQUE INDEX IF NOT EXISTS rooms_slug_key ON rooms \(slug\)/.test(q.text)));
  const before = queries.length;
  await db.getRooms();
  assert.ok(!queries.slice(before).some(q => /ALTER TABLE/.test(q.text)), "set-up runs once per process");
  await assert.rejects(
    () => db.addRoom({ name: "x", slug: "garden-room", text: "", image: "", rate: "", sample: false }),
    e => e.name === "RoomAddressTakenError",
  );
  await db.addRoom({
    name: "Garden Room",
    text: "",
    image: "/images/g.jpeg",
    rate: "",
    sample: false,
    inRoom: ["Wi-Fi"],
  });
  const insert = queries.at(-1);
  assert.match(insert.text, /^INSERT INTO rooms \(.*\) VALUES \(\$1, .*\) RETURNING \*$/);
  for (const column of ["slug", "in_room", "services", "room_view"])
    assert.match(insert.text, new RegExp(`\\b${column}\\b`));
  assert.ok(insert.params.includes("garden-room-2"), "automatic address avoids the one in use");
  assert.ok(insert.params.includes('["Wi-Fi"]'), "lists are stored as JSON");
});

test("JSON collections store only declared fields and order like Postgres", async () => {
  const store = jsonStore({ bookings: [], config: { rooms: [] } });
  const first = await store.db.addOffer({
    title: "A",
    description: "",
    discount: "",
    validFrom: "",
    validTo: "",
    active: true,
    stray: "x",
  });
  await new Promise(r => setTimeout(r, 5));
  await store.db.addOffer({ title: "B", description: "", discount: "", validFrom: "", validTo: "", active: true });
  assert.deepEqual(
    (await store.db.getOffers()).map(o => o.title),
    ["B", "A"],
    "offers newest first, as in Postgres",
  );
  assert.equal(store.saved().offers[0].stray, undefined);
  await store.db.updateOffer(first.id, { createdAt: "forged", active: false });
  const saved = store.saved().offers.find(o => o.id === first.id);
  assert.equal(saved.active, false);
  assert.notEqual(saved.createdAt, "forged");
});

test("read-only storage (e.g. Vercel without DATABASE_URL) serves defaults and refuses writes cleanly", async () => {
  const store = jsonStore(undefined);
  store.setReadOnly(true);
  assert.deepEqual(
    (await store.db.getRooms()).map(r => r.name),
    ["Deluxe Room"],
    "reads fall back to built-in content",
  );
  await assert.rejects(
    () =>
      store.db.addBooking({
        name: "Guest",
        mobile: "+919999999999",
        email: "",
        city: "",
        country: "",
        gender: "other",
        roomType: "Deluxe Room",
        checkin: future,
        checkout: "2099-01-12",
        guests: 2,
        amount: 0,
      }),
    e => e.name === "StorageUnavailableError",
  );
});

test("Postgres collections use parameterised statements for only the changed columns", async () => {
  const queries = [];
  const sql = (strings, ...values) => ({ query: strings.join("?"), values });
  sql.transaction = async () => [[], []];
  sql.query = async (text, params = []) => {
    queries.push({ text, params });
    return [{ id: "o1", title: "T", valid_from: "", valid_to: "", active: false, created_at: "2099-01-01" }];
  };
  const db = load(
    "src/lib/db.ts",
    {
      fs: { default: {} },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
      "@neondatabase/serverless": { neon: () => sql },
    },
    { process: { env: { DATABASE_URL: "test-only" }, cwd: () => "/virtual" } },
  );
  const item = await db.updateOffer("o1", { active: false, title: undefined, injected: "x" });
  assert.equal(queries.at(-1).text, "UPDATE offers SET active = $1 WHERE id = $2 RETURNING *");
  assert.deepEqual(queries.at(-1).params, [false, "o1"]);
  assert.equal(item.validFrom, "");
  assert.equal(item.active, false);
  await db.addBanquetPackage({
    name: "Gold",
    description: "",
    capacity: "",
    price: "",
    includes: ["DJ"],
    active: true,
  });
  assert.match(
    queries.at(-1).text,
    /^INSERT INTO banquet_packages \(id, name, description, capacity, price, includes, active, created_at\) VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8\)$/,
  );
  assert.equal(queries.at(-1).params[5], '["DJ"]');
  assert.equal(await db.deleteRoom("not-a-number"), false, "non-numeric room ids never reach SQL");
});

test("honeypot submissions look successful to the bot but save and notify nothing", async () => {
  const before = records.length;
  const result = await booking.POST(request({ ...payload, website: "https://spam.example" }));
  assert.equal(result.status, 201);
  const body = await result.json();
  assert.equal(body.success, true);
  assert.match(body.reference, /^[0-9a-f-]{36}$/);
  assert.equal(records.length, before);
  assert.equal((await booking.POST(request({ ...payload, website: "" }))).status, 201);
  assert.equal(records.length, before + 1);
});

test("scheduled notification retry requires a strong cron secret", async () => {
  const runs = [];
  const cronRoute = secret => {
    const env = secret === undefined ? {} : { CRON_SECRET: secret };
    const { scheduledJobsConfigured } = load(
      "src/lib/notifications.ts",
      { "node:crypto": { createHmac }, "@/lib/db": {} },
      { process: { env } },
    );
    return load(
      "src/app/api/cron/notifications/route.ts",
      {
        "node:crypto": nodeCrypto,
        "next/server": response,
        "@/lib/notifications": {
          scheduledJobsConfigured,
          deliverNotifications: async () => (runs.push(1), { configured: true, delivered: 1 }),
        },
        "@/lib/retention": { purgeExpiredRequests: async () => ({ configured: false, deleted: 0 }) },
      },
      { process: { env } },
    );
  };
  const call = (route, authorization) =>
    route.GET(
      new Request("http://localhost/api/cron/notifications", { headers: authorization ? { authorization } : {} }),
    );
  const strong = "s".repeat(32);
  assert.equal((await call(cronRoute(undefined), "Bearer ")).status, 401);
  assert.equal((await call(cronRoute("short"), "Bearer short")).status, 401);
  assert.equal((await call(cronRoute(strong))).status, 401);
  assert.equal((await call(cronRoute(strong), "Bearer wrong")).status, 401);
  assert.equal(runs.length, 0);
  const ok = await call(cronRoute(strong), "Bearer " + strong);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), {
    notifications: { configured: true, delivered: 1 },
    retention: { configured: false, deleted: 0 },
  });
  assert.equal(runs.length, 1);
});

test("coupon codes match active, in-date offers case-insensitively and read a percentage from the badge", () => {
  const offers = [
    {
      title: "A",
      discount: "Save 15% off",
      code: "Weekend15",
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
      active: true,
    },
    { title: "B", discount: "Free breakfast", code: "BFAST", validFrom: "", validTo: "", active: true },
    { title: "C", discount: "20%", code: "OFF", validFrom: "", validTo: "", active: false },
  ];
  assert.equal(dates.findCoupon(offers, " weekend15 ", "2026-06-01")?.title, "A");
  assert.equal(dates.findCoupon(offers, "WEEKEND15", "2027-01-01"), null, "expired");
  assert.equal(dates.findCoupon(offers, "OFF", "2026-06-01"), null, "inactive");
  assert.equal(dates.findCoupon(offers, "", "2026-06-01"), null, "empty code never matches an offer without one");
  assert.equal(dates.couponPercent(offers[0]), 15);
  assert.equal(dates.couponPercent(offers[1]), 0);
});

test("a valid coupon is recorded on the request; an invalid one is rejected before saving", async () => {
  const before = records.length;
  const bad = await booking.POST(request({ ...payload, couponCode: "OLD10" }));
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).field, "couponCode", "the form can point the guest at the code field");
  assert.equal(records.length, before);
  const ok = await booking.POST(request({ ...payload, couponCode: "early20", specialRequests: "Quiet room" }));
  assert.equal(ok.status, 201);
  assert.deepEqual((await ok.json()).coupon, { code: "EARLY20", title: "Early Bird", percent: 20 });
  assert.equal(records.at(-1).specialRequests, "Quiet room", "the guest's note is kept as written");
  assert.equal(records.at(-1).couponCode, "EARLY20");
  assert.equal(records.at(-1).couponOffer, "Early Bird");
  await booking.POST(request({ ...payload, couponCode: "EARLY20", specialRequests: "x".repeat(500) }));
  assert.equal(records.at(-1).specialRequests.length, 500, "a code never pushes the note past its limit");
  await booking.POST(request({ ...payload }));
  assert.equal(records.at(-1).couponCode, "", "no code, nothing recorded");
});

test("request tracking needs reference and email, and never returns contact details", async () => {
  const lookups = [];
  const track = load("src/app/api/track/route.ts", {
    "next/server": response,
    "@/lib/db": {
      StorageUnavailableError: class extends Error {},
      getBookingByIdAndEmail: async (ref, email) => {
        lookups.push([ref, email]);
        return ref === "3f9a12bc" && email === "a@b.in"
          ? {
              id: "3f9a12bc-0000",
              name: "G",
              mobile: "+91999",
              email: "a@b.in",
              roomType: "Deluxe Room",
              roomsRequested: 1,
              checkin: future,
              checkout: "",
              guests: 2,
              bookingStatus: "pending",
              createdAt: "x",
            }
          : null;
      },
    },
    "@/lib/request-limit": { allowRequest: () => true, clientKey: () => "test" },
    "@/lib/reservation": dates,
  });
  const post = b => track.POST(new Request("http://localhost/api/track", { method: "POST", body: JSON.stringify(b) }));
  assert.equal((await post({ reference: "3f9a", email: "a@b.in" })).status, 400);
  assert.equal((await post({ reference: "3f9a12bc", email: "x@b.in" })).status, 404);
  const found = await (await post({ reference: "3f9a12bc", email: "a@b.in" })).json();
  assert.equal(found.reference, "3F9A12BC");
  for (const key of ["name", "mobile", "email", "id"]) assert.ok(!(key in found), key + " must not be returned");
});

test("stay rules are shared: rooms, events, dining, counts and dates", () => {
  const rooms = [
    { id: "deluxe-room", name: "Deluxe Room", hidden: false },
    { id: "closed", name: "Closed Room", hidden: true },
  ];
  const packages = [
    { name: "Gold", active: true },
    { name: "Old", active: false },
  ];
  const stay = { checkin: future, checkout: "2099-01-12", guests: 2 };
  const ok = dates.resolveStay(
    { ...stay, roomId: "deluxe-room", roomType: "Renamed", roomsRequested: 2 },
    rooms,
    packages,
  );
  assert.deepEqual(ok.stay, {
    roomType: "Deluxe Room",
    roomId: "deluxe-room",
    roomsRequested: 2,
    checkin: future,
    checkout: "2099-01-12",
    guests: 2,
    event: false,
  });
  const unknown = "Please choose an available room or enquiry type.";
  assert.equal(dates.resolveStay({ ...stay, roomId: "closed" }, rooms, packages).error, unknown);
  assert.equal(dates.resolveStay({ ...stay, roomType: "Banquet - Old" }, rooms, packages).error, unknown);
  assert.equal(
    dates.resolveStay({ ...stay, roomId: "deluxe-room", roomsRequested: 11 }, rooms, packages).error,
    "Request between 1 and 10 rooms.",
  );
  const event = dates.resolveStay({ roomType: "Banquet - Gold", checkin: future, guests: 250 }, rooms, packages);
  assert.equal(event.stay.event, true);
  assert.equal(event.stay.roomsRequested, 0);
  assert.equal(
    dates.resolveStay({ roomType: "Dining enquiry", checkin: future, guests: 4 }, rooms, packages).stay.event,
    false,
  );
  assert.ok(dates.resolveStay({ ...stay, roomId: "deluxe-room", guests: 25 }, rooms, packages).error);
  assert.ok(dates.resolveStay({ roomId: "deluxe-room", checkin: future, guests: 2 }, rooms, packages).error);
  assert.equal(dates.contactError({ name: "", mobile: "+919999999999", email: "" }), "Enter your full name.");
  assert.equal(dates.contactError({ name: "A", mobile: "123", email: "" }), dates.phoneError("123"));
  assert.equal(
    dates.contactError({ name: "A", mobile: "+919999999999", email: "nope" }),
    "Enter a valid email address, or leave it blank.",
  );
  assert.equal(dates.contactError({ name: "A", mobile: "+919999999999", email: "" }), "");
});

test("staff bookings are saved with their status and source and queue no notification", async () => {
  const staffBooking = { ...payload, roomsRequested: 1, gender: "other", country: "", city: "Pune", amount: 0 };
  const files = new Map([["/virtual/data/db.json", JSON.stringify({ bookings: [], config: { rooms: [] } })]]);
  const fakeFs = {
    readFileSync: p => files.get(p),
    writeFileSync: (p, v) => files.set(p, v),
    existsSync: p => files.has(p) || p === "/virtual/data",
    mkdirSync: () => {},
    renameSync: (a, b) => {
      files.set(b, files.get(a));
      files.delete(a);
    },
    unlinkSync: p => files.delete(p),
  };
  const local = load(
    "src/lib/db.ts",
    {
      fs: { default: fakeFs },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
    },
    { process: { env: {}, cwd: () => "/virtual" } },
  );
  const saved = await local.addBooking(staffBooking, { status: "confirmed", source: "staff", notify: false });
  const stored = JSON.parse(files.get("/virtual/data/db.json"));
  assert.equal(saved.bookingStatus, "confirmed");
  assert.equal(stored.bookings[0].source, "staff");
  assert.equal(stored.bookings[0].bookingStatus, "confirmed");
  assert.deepEqual(stored.notificationJobs ?? [], []);

  const queries = [];
  const sql = (strings, ...values) => {
    const q = { query: strings.join("?"), values };
    queries.push(q);
    return [];
  };
  sql.transaction = async list => {
    queries.push(...list);
    return list.map(() => []);
  };
  const pg = load(
    "src/lib/db.ts",
    {
      fs: { default: {} },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
      "@neondatabase/serverless": { neon: () => sql },
    },
    { process: { env: { DATABASE_URL: "test-only" }, cwd: () => "/virtual" } },
  );
  await pg.addBooking(staffBooking, { status: "confirmed", source: "staff", notify: false });
  assert.ok(!queries.some(q => /notification_outbox \(/.test(q.query) && /INSERT/.test(q.query)));
  const insert = queries.find(q => /INSERT INTO bookings/.test(q.query));
  assert.ok(insert.values.includes("staff"));
  assert.ok(insert.values.includes("confirmed"));
  const row = { id: "b", name: "n", created_at: new Date().toISOString(), checkin: future, checkout: "", guests: 1 };
  const sqlRows = [
    { ...row, source: "staff" },
    { ...row, id: "c", source: "", coupon_code: "EARLY20", coupon_offer: "Early Bird" },
  ];
  const reader = load(
    "src/lib/db.ts",
    {
      fs: { default: {} },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
      "@neondatabase/serverless": { neon: () => Object.assign(() => sqlRows, { transaction: async () => [] }) },
    },
    { process: { env: { DATABASE_URL: "test-only" }, cwd: () => "/virtual" } },
  );
  const [staff, website] = await reader.getBookings();
  assert.equal(staff.source, "staff");
  assert.equal(website.source, undefined);
  assert.ok(!staff.couponCode, "older rows without the column read as no code");
  assert.equal(website.couponCode, "EARLY20");
  assert.equal(website.couponOffer, "Early Bird");
});

test("staff can add a confirmed booking without notifying the guest", async () => {
  const added = [];
  const db = {
    getRooms: async () => [{ id: "deluxe-room", name: "Deluxe Room", hidden: false }],
    getBanquetPackages: async () => [],
    getOffers: offersForTests,
    addBooking: async (b, options) => (added.push({ b, options }), { ...b, id: "new", bookingStatus: options.status }),
  };
  const route = adminRoute("bookings", db, true);
  const body = {
    name: "Walk-in Guest",
    mobile: "+919999999999",
    city: "Pune",
    roomType: "Deluxe Room",
    roomId: "deluxe-room",
    roomsRequested: 1,
    checkin: future,
    checkout: "2099-01-12",
    guests: 2,
    bookingStatus: "confirmed",
  };
  const res = await route.POST(jsonRequest("POST", body));
  assert.equal(res.status, 201);
  assert.equal((await res.json()).item.id, "new");
  assert.equal(added[0].b.city, "Pune");
  assert.equal(added[0].b.roomType, "Deluxe Room");
  assert.deepEqual(added[0].options, { status: "confirmed", source: "staff", notify: false });
  assert.equal((await route.POST(jsonRequest("POST", { ...body, bookingStatus: "checked-in" }))).status, 400);
  assert.equal((await route.POST(jsonRequest("POST", { ...body, paymentStatus: "paid" }))).status, 400);
  const past = await route.POST(jsonRequest("POST", { ...body, checkin: "2000-01-01", checkout: "2000-01-02" }));
  assert.equal(past.status, 400);
  assert.equal((await past.json()).error, dates.dateError("2000-01-01", "2000-01-02", true));
  const defaulted = await route.POST(jsonRequest("POST", { ...body, bookingStatus: undefined }));
  assert.equal(defaulted.status, 201);
  assert.equal(added.at(-1).options.status, "confirmed");
  assert.equal(added.length, 2);
  assert.equal(added[0].b.couponCode, "", "no code, nothing recorded");
  const coded = await route.POST(jsonRequest("POST", { ...body, couponCode: "early20" }));
  assert.equal(coded.status, 201);
  assert.equal(added.at(-1).b.couponCode, "EARLY20");
  assert.equal(added.at(-1).b.couponOffer, "Early Bird");
  const expired = await route.POST(jsonRequest("POST", { ...body, couponCode: "OLD10" }));
  assert.equal(expired.status, 400, "staff follow the same offer rules as the website");
  assert.equal(added.length, 3);
});

test("offer codes resolve to the matching current offer, an error, or nothing when none was entered", () => {
  const offers = [
    { title: "Early Bird", discount: "20%", code: "EARLY20", validFrom: "", validTo: "", active: true },
    { title: "Old", discount: "10%", code: "OLD10", validFrom: "", validTo: "2000-01-01", active: true },
  ];
  assert.equal(dates.resolveCoupon(offers, "  "), null);
  assert.deepEqual(dates.resolveCoupon(offers, "early20"), {
    coupon: { code: "EARLY20", title: "Early Bird", percent: 20 },
  });
  assert.match(dates.resolveCoupon(offers, "OLD10").error, /not valid or has expired/);
});

test("two offers can never share a code, and codes are saved in capitals", async () => {
  const store = jsonStore({ bookings: [], config: { rooms: [] } });
  const blank = { description: "", discount: "", validFrom: "", validTo: "", active: true };
  const early = await store.db.addOffer({ ...blank, title: "Early", code: " early20 " });
  assert.equal(early.code, "EARLY20");
  await assert.rejects(
    store.db.addOffer({ ...blank, title: "Copy", code: "Early20" }),
    e => e.name === "OfferCodeTakenError" && /Early/.test(e.message),
  );
  const other = await store.db.addOffer({ ...blank, title: "Weekend", code: "WEEKEND15" });
  await assert.rejects(store.db.updateOffer(other.id, { code: "early20" }), e => e.name === "OfferCodeTakenError");
  assert.equal((await store.db.updateOffer(early.id, { code: "early20", title: "Early bird" })).code, "EARLY20");
  await store.db.addOffer({ ...blank, title: "No code A", code: "" });
  await store.db.addOffer({ ...blank, title: "No code B", code: "" });
  assert.equal(store.saved().offers.length, 4, "offers without a code never clash");
  const offers = adminRoute(
    "offers",
    {
      addOffer: async () => {
        throw new OfferCodeTakenError("The code is already used.");
      },
    },
    true,
  );
  const res = await offers.POST(jsonRequest("POST", { title: "Copy", code: "EARLY20" }));
  assert.equal(res.status, 409);
});

test("requests sent before offer codes had their own fields show the code there", async () => {
  const legacy = {
    id: "old",
    name: "Asha",
    createdAt: "2026-11-01T00:00:00Z",
    specialRequests: "Coupon EARLY20 (Early Bird (rooms)) · Quiet room · high floor",
  };
  const store = jsonStore({
    bookings: [
      legacy,
      { ...legacy, id: "old-plain", specialRequests: "Coupon codes? None, thanks" },
      // Saved after the change: its note is the guest's own text, even if it looks like the old format.
      { ...legacy, id: "new", couponCode: "", couponOffer: "", specialRequests: "Coupon FREE (fake)" },
    ],
    config: { rooms: [] },
  });
  const old = await store.db.getBooking("old");
  assert.equal(old.couponCode, "EARLY20");
  assert.equal(old.couponOffer, "Early Bird (rooms)");
  assert.equal(old.specialRequests, "Quiet room · high floor");
  assert.equal((await store.db.getBooking("old-plain")).specialRequests, "Coupon codes? None, thanks");
  const fresh = await store.db.getBooking("new");
  assert.equal(fresh.couponCode, "");
  assert.equal(fresh.specialRequests, "Coupon FREE (fake)");
  const only = jsonStore({
    bookings: [{ ...legacy, specialRequests: "Coupon WEEKEND15 (Weekend)" }],
    config: { rooms: [] },
  });
  const [onlyCode] = await only.db.getBookings();
  assert.equal(onlyCode.couponCode, "WEEKEND15");
  assert.equal(onlyCode.specialRequests, "");
  const reader = load(
    "src/lib/db.ts",
    {
      fs: { default: {} },
      path: { default: path.posix },
      "./validation": validation,
      "./config": { SITE_CONFIG: { rooms: [] } },
      "@neondatabase/serverless": {
        neon: () =>
          Object.assign(
            () => [
              { id: "a", created_at: "2026-11-01", special_requests: "Coupon EARLY20 (Early Bird)", coupon_code: null },
              { id: "b", created_at: "2026-11-02", special_requests: "Coupon FREE (fake)", coupon_code: "" },
            ],
            { transaction: async () => [] },
          ),
      },
    },
    { process: { env: { DATABASE_URL: "test-only" }, cwd: () => "/virtual" } },
  );
  const [a, b] = await reader.getBookings();
  assert.equal(a.couponCode, "EARLY20");
  assert.equal(a.specialRequests, "");
  assert.equal(b.couponCode, "");
  assert.equal(b.specialRequests, "Coupon FREE (fake)");
});

test("calendar weeks start on Monday and stays are split across weeks into lanes", () => {
  const cal = load("src/components/admin/calendar-layout.ts");
  const weeks = cal.monthWeeks("2026-11");
  assert.equal(weeks.length, 6);
  assert.equal(weeks[0][0], "2026-10-26");
  assert.equal(weeks.at(-1)[6], "2026-12-06");
  assert.ok(weeks.every(w => w.length === 7));
  const stay = [{ id: "s", start: "2026-11-28", end: "2026-11-30" }];
  const week5 = cal.layoutWeek(weeks[4], stay, 3);
  assert.deepEqual(week5.segments, [
    { id: "s", lane: 0, from: 5, to: 6, continuesBefore: false, continuesAfter: true },
  ]);
  const week6 = cal.layoutWeek(weeks[5], stay, 3);
  assert.deepEqual(week6.segments, [
    { id: "s", lane: 0, from: 0, to: 0, continuesBefore: true, continuesAfter: false },
  ]);
  const crowd = ["a", "b", "c", "d"].map(id => ({ id, start: "2026-11-04", end: "2026-11-04" }));
  const busy = cal.layoutWeek(weeks[1], crowd, 3);
  assert.equal(busy.segments.length, 3);
  assert.equal(busy.hidden[2], 1);
  assert.equal(busy.hidden[0], 0);
  // A longer stay starting the same day takes the first lane; a later one reuses a free lane.
  const mixed = cal.layoutWeek(
    weeks[1],
    [
      { id: "short", start: "2026-11-02", end: "2026-11-02" },
      { id: "long", start: "2026-11-02", end: "2026-11-05" },
      { id: "after", start: "2026-11-03", end: "2026-11-03" },
    ],
    3,
  );
  const lane = id => mixed.segments.find(s => s.id === id).lane;
  assert.equal(lane("long"), 0);
  assert.equal(lane("short"), 1);
  assert.equal(lane("after"), 1);
});

test("a room request can't borrow the event guest limit by also naming an event", () => {
  const rooms = [{ id: "deluxe-room", name: "Deluxe Room", hidden: false }];
  const mixed = dates.resolveStay(
    { roomId: "deluxe-room", roomType: "Banquet hall", checkin: future, checkout: "2099-01-12", guests: 300 },
    rooms,
    [],
  );
  assert.equal(mixed.error, "Enter a guest count between 1 and 20.");
});

test("calendar places hidden-room stays under their room and shows every day of a multi-day event", () => {
  const cal = load("src/components/admin/calendar-layout.ts");
  const rooms = [
    { id: "suite", name: "Suite", hidden: true },
    { id: "deluxe-room", name: "Deluxe Room" },
  ];
  assert.equal(cal.roomFor({ roomId: "suite", roomType: "Suite" }, rooms)?.id, "suite");
  assert.equal(cal.roomFor({ roomType: "Deluxe Room" }, rooms)?.id, "deluxe-room");
  assert.equal(cal.roomFor({ roomType: "Banquet hall" }, rooms), undefined);
  // Room stays end the night before check-out; events include their end date; single days are one day.
  assert.equal(cal.lastDay({ checkin: "2026-12-05", checkout: "2026-12-07" }, true), "2026-12-06");
  assert.equal(cal.lastDay({ checkin: "2026-12-05", checkout: "2026-12-06" }, false), "2026-12-06");
  assert.equal(cal.lastDay({ checkin: "2026-12-05", checkout: "" }, false), "2026-12-05");
  assert.equal(cal.lastDay({ checkin: "2026-12-05", checkout: "2026-12-05" }, true), "2026-12-05");
});

test("booking steppers stay within the server's limits", () => {
  const format = load("src/components/admin/format.ts");
  assert.equal(format.clampCount("0", 1, 10), 1);
  assert.equal(format.clampCount(11, 1, 10), 10);
  assert.equal(format.clampCount("abc", 1, 20), 1);
  assert.equal(format.clampCount("2.7", 1, 20), 2);
  assert.equal(format.clampCount(250, 1, 20), 20);
});
