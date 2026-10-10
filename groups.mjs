/**
 * v1.5.15: <optgroup> headings for the bank list (native select, so keyboard and screen readers
 * work as before). Order inside a group follows PRESETS. A preset missing here goes to "Other".
 */
export const PRESET_GROUPS = [
  ['Banks and brokerages', ['generic_bank', 'chase', 'bofa', 'wells_fargo', 'us_bank', 'pnc', 'navy_federal', 'ally', 'sofi', 'capital_one_360', 'td_bank', 'usaa', 'mercury', 'revolut', 'wise', 'fidelity']],
  ['Credit cards', ['amex', 'capital_one', 'citi', 'discover', 'bofa_card', 'apple_card']],
  ['Payment apps and processors', ['paypal', 'stripe', 'venmo', 'cash_app', 'square_transfers', 'shopify', 'shopify_payouts', 'etsy']],
  ['Point of sale', ['square', 'toast']],
];

/** [[label, [preset, ...]], ...] for the presets given, with an "Other" group for any left over. */
export function groupPresets(presets) {
  const all = Object.values(presets);
  const seen = new Set();
  const out = [];
  for (const [label, ids] of PRESET_GROUPS) {
    const list = all.filter((p) => ids.includes(p.id));
    list.forEach((p) => seen.add(p.id));
    if (list.length) out.push([label, list]);
  }
  const rest = all.filter((p) => !seen.has(p.id));
  if (rest.length) out.push(['Other', rest]);
  return out;
}
