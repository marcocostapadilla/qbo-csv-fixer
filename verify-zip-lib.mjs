/**
 * Test helpers for verify-pro.mjs: an independent ZIP reader (central directory, local headers,
 * CRC-32 per entry), a python3 -m zipfile -t cross-check, and an in-memory localStorage.
 */
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { crc32 } from './zip.mjs';

/** Independent reader: walk the central directory, check each local header and CRC. */
export function readZip(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const eocd = buf.length - 22;
  if (v.getUint32(eocd, true) !== 0x06054b50) throw new Error('no end record');
  const count = v.getUint16(eocd + 10, true);
  const cdSize = v.getUint32(eocd + 12, true);
  let p = v.getUint32(eocd + 16, true);
  if (p + cdSize !== eocd) throw new Error('central directory size/offset mismatch');
  const out = [];
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('bad central header ' + i);
    const crc = v.getUint32(p + 16, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const off = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLen));
    if (v.getUint32(off, true) !== 0x04034b50) throw new Error('bad local header ' + name);
    if (v.getUint16(off + 8, true) !== 0) throw new Error('not STORE ' + name);
    if (v.getUint32(off + 14, true) !== crc || v.getUint32(off + 22, true) !== size) throw new Error('local/central mismatch ' + name);
    const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
    const data = buf.subarray(start, start + size);
    out.push({ name, crc, size, data, crcOk: crc32(data) === crc, text: new TextDecoder().decode(data) });
    p += 46 + nameLen + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  return out;
}

export function pythonZipTest(buf) {
  const dir = mkdtempSync(join(tmpdir(), 'qbo-zip-'));
  const f = join(dir, 't.zip');
  writeFileSync(f, buf);
  const r = spawnSync('python3', ['-m', 'zipfile', '-t', f], { encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  if (r.error) return null; // python3 not installed: skipped
  return r.status === 0 && /Done testing/.test(r.stdout + r.stderr);
}

export function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}
