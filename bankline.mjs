/**
 * v1.5.21: the "Read as" line at the top of step 3 (moved out of ui.mjs).
 * The general-layout sample is messy on purpose; say so, so a first try does not look like a broken tool.
 */
export const MESSY_SAMPLE = 'chase-like-messy.csv (sample)';

export function bankLine(o, detectText, fileLabel) {
  const tail = ' Every row is previewed below the Download button.';
  if ((!o || o.value === 'generic_bank') && fileLabel === MESSY_SAMPLE) {
    return 'This is the general-layout sample, made messy on purpose: its balances do not add up, so the badge says FAIL, and its dates need a US or EU pick. A clean file shows PASS or N/A.' + tail;
  }
  if (!o || o.value === 'generic_bank') {
    const near = (String(detectText || '').match(/Closest match: .+?\.(?= Check the preview)/) || [''])[0]; // v1.5.18
    return `Bank not recognized, so the file was read with the general layout. ${near ? near + ' ' : ''}Check the columns used and the signs in the preview below. If your bank is in the list in step 2 above, pick it.` + tail;
  }
  return `Read as: ${o.textContent}. Wrong bank? Pick another in step 2 above.` + tail;
}
