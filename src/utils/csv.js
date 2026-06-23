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
