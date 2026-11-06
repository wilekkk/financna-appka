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

export function parseAmount(str) {
  return parseFloat((str || '0').replace(',', '.').replace(/\s/g, '')) || 0;
}

export function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map(h => h.trim());
  const idx = name => {
    const e = headers.findIndex(h => h === name);
    return e !== -1 ? e : headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
  };
  const iDatum = idx('Dátum spracovania'), iSuma = idx('Suma');
  const iTyp = idx('Typ'), iInfo = idx('Informácia pre príjemcu'), iPopis = idx('Popis');

  return lines.slice(1).flatMap((line, i) => {
    const cols = parseCSVRow(line);
    if (cols.length < 3) return [];
    const typRaw = (cols[iTyp] || '').trim();
    const isDebet  = typRaw.toLowerCase().includes('debet');
    const isKredit = typRaw.toLowerCase().includes('kredit');
    if (!isDebet && !isKredit) return [];
    const amount = isDebet
      ? -Math.abs(parseAmount(cols[iSuma]))
      :  Math.abs(parseAmount(cols[iSuma]));
    const info  = (cols[iInfo] || '').trim();
    const store = extractStoreName(info) || (cols[iPopis] || '').trim() || '(neznámy)';
    return [{ id: i + 1, store, amount, date: (cols[iDatum] || '').trim(), typ: isDebet ? 'debet' : 'kredit' }];
  });
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

export function parseRevolutCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  return lines.slice(1).flatMap((line, i) => {
    const cols = parseCSVRow(line);
    if (cols.length < 9) return [];
    const [, product, started, completed, description, amountRaw, feeRaw, currency, state] = cols;
    if (product !== 'Current') return [];
    if (currency !== 'EUR') return [];
    if (REVOLUT_SKIPPED_STATES.includes(state.toUpperCase())) return [];

    // Poplatok Revolut strháva navyše, takže skutočná suma = Amount - Fee.
    const amount = Math.round((parseAmount(amountRaw) - Math.abs(parseAmount(feeRaw))) * 100) / 100;
    if (amount === 0) return [];
    const date = revolutDate(completed) || revolutDate(started); // PENDING ešte nemá Completed Date
    return [{ id: i + 1, store: description || '(neznámy)', amount, date, typ: amount < 0 ? 'debet' : 'kredit' }];
  });
}
