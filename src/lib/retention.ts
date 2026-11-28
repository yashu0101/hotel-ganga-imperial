import { getSettings, purgeDeletedBefore, purgeRequestsBefore } from "@/lib/db";

/** Days a request stays in Deleted (restorable) before it is erased. */
export const DELETED_KEPT_DAYS = 30;

/**
 * The moment `months` months before `now` (UTC). A day the target month doesn't have becomes its last day
 * (31 March − 1 month = 28/29 February), so the cutoff never moves later and nothing is deleted early.
 */
export function retentionCutoff(months: number, now = new Date()) {
  const cutoff = new Date(now);
  const day = cutoff.getUTCDate();
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(day, lastDay));
  return cutoff;
}

/**
 * Delete requests older than the retention period published in the privacy notice. Does nothing until the period is
 * set (Admin → Settings), so no data is removed before the hotel decides it.
 */
export async function purgeExpiredRequests(now = new Date()) {
  // Deleted requests are erased after 30 days whatever the retention period, as the dashboard promises.
  const erasedFromDeleted = await purgeDeletedBefore(new Date(now.getTime() - DELETED_KEPT_DAYS * 86_400_000));
  const months = (await getSettings()).retentionMonths;
  if (!(months > 0)) return { configured: false, deleted: 0, erasedFromDeleted };
  return { configured: true, deleted: await purgeRequestsBefore(retentionCutoff(months, now)), erasedFromDeleted };
}
