import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { deliverNotifications } from "@/lib/notifications";

const digest = (value: string) => createHash("sha256").update(value).digest();

// Scheduled retry for queued staff notifications (see vercel.json). Vercel Cron sends
// "Authorization: Bearer $CRON_SECRET"; without a secret of at least 32 characters this route refuses everything.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const sent = req.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32 || !timingSafeEqual(digest(sent), digest("Bearer " + secret)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await deliverNotifications());
  } catch {
    return NextResponse.json({ error: "Notification delivery failed." }, { status: 500 });
  }
}
