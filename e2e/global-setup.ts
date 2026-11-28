import fs from "node:fs";
import path from "node:path";
import { E2E_DB_FILE } from "./env";

// Each run starts from the committed content: copy data/db.json to the throwaway store the test server uses.
export default function globalSetup() {
  const root = path.resolve(__dirname, "..");
  const target = path.join(root, E2E_DB_FILE);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, "data", "db.json"), target);
}
