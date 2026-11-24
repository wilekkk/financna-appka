import * as XLSX from 'xlsx';
import { parseVubRows, parseVubFile } from './vub';
import { CsvFormatError } from './csv';

// Vymyslené dáta v rovnakom tvare ako export z VÚB (úvodné riadky, potom hlavička a transakcie).
const ACCOUNT = [
  ['', 'Export transakcií:', '', '', ''],
  ['', 'SK0000000000000000000000', '', '', ''],
  ['', 'Od:', 'Do:', '', ''],
  [' ', '01.10.2026', '31.10.2026', '', ''],
  ['', '', '', '', ''],
  ['Dátum', 'Druh transakcie', 'Informácia pre príjemcu', 'Suma', 'Mena'],
  ['30.10.2026', 'Poplatky a iné', 'Vedenie konta', '- 11,00', 'EUR'],
  ['28.10.2026', 'Odchádzajúca platba', 'Úhrada splátky ku kredit. karte', '- 500,00', 'EUR'],
  ['27.10.2026', 'Inkaso', 'inkaso splatky kredit. karty JANO', '- 33,00', 'EUR'],
  ['22.10.2026', 'Platba kartou', 'Platba kartou; OBCHOD.SK      Bratislava', '- 29,50', 'EUR'],
  ['15.10.2026', 'Prichádzajúca platba', 'Výplata', '+ 1 415,00', 'EUR'],
  ['14.10.2026', 'Odchádzajúca platba', 'Platba v korunách', '- 100,00', 'CZK'],
  ['', '', '', '', ''],
];

const CARD = [
  ['Kartové transakcie:', '', '', '', '', '', ''],
  ['1234 56** **** 7890', '', '', '', '', '', ''],
  ['Od:', 'Do:', '', '', '', '', ''],
  ['01.10.2026', '31.10.2026', '', '', '', '', ''],
  ['Dátum autorizácie', 'Dátum zaúčtovania', 'Typ transakcie', 'Typ transakcie kartou', 'Popis', 'Stav', 'Suma'],
  ['28.10.2026', '30.10.2026', 'Debetná', 'Platba kartou', '*7890 POTRAVINY  TRNAVA', 'zaúčtovaná', '- 51,17 EUR'],
  ['29.09.2026', '01.10.2026', 'Debetná', 'Platba kartou', '*7890 KAVIAREN', 'zaúčtovaná', '- 3,20 EUR'],
  ['02.10.2026', '02.10.2026', 'Debetná', 'Poplatky', 'Poplatok za kartu', 'zaúčtovaná', '- 0,25 EUR'],
  ['03.10.2026', '05.10.2026', 'Kreditná', 'Vrátenie platby', '*7890 ESHOP', 'zaúčtovaná', '+ 20,00 EUR'],
  ['04.10.2026', '', 'Debetná', 'Platba kartou', '*7890 BENZINKA', 'zamietnutá', '- 40,00 EUR'],
  ['05.10.2026', '', 'Debetná', 'Platba kartou', '*7890 PRAHA SHOP', 'zaúčtovaná', '- 100,00 CZK'],
];

test('výpis z účtu: sumy, názvy, vynechá splátky kreditnej karty a inú menu', () => {
  const { transactions, skipped } = parseVubRows(ACCOUNT);
  expect(transactions.map(t => [t.date, t.store, t.amount, t.typ])).toEqual([
    ['30.10.2026', 'Vedenie konta', -11, 'debet'],
    ['22.10.2026', 'OBCHOD.SK Bratislava', -29.5, 'debet'],
    ['15.10.2026', 'Výplata', 1415, 'kredit'],
  ]);
  expect(skipped).toEqual({ cardRepayment: 2, currency: 1 });
});

test('výpis z karty: dátum zaúčtovania, dátum autorizácie ako začiatok, názov bez čísla karty', () => {
  const { transactions, skipped } = parseVubRows(CARD);
  expect(transactions).toEqual([
    { id: 1, store: 'POTRAVINY TRNAVA', amount: -51.17, date: '30.10.2026', started: '28.10.2026', typ: 'debet' },
    { id: 2, store: 'KAVIAREN', amount: -3.2, date: '01.10.2026', started: '29.09.2026', typ: 'debet' },
    { id: 3, store: 'Poplatok za kartu', amount: -0.25, date: '02.10.2026', started: '02.10.2026', typ: 'debet' },
    { id: 4, store: 'ESHOP', amount: 20, date: '05.10.2026', started: '03.10.2026', typ: 'kredit' },
  ]);
  expect(skipped).toEqual({ failed: 1, currency: 1 });
});

test('súbor bez hlavičky s dátumom a sumou: zrozumiteľná chyba', () => {
  expect(() => parseVubRows([['Meno', 'Priezvisko'], ['Jano', 'Novák']])).toThrow(CsvFormatError);
});

test('prečíta skutočný súbor .xls (vytvorený tu v teste)', async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(CARD), 'Sheet1');
  const bytes = XLSX.write(workbook, { bookType: 'xls', type: 'array' });
  const { transactions } = await parseVubFile(bytes);
  expect(transactions.map(t => t.store)).toEqual(['POTRAVINY TRNAVA', 'KAVIAREN', 'Poplatok za kartu', 'ESHOP']);
});

test('súbor, ktorý nie je výpis z VÚB, skončí chybou, nie prázdnymi transakciami', async () => {
  const notStatement = Uint8Array.from('toto nie je vypis z banky', c => c.charCodeAt(0)).buffer;
  await expect(parseVubFile(notStatement)).rejects.toThrow(CsvFormatError);
});
