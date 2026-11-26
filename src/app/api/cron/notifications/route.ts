import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { deliverNotifications, scheduledJobsConfigured } from "@/lib/notifications";
import { purgeExpiredRequests } from "@/lib/retention";
import { logError } from "@/lib/log";

const digest = (value: string) => createHash("sha256").update(value).digest();

// Scheduled job: retry queued staff notifications and delete requests past the retention period.
// Called daily by Vercel Cron (vercel.json) and more often by the GitHub Actions schedule
// (.github/workflows/scheduled-jobs.yml). Both send "Authorization: Bearer $CRON_SECRET"; without a secret of at
// least 32 characters this route refuses everything.
export async function GET(req: NextRequest) {
  const sent = req.headers.get("authorization") ?? "";
  if (!scheduledJobsConfigured() || !timingSafeEqual(digest(sent), digest("Bearer " + process.env.CRON_SECRET)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let failed = false;
  let notifications: unknown, retention: unknown;
  try {
    notifications = await deliverNotifications();
  } catch (error) {
    failed = true;
    logError("cron.notifications_failed", error);
    notifications = { error: "Notification delivery failed." };
  }
  try {
    retention = await purgeExpiredRequests();
  } catch (error) {
    failed = true;
    logError("cron.retention_failed", error);
    retention = { error: "Retention clean-up failed." };
  }
  return NextResponse.json({ notifications, retention }, { status: failed ? 500 : 200 });
}
