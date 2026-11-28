import { NextRequest } from "next/server";
import { countNotifications, getSettings, requeueFailedNotifications } from "@/lib/db";
import { deliverNotifications, notificationConfigured, scheduledJobsConfigured } from "@/lib/notifications";
import { isAdmin, json, readBody, serverError, unauthorized } from "@/lib/admin-route";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    return json({
      configured: notificationConfigured(),
      // The panel warns when the scheduled job cannot run, since the retention promise and automatic retries need it.
      scheduledJobs: scheduledJobsConfigured(),
      retentionMonths: (await getSettings()).retentionMonths,
      ...(await countNotifications()),
    });
  } catch (error) {
    return serverError(error);
  }
}

// Staff retry: sends pending events now, skipping the back-off. With { "action": "requeue" }, failed events go back
// in the queue first.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await readBody(req)) as { action?: unknown } | undefined;
    const requeued = body?.action === "requeue" ? await requeueFailedNotifications() : 0;
    return json({ ...(await deliverNotifications(undefined, { force: true })), requeued });
  } catch (error) {
    return serverError(error);
  }
}
