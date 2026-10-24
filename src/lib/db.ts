import fs from "fs";
import path from "path";
import { DB, Enquiry } from "./types";
import { SITE_CONFIG } from "./config";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

function readDB(): DB {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    const initial: DB = { enquiries: [], config: SITE_CONFIG };
    writeDB(initial);
    return initial;
  }
}

function writeDB(data: DB): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getEnquiries(): Enquiry[] {
  return readDB().enquiries;
}

export function getEnquiry(id: string): Enquiry | undefined {
  return readDB().enquiries.find((e) => e.id === id);
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

export function getConfig() {
  return readDB().config;
}

export function updateConfig(config: Partial<DB["config"]>) {
  const db = readDB();
  db.config = { ...db.config, ...config };
  writeDB(db);
  return db.config;
}
