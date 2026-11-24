import { parseCSV, parseRevolutCSV, parseAmount, describeSkipped, CsvFormatError } from './csv';

const revolutTxs = text => parseRevolutCSV(text).transactions;

const REVOLUT_HEADER = 'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance';
const revolut = rows => '﻿' + [REVOLUT_HEADER, ...rows].join('\r\n') + '\r\n';

describe('parseRevolutCSV', () => {
  test('číta platbu kartou: dátum dokončenia, obchod, záporná suma = debet', () => {
    const [tx] = revolutTxs(revolut([
      'Card Payment,Current,2026-09-30 18:49:05,2026-10-01 15:38:51,Albert,-4.30,0.00,EUR,COMPLETED,109.73',
    ]));
    expect(tx).toEqual({ id: 1, store: 'Albert', amount: -4.3, date: '01.10.2026', started: '30.09.2026', typ: 'debet' });
  });

  test('pripočíta poplatok k výdavku', () => {
    const txs = revolutTxs(revolut([
      'Card Payment,Current,2026-10-02 23:28:47,2026-10-03 14:37:48,Na Chut Brna,-2.80,0.03,EUR,COMPLETED,79.60',
      'Card Payment,Current,2026-10-03 00:34:40,2026-10-04 13:39:08,U Dřevěného vlka,-16.18,0.16,EUR,COMPLETED,55.84',
    ]));
    expect(txs.map(t => t.amount)).toEqual([-2.83, -16.34]);
  });

  test('kladná suma (Topup, Transfer) = kredit', () => {
    const txs = revolutTxs(revolut([
      'Topup,Current,2026-10-12 19:16:56,2026-10-12 19:16:56,Payment from VACLAV BLEJSTIL,400.00,0.00,EUR,COMPLETED,410.21',
      'Transfer,Current,2026-10-17 10:43:06,2026-10-17 10:43:07,Transfer from ZUZANA BLEJSTILOVA,40.00,0.00,EUR,COMPLETED,181.38',
    ]));
    expect(txs.map(t => [t.store, t.amount, t.typ])).toEqual([
      ['Payment from VACLAV BLEJSTIL', 400, 'kredit'],
      ['Transfer from ZUZANA BLEJSTILOVA', 40, 'kredit'],
    ]);
  });

  test('PENDING započíta s dátumom začatia, keďže ešte nemá dátum dokončenia', () => {
    const [tx] = revolutTxs(revolut([
      'Card Payment,Current,2026-10-31 12:00:00,,Lidl,-7.20,0.00,EUR,PENDING,',
    ]));
    expect(tx).toMatchObject({ store: 'Lidl', amount: -7.2, date: '31.10.2026', typ: 'debet' });
  });

  test('preskočí REVERTED, DECLINED, FAILED, sporenie (nie Current) a inú menu ako EUR a povie koľko', () => {
    const { transactions: txs, skipped } = parseRevolutCSV(revolut([
      'Card Payment,Current,2026-10-24 03:46:32,,Bolt,-3.60,0.00,EUR,REVERTED,',
      'Card Payment,Current,2026-10-24 03:50:00,,Uber,-5.00,0.00,EUR,DECLINED,',
      'Card Payment,Current,2026-10-24 04:00:00,,Wolt,-9.00,0.00,EUR,FAILED,',
      'Transfer,Savings,2026-10-25 10:00:00,2026-10-25 10:00:00,To Savings,50.00,0.00,EUR,COMPLETED,50.00',
      'Card Payment,Current,2026-10-26 10:00:00,2026-10-26 10:00:00,Albert,-100.00,0.00,CZK,COMPLETED,0',
      'Card Payment,Current,2026-10-29 16:25:37,2026-10-30 14:52:29,McDonald\'s,-12.18,0.00,EUR,COMPLETED,53.04',
    ]));
    expect(txs.map(t => t.store)).toEqual(["McDonald's"]);
    expect(skipped).toEqual({ failed: 3, otherAccount: 1, currency: 1 });
    expect(describeSkipped(skipped)).toEqual([
      '1 × pohyby na inom účte než hlavnom (napr. Savings, Pockets)',
      '1 × platby v inej mene ako EUR',
      '3 × zrušené alebo zamietnuté platby',
    ]);
  });

  test('zvládne názov s čiarkou v úvodzovkách', () => {
    const [tx] = revolutTxs(revolut([
      'Card Payment,Current,2026-10-15 11:45:30,2026-10-16 14:08:36,"Potraviny, samoobsluha",-1.03,0.00,EUR,COMPLETED,132.21',
    ]));
    expect(tx).toMatchObject({ store: 'Potraviny, samoobsluha', amount: -1.03 });
  });

  test('tatrabankový výpis ako Revolut nevráti nič', () => {
    const tatra = 'Dátum spracovania,Suma,Typ,Informácia pre príjemcu,Popis\n03.11.2026,"12,50",Debet,,Billa\n';
    expect(parseRevolutCSV(tatra).transactions).toEqual([]);
  });

  test('nečitateľnú sumu nenahrá ako 0, ale vynechá a započíta medzi nečitateľné', () => {
    const { transactions, skipped } = parseRevolutCSV(revolut([
      'Card Payment,Current,2026-10-01 10:00:00,2026-10-01 10:00:00,Lidl,abc,0.00,EUR,COMPLETED,10.00',
      'Card Payment,Current,2026-10-02 10:00:00,2026-10-02 10:00:00,Billa,-2.00,,EUR,COMPLETED,8.00',
    ]));
    expect(transactions.map(t => [t.store, t.amount])).toEqual([['Billa', -2]]);
    expect(skipped).toEqual({ invalid: 1 });
  });
});

describe('parseCSV (Tatra banka)', () => {
  test('funguje ako predtým', () => {
    const tatra = 'Dátum spracovania,Suma,Typ,Informácia pre príjemcu,Popis\n'
      + '03.11.2026,"12,50",Debet,,Billa\n'
      + '05.11.2026,"100,00",Kredit,,Refund\n';
    expect(parseCSV(tatra).transactions).toEqual([
      { id: 1, store: 'Billa', amount: -12.5, date: '03.11.2026', typ: 'debet' },
      { id: 2, store: 'Refund', amount: 100, date: '05.11.2026', typ: 'kredit' },
    ]);
  });

  test('revolutový výpis ako Tatra: chyba, že chýba stĺpec (nenahrá transakcie bez dátumu)', () => {
    expect(() => parseCSV(revolut([
      'Card Payment,Current,2026-09-30 18:49:05,2026-10-01 15:38:51,Albert,-4.30,0.00,EUR,COMPLETED,109.73',
    ]))).toThrow(CsvFormatError);
  });

  test('súbor so zlým kódovaním (pokazené názvy stĺpcov): chyba, nie prázdne dátumy', () => {
    const garbled = 'DĂˇtum spracovania,Suma,Typ,InformĂˇcia pre prĂ­jemcu,Popis\n03.11.2026,"12,50",Debet,,Billa\n';
    expect(() => parseCSV(garbled)).toThrow('Vo výpise chýba stĺpec „Dátum spracovania“.');
  });

  test('sumy s oddeľovačom tisícov a riadky bez sumy či typu', () => {
    const tatra = 'Dátum spracovania,Suma,Typ,Informácia pre príjemcu,Popis\n'
      + '01.11.2026,"1 234,56",Kredit,,Výplata\n'
      + '02.11.2026,"1.020,00",Debet,,Nájom\n'
      + '03.11.2026,,Debet,,Bez sumy\n'
      + '04.11.2026,"5,00",Iné,,Neznámy typ\n';
    const { transactions, skipped } = parseCSV(tatra);
    expect(transactions.map(t => [t.store, t.amount])).toEqual([['Výplata', 1234.56], ['Nájom', -1020]]);
    expect(skipped).toEqual({ invalid: 1, otherType: 1 });
  });
});

describe('parseAmount', () => {
  test.each([
    ['12,50', 12.5], ['-4.30', -4.3], ['1 234,56', 1234.56], ['1\u00a0234,56', 1234.56],
    ['1.234,56', 1234.56], ['1,234.56', 1234.56], ['−5,00 €', -5], ['100', 100],
  ])('%s = %d', (input, expected) => expect(parseAmount(input)).toBe(expected));

  test.each(['', 'abc', '12,50,', null])('nečitateľné „%s“ = NaN', input => expect(parseAmount(input)).toBeNaN());
});
