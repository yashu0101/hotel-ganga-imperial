import { createHmac } from "node:crypto";
import { logWarning } from "@/lib/log";
import { claimNotificationJobs, discardNotification, getBooking, markNotification } from "@/lib/db";
export function notificationConfigured() {
  const url = process.env.NOTIFICATION_WEBHOOK_URL;
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  try {
    return !!url && new URL(url).protocol === "https:" && !!secret && secret.length >= 32;
  } catch {
    return false;
  }
}
/** True when the scheduled job (/api/cron/notifications) can run: it refuses everything without this secret. */
export function scheduledJobsConfigured() {
  const secret = process.env.CRON_SECRET;
  return !!secret && secret.length >= 32;
}
/**
 * Send due notification events. `force` is for staff pressing Retry (e.g. right after fixing the receiver): it
 * skips the back-off between attempts but never re-sends an event picked up in the last few minutes.
 */
export async function deliverNotifications(bookingId?: string, { force = false }: { force?: boolean } = {}) {
  if (!notificationConfigured()) return { configured: false, delivered: 0, pending: true };
  // Only events that are due (retries back off after each failure), fewest attempts first, then oldest. Claiming
  // stamps them so an overlapping run skips them. After MAX_NOTIFICATION_ATTEMPTS an event is marked "failed" and
  // leaves the queue until staff requeue it.
  const jobs = await claimNotificationJobs({ limit: 10, bookingId, force });
  let delivered = 0;
  for (const job of jobs) {
    const booking = await getBooking(job.bookingId);
    if (!booking) {
      await discardNotification(job.id); // The request was deleted; nothing left to send.
      continue;
    }
    const timestamp = String(Date.now());
    const body = JSON.stringify({
      event: "reservation.requested",
      eventId: job.id,
      request: {
        reference: booking.id,
        name: booking.name,
        mobile: booking.mobile,
        email: booking.email,
        preference: booking.roomType,
        checkin: booking.checkin,
        checkout: booking.checkout,
        guests: booking.guests,
        roomsRequested: booking.roomsRequested ?? 1,
        specialRequests: booking.specialRequests ?? "",
        status: "pending",
      },
      instructions: {
        staff: "Review availability and contact the guest.",
        guest: "Acknowledge the request; do not describe it as a confirmed reservation.",
      },
    });
    const signature = createHmac("sha256", process.env.NOTIFICATION_WEBHOOK_SECRET!)
      .update(timestamp + "." + body)
      .digest("hex");
    let ok = false;
    try {
      const response = await fetch(process.env.NOTIFICATION_WEBHOOK_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hotel-Timestamp": timestamp,
          "X-Hotel-Signature": signature,
          "Idempotency-Key": job.id,
        },
        body,
        signal: AbortSignal.timeout(4000),
        redirect: "error",
      });
      ok = response.ok;
      if (!ok) logWarning("notification.rejected", { eventId: job.id, status: response.status });
    } catch (error) {
      ok = false;
      logWarning("notification.unreachable", { eventId: job.id, error: String(error) });
    }
    await markNotification(job.id, ok);
    if (ok) delivered++;
  }
  return { configured: true, delivered, pending: delivered < jobs.length };
}
