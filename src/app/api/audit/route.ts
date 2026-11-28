import { NextRequest } from "next/server";
import { getAuditLog } from "@/lib/db";
import { adminActor, json, serverError, unauthorized } from "@/lib/admin-route";

// The activity log (Admin → Activity): who changed what, newest first. ?limit=N (1–500, default 200).
export async function GET(req: NextRequest) {
  if (!(await adminActor())) return unauthorized();
  try {
    const limit = Number(new URL(req.url).searchParams.get("limit") ?? 200);
    return json(await getAuditLog(Number.isInteger(limit) && limit >= 1 && limit <= 500 ? limit : 200));
  } catch (error) {
    return serverError(error);
  }
}
