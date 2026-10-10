/**
 * v1.5.15: wording for rows left out on purpose (status rules). Rows not posted yet (pending,
 * scheduled, in transit, processing) are named apart from rows that never moved money (failed,
 * cancelled, declined, voided, memo), so a scheduled future payment is never called "pending".
 */
export const NOT_YET = /\b(?:pending|scheduled|in transit|in_transit|processing)\b/i;

export function skippedText(rows, listRows) {
  if (!rows || !rows.length) return '';
  const fmt = (s) => `row ${s.sourceRow} (${s.reason})`;
  const later = rows.filter((s) => NOT_YET.test(s.reason));
  const never = rows.filter((s) => !NOT_YET.test(s.reason));
  const parts = [`Left out ${rows.length} row(s) on purpose.`];
  if (later.length) parts.push(`Not posted yet (pending or scheduled): ${listRows(later, fmt)}. They show up in a later export once they post.`);
  if (never.length) parts.push(`Did not move money (failed, cancelled, declined, voided or memo lines): ${listRows(never, fmt)}. That is expected.`);
  return parts.join(' ');
}
