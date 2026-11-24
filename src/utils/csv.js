export function parseCSVRow(row) {
  const result = [];
  let current = '', inQuotes = false;
  for (const ch of row) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

export function extractStoreName(info) {
  if (!info) return '';
  const match = info.match(/[\d][0-9,.]*\s*EUR\s+([\s\S]+)/i);
  return match ? match[1].trim() : info.trim();
}

// Suma z výpisu: "12,50", "-4.30", "1 234,56", "1.234,56", "1,234.56", "−5,00 €".
// Desatinný oddeľovač je ten posledný (čiarka alebo bodka), ostatné sú oddeľovače tisícov.
// Nečitateľná suma vráti NaN, aby sa riadok nenahral potichu ako 0.
export function parseAmount(str) {
  let s = String(str ?? '').replace(/[\s  ]/g, '').replace(/[−–]/g, '-').replace(/EUR|€/gi, '');
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(','), lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(/,(?=.*,)/g, '').replace(',', '.');
  else if (lastDot > lastComma) s = s.replace(/,/g, '');
  return /^[-+]?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

// Chyba vo formáte celého súboru (napr. chýba stĺpec). UploadZone ju ukáže používateľovi.
export class CsvFormatError extends Error {}

// Dôvody, prečo sa riadok nenahral. Počty sa ukážu používateľovi pred pokračovaním.
export const SKIP_REASONS = {
  invalid:      'nečitateľné riadky (chýba dátum alebo suma)',
  otherType:    'riadky bez typu Debet alebo Kredit',
  otherAccount: 'pohyby na inom účte než hlavnom (napr. Savings, Pockets)',
  currency:     'platby v inej mene ako EUR',
  failed:       'zrušené alebo zamietnuté platby',
  zero:         'pohyby s nulovou sumou',
  cardRepayment: 'splátky kreditnej karty (výdavky z karty nahraj z výpisu karty, aby sa nerátali dvakrát)',
};

// "3 × platby v inej mene ako EUR" pre každý dôvod s aspoň jedným riadkom.
export function describeSkipped(skipped) {
  return Object.entries(SKIP_REASONS)
    .filter(([key]) => skipped[key] > 0)
    .map(([key, label]) => `${skipped[key]} × ${label}`);
}

const DATE_RE = /^\d{1,2}\.\d{1,2}\.\d{4}/;

// Tatra banka. Vráti { transactions, skipped }, skipped = počty vynechaných riadkov podľa dôvodu.
export function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { transactions: [], skipped: {} };
  const headers = parseCSVRow(lines[0]).map(h => h.trim());
  const idx = name => {
    const e = headers.findIndex(h => h === name);
    return e !== -1 ? e : headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
  };
  const iDatum = idx('Dátum spracovania'), iSuma = idx('Suma');
  const iTyp = idx('Typ'), iInfo = idx('Informácia pre príjemcu'), iPopis = idx('Popis');
  const missing = [['Dátum spracovania', iDatum], ['Suma', iSuma], ['Typ', iTyp]].find(([, i]) => i === -1);
  if (missing) throw new CsvFormatError(`Vo výpise chýba stĺpec „${missing[0]}“.`);

  const skipped = {};
  const skip = reason => { skipped[reason] = (skipped[reason] || 0) + 1; return []; };
  const transactions = lines.slice(1).flatMap((line, i) => {
    const cols = parseCSVRow(line);
    if (cols.length < 3) return [];
    const typRaw = (cols[iTyp] || '').trim().toLowerCase();
    const isDebet  = typRaw.includes('debet');
    const isKredit = typRaw.includes('kredit');
    if (!isDebet && !isKredit) return skip('otherType');
    const parsed = parseAmount(cols[iSuma]);
    const date = (cols[iDatum] || '').trim();
    if (Number.isNaN(parsed) || !DATE_RE.test(date)) return skip('invalid');
    const amount = isDebet ? -Math.abs(parsed) : Math.abs(parsed);
    const info  = (cols[iInfo] || '').trim();
    const store = extractStoreName(info) || (cols[iPopis] || '').trim() || '(neznámy)';
    return [{ id: i + 1, store, amount, date, typ: isDebet ? 'debet' : 'kredit' }];
  });
  return { transactions, skipped };
}

// Revolut (anglický export). Stĺpce čítame podľa poradia, nie podľa názvu:
// 0 Type, 1 Product, 2 Started Date, 3 Completed Date, 4 Description,
// 5 Amount, 6 Fee, 7 Currency, 8 State, 9 Balance
const REVOLUT_SKIPPED_STATES = ['REVERTED', 'DECLINED', 'FAILED'];

// "2026-10-01 15:38:51" -> "01.10.2026"
function revolutDate(str) {
  const match = (str || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '';
}

// Vráti { transactions, skipped } ako parseCSV.
export function parseRevolutCSV(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { transactions: [], skipped: {} };

  const skipped = {};
  const skip = reason => { skipped[reason] = (skipped[reason] || 0) + 1; return []; };
  const transactions = lines.slice(1).flatMap((line, i) => {
    const cols = parseCSVRow(line);
    if (cols.length < 9) return skip('invalid');
    const [, product, started, completed, description, amountRaw, feeRaw, currency, state] = cols;
    if (product !== 'Current') return skip('otherAccount');
    if (currency !== 'EUR') return skip('currency');
    if (REVOLUT_SKIPPED_STATES.includes(state.toUpperCase())) return skip('failed');

    // Poplatok Revolut strháva navyše, takže skutočná suma = Amount - Fee. Prázdny poplatok = 0.
    const parsed = parseAmount(amountRaw);
    const fee = feeRaw.trim() ? parseAmount(feeRaw) : 0;
    const startedDate = revolutDate(started);
    const date = revolutDate(completed) || startedDate; // PENDING ešte nemá Completed Date
    if (Number.isNaN(parsed) || Number.isNaN(fee) || !date) return skip('invalid');
    const amount = Math.round((parsed - Math.abs(fee)) * 100) / 100;
    if (amount === 0) return skip('zero');
    // started = dátum začatia, podľa neho sa spozná tá istá platba pred dokončením aj po ňom
    return [{ id: i + 1, store: description || '(neznámy)', amount, date, ...(startedDate && { started: startedDate }), typ: amount < 0 ? 'debet' : 'kredit' }];
  });
  return { transactions, skipped };
}
