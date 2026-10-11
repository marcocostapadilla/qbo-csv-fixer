/** v1.5.17 encoding/delimiter variants, built from samples/adversarial/v1517 (UTF-8 bases). Used by verify-v1517.mjs. */
const CP = { 'é': 0xe9 };
export const toCp1252 = (t) => Buffer.from([...t].map((c) => CP[c] ?? c.charCodeAt(0)));

/** Small RFC 4180 reader, independent of the app's parser. */
export function rowsOf(t) {
  const out = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); out.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  return out;
}
const write = (rows, d, eol = '\n') => rows.map((r) => r.map((v) => (/["\n\r]/.test(v) || v.includes(d) ? `"${v.replace(/"/g, '""')}"` : v)).join(d)).join(eol) + eol;

export const VARIANTS = {
  'base (comma, LF, quoted newline+comma)': (t) => Buffer.from(t),
  'semicolon': (t) => Buffer.from(write(rowsOf(t), ';')),
  'tab': (t) => Buffer.from(write(rowsOf(t), '\t')),
  'UTF-8 BOM': (t) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(t)]),
  'UTF-16 LE BOM': (t) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(t, 'utf16le')]),
  'Windows-1252': (t) => toCp1252(t),
  'CRLF': (t) => Buffer.from(write(rowsOf(t), ',', '\r\n')),
  'mixed line endings': (t) => Buffer.from(write(rowsOf(t), ',').split('\n').map((l, i) => l + (i % 2 ? '\r\n' : '\n')).join('').replace(/\n$/, '')),
  'trailing blank lines': (t) => Buffer.from(t + '\n\n,,\n\n'),
  'trailing delimiter': (t) => Buffer.from(rowsOf(t).map((r) => write([r], ',').replace(/\n$/, ',')).join('\n') + '\n'),
};
