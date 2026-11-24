// VÚB banka: výpis z účtu aj z karty ako súbor Excel (.xls).
// Ktorý z nich to je, sa pozná podľa stĺpcov v hlavičke (výpis z karty má „Dátum zaúčtovania“).
//
// Výpis z účtu: Dátum | Druh transakcie | Informácia pre príjemcu | Suma ("- 11,00") | Mena
// Výpis z karty: Dátum autorizácie | Dátum zaúčtovania | Typ transakcie | Typ transakcie kartou |
//                Popis ("*6842 KAUFLAND …") | Stav | Suma ("- 7,00 EUR")
//
// Karta je kreditná a účet ju spláca jednou platbou. Splátky sa z výpisu účtu vynechajú,
// inak by sa výdavky z karty rátali dvakrát (raz nákupy z výpisu karty, raz splátka).
import { parseAmount, CsvFormatError } from './csv';

const DATE_RE = /^\d{1,2}\.\d{1,2}\.\d{4}/;
const CARD_REPAYMENT_RE = /spl[aá]tk\w*\s+(ku\s+)?kredit/i;
const FAILED_STATE_RE = /zamietnut|zrušen|zrusen|stornovan/i;

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const findColumn = (headers, name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());

function requireColumns(headers, names) {
  const columns = Object.fromEntries(names.map(name => [name, findColumn(headers, name)]));
  const missing = names.find(name => columns[name] === -1);
  if (missing) throw new CsvFormatError(`Vo výpise chýba stĺpec „${missing}“.`);
  return columns;
}

// "Platba kartou; Bestero.datames  Trnava" -> "Bestero.datames Trnava"
function accountStoreName(info, kind) {
  const text = clean(info);
  const parts = text.split(';').map(part => part.trim()).filter(Boolean);
  if (parts.length > 1 && parts[0].toLowerCase() === 'platba kartou') return parts.slice(1).join('; ');
  return text || clean(kind) || '(neznámy)';
}

// "*6842 KAUFLAND 8620, TT, TRS TRNAVA" -> "KAUFLAND 8620, TT, TRS TRNAVA"
const cardStoreName = description => clean(description).replace(/^\*\d+\s+/, '') || '(neznámy)';

// "- 7,00 EUR" -> { amount: -7, currency: 'EUR' }; bez meny sa predpokladá EUR
function amountWithCurrency(value) {
  const text = clean(value);
  const match = text.match(/([A-Z]{3})$/);
  const currency = match ? match[1] : 'EUR';
  return { amount: parseAmount(text.replace(/[A-Z]{3}$/, '')), currency };
}

// rows = riadky hárku ako polia textov. Vráti { transactions, skipped } ako parseCSV.
export function parseVubRows(rows) {
  const headerIndex = rows.findIndex(row => {
    const cells = row.map(cell => clean(cell).toLowerCase());
    return cells.includes('suma') && cells.some(cell => cell.startsWith('dátum'));
  });
  if (headerIndex === -1) throw new CsvFormatError('Vo výpise sa nenašla hlavička so stĺpcami Dátum a Suma.');
  const headers = rows[headerIndex].map(clean);
  const isCard = findColumn(headers, 'Dátum zaúčtovania') !== -1;

  const skipped = {};
  const skip = reason => { skipped[reason] = (skipped[reason] || 0) + 1; return []; };
  const dataRows = rows.slice(headerIndex + 1);
  let transactions;

  if (isCard) {
    const col = requireColumns(headers, ['Dátum autorizácie', 'Dátum zaúčtovania', 'Popis', 'Stav', 'Suma']);
    transactions = dataRows.flatMap((row, i) => {
      if (row.every(cell => !clean(cell))) return [];
      if (FAILED_STATE_RE.test(clean(row[col.Stav]))) return skip('failed');
      const { amount: parsed, currency } = amountWithCurrency(row[col.Suma]);
      if (currency !== 'EUR') return skip('currency');
      const authorized = clean(row[col['Dátum autorizácie']]);
      // Ešte nezaúčtovaná platba má len dátum autorizácie (ako čakajúca platba v Revolute)
      const date = clean(row[col['Dátum zaúčtovania']]) || authorized;
      if (Number.isNaN(parsed) || !DATE_RE.test(date)) return skip('invalid');
      const amount = Math.round(parsed * 100) / 100;
      if (amount === 0) return skip('zero');
      return [{
        id: i + 1, store: cardStoreName(row[col.Popis]), amount, date,
        ...(DATE_RE.test(authorized) && { started: authorized }),
        typ: amount < 0 ? 'debet' : 'kredit',
      }];
    });
  } else {
    const col = requireColumns(headers, ['Dátum', 'Suma']);
    const iKind = findColumn(headers, 'Druh transakcie');
    const iInfo = findColumn(headers, 'Informácia pre príjemcu');
    const iCurrency = findColumn(headers, 'Mena');
    transactions = dataRows.flatMap((row, i) => {
      if (row.every(cell => !clean(cell))) return [];
      const info = iInfo === -1 ? '' : row[iInfo];
      if (CARD_REPAYMENT_RE.test(clean(info))) return skip('cardRepayment');
      const currency = iCurrency === -1 ? 'EUR' : (clean(row[iCurrency]) || 'EUR');
      if (currency !== 'EUR') return skip('currency');
      const parsed = parseAmount(row[col.Suma]);
      const date = clean(row[col['Dátum']]);
      if (Number.isNaN(parsed) || !DATE_RE.test(date)) return skip('invalid');
      const amount = Math.round(parsed * 100) / 100;
      if (amount === 0) return skip('zero');
      const kind = iKind === -1 ? '' : row[iKind];
      return [{ id: i + 1, store: accountStoreName(info, kind), amount, date, typ: amount < 0 ? 'debet' : 'kredit' }];
    });
  }
  return { transactions, skipped };
}

// Prečíta súbor .xls/.xlsx (ArrayBuffer). Knižnica na Excel sa načíta až tu, aby appka
// pri bežnom používaní nebola pomalšia.
export async function parseVubFile(buffer) {
  const XLSX = await import('xlsx');
  let workbook;
  try {
    workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
  } catch {
    throw new CsvFormatError('Súbor sa nedá otvoriť ako Excel.');
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new CsvFormatError('Súbor neobsahuje žiadny hárok.');
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', dateNF: 'dd.mm.yyyy' });
  return parseVubRows(rows);
}
