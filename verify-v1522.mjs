/** v1.5.22: wrong-file messages (OFX/QFX/QBO, xlsx, pdf, empty, header-only, semicolon, very large). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { processCsv, rejectReason } from './core.mjs';
import { decodeBytes } from './encoding.mjs';
import { assert, ROOT } from './verify-lib.mjs';

const OFX = 'OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX><BANKMSGSRSV1><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260203<TRNAMT>-12.50<NAME>CAFE</STMTTRN></BANKMSGSRSV1></OFX>\n';
const OFXML = '<?xml version="1.0" encoding="UTF-8"?>\n<?OFX OFXHEADER="200" VERSION="220"?>\n<OFX><STMTTRN><TRNAMT>-12.50</TRNAMT></STMTTRN></OFX>\n';

export function run() {
  console.log('');
  console.log('=== v1.5.22 wrong-file messages ===');
  for (const [name, t] of [['OFX SGML', OFX], ['OFX XML', OFXML], ['QBO (INTU.BID)', OFX.replace('<OFX>', '<OFX><INTU.BID>3000')], ['bare <OFX>', '<OFX>\n<STMTTRN></STMTTRN></OFX>']]) {
    const r = processCsv(t, 'generic_bank');
    assert(r.fileError && /QuickBooks Online imports these directly: Banking > Upload from file/.test(r.fileError.message) && !r.transactions.length, `${name}: says QuickBooks imports it directly`);
  }
  const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 20, 0, 0, 0, 8, 0, 0x21, 0, 0x5b, 0x43, 0x6f, 0x6e, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert(/Excel workbook \(\.xlsx\).*File > Save As > CSV/.test(rejectReason(decodeBytes(zip).text)), 'xlsx (zip) bytes: names Excel and Save As CSV');
  assert(rejectReason('PK,Date,Description,Amount\n1,03/02/2026,CAFE,-5.00\n') === null, 'a CSV whose first header is PK is not mistaken for a zip');
  assert(rejectReason('Date,Memo,Amount\n03/02/2026,OFX fee,-5.00\n') === null, 'a CSV that mentions OFX in a cell is still read');
  assert(/choose CSV instead of PDF/.test(rejectReason('%PDF-1.4\n')), 'pdf message unchanged');
  assert(/This file is empty/.test(rejectReason('')), '0-byte file message unchanged');
  const ho = processCsv('Date,Description,Amount\n', 'generic_bank');
  assert(!ho.transactions.length && ho.fileError && /No transaction rows found/.test(ho.fileError.message), `header-only file: no rows message (got ${ho.fileError && ho.fileError.message})`);
  const semi = processCsv('Date;Description;Amount\n03/02/2026;CORNER CAFE;-12,50\n03/03/2026;ACME PAYROLL;1.850,00\n', 'generic_bank');
  assert(semi.transactions.map((t) => t.amount).join('|') === '-12.5|1850', 'semicolon file with comma decimals reads the right amounts');
  let big = 'Date,Description,Amount\n';
  for (let i = 0; i < 50000; i++) big += `03/${String((i % 28) + 1).padStart(2, '0')}/2026,MERCHANT ${i},-${(i % 500) + 0.25}\n`;
  const t0 = Date.now();
  const rb = processCsv(big, 'generic_bank');
  const ms = Date.now() - t0;
  assert(rb.transactions.length === 50000 && ms < 5000, `50k-row file parses in under 5 s (${ms} ms)`);
  const app = readFileSync(join(ROOT, 'app.js'), 'utf8');
  assert(/free version converts up to/.test(app + readFileSync(join(ROOT, 'ui.mjs'), 'utf8')), 'free-limit message present');
}
