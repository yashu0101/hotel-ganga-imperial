import { purgeRequestsBefore } from "@/lib/db";
import { PRIVACY_INFORMATION } from "@/lib/hotel-content";

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
 * Delete requests older than the retention period published in the privacy notice. Does nothing until
 * PRIVACY_INFORMATION.retentionMonths is set, so no data is removed before the hotel decides the period.
 */
export async function purgeExpiredRequests(now = new Date()) {
  const months = PRIVACY_INFORMATION.retentionMonths;
  if (!(months > 0)) return { configured: false, deleted: 0 };
  return { configured: true, deleted: await purgeRequestsBefore(retentionCutoff(months, now)) };
}
