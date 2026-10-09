/**
 * QBO CSV Fixer - turn the raw bytes of a dropped file into text.
 * UTF-8 (with or without BOM) is read as UTF-8. UTF-16 LE/BE with a BOM, or UTF-16 LE without
 * one (Excel "Unicode Text"), is read as UTF-16. Anything that is not valid UTF-8 is read as
 * Windows-1252 (Excel "CSV" on Windows: smart quotes, euro sign, accented letters), so those
 * files are no longer rejected as binary. Pure function: runs in the browser and in Node.
 */

// Windows-1252 0x80-0x9F (undefined bytes become U+FFFD, so binary files are still rejected)
const CP1252_HIGH =
  '\u20ac\ufffd\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\ufffd\u017d\ufffd' +
  '\ufffd\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\ufffd\u017e\u0178';

function utf16(bytes, start, bigEndian) {
  let s = '';
  for (let i = start; i + 1 < bytes.length; i += 2) {
    s += String.fromCharCode(bigEndian ? (bytes[i] << 8) | bytes[i + 1] : bytes[i] | (bytes[i + 1] << 8));
  }
  return s;
}

/** UTF-16 LE without a BOM: almost every odd byte is 0 and the even bytes are text. */
function looksUtf16le(bytes) {
  const n = Math.min(bytes.length, 512) & ~1;
  if (n < 8) return false;
  let oddZero = 0;
  let evenZero = 0;
  for (let i = 0; i < n; i += 2) {
    if (bytes[i] === 0) evenZero++;
    if (bytes[i + 1] === 0) oddZero++;
  }
  return oddZero / (n / 2) > 0.9 && evenZero === 0;
}

export function cp1252(bytes) {
  let s = '';
  for (const b of bytes) s += b >= 0x80 && b <= 0x9f ? CP1252_HIGH[b - 0x80] : String.fromCharCode(b);
  return s;
}

/** bytes: Uint8Array (or ArrayBuffer). Returns { text, encoding }. */
export function decodeBytes(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: utf16(bytes, 2, false), encoding: 'UTF-16 LE' };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: utf16(bytes, 2, true), encoding: 'UTF-16 BE' };
  if (looksUtf16le(bytes)) return { text: utf16(bytes, 0, false), encoding: 'UTF-16 LE' };
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'UTF-8' };
  } catch {
    return { text: cp1252(bytes), encoding: 'Windows-1252' };
  }
}
