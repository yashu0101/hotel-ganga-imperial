import { NextRequest } from "next/server";
import { getNotificationJobs, requeueFailedNotifications } from "@/lib/db";
import { deliverNotifications, notificationConfigured } from "@/lib/notifications";
import { isAdmin, json, readBody, serverError, unauthorized } from "@/lib/admin-route";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  try {
    const jobs = await getNotificationJobs();
    const count = (status: string) => jobs.filter(j => j.status === status).length;
    return json({
      configured: notificationConfigured(),
      pending: count("pending"),
      delivered: count("delivered"),
      failed: count("failed"),
    });
  } catch (error) {
    return serverError(error);
  }
}

// Retry pending events. With { "action": "requeue" }, failed events go back in the queue first.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const body = (await readBody(req)) as { action?: unknown } | undefined;
    const requeued = body?.action === "requeue" ? await requeueFailedNotifications() : 0;
    return json({ ...(await deliverNotifications()), requeued });
  } catch (error) {
    return serverError(error);
  }
}
