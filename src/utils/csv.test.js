import { parseCSV, parseRevolutCSV } from './csv';

const REVOLUT_HEADER = 'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance';
const revolut = rows => '﻿' + [REVOLUT_HEADER, ...rows].join('\r\n') + '\r\n';

describe('parseRevolutCSV', () => {
  test('číta platbu kartou: dátum dokončenia, obchod, záporná suma = debet', () => {
    const [tx] = parseRevolutCSV(revolut([
      'Card Payment,Current,2026-09-30 18:49:05,2026-10-01 15:38:51,Albert,-4.30,0.00,EUR,COMPLETED,109.73',
    ]));
    expect(tx).toEqual({ id: 1, store: 'Albert', amount: -4.3, date: '01.10.2026', typ: 'debet' });
  });

  test('pripočíta poplatok k výdavku', () => {
    const txs = parseRevolutCSV(revolut([
      'Card Payment,Current,2026-10-02 23:28:47,2026-10-03 14:37:48,Na Chut Brna,-2.80,0.03,EUR,COMPLETED,79.60',
      'Card Payment,Current,2026-10-03 00:34:40,2026-10-04 13:39:08,U Dřevěného vlka,-16.18,0.16,EUR,COMPLETED,55.84',
    ]));
    expect(txs.map(t => t.amount)).toEqual([-2.83, -16.34]);
  });

  test('kladná suma (Topup, Transfer) = kredit', () => {
    const txs = parseRevolutCSV(revolut([
      'Topup,Current,2026-10-12 19:16:56,2026-10-12 19:16:56,Payment from VACLAV BLEJSTIL,400.00,0.00,EUR,COMPLETED,410.21',
      'Transfer,Current,2026-10-17 10:43:06,2026-10-17 10:43:07,Transfer from ZUZANA BLEJSTILOVA,40.00,0.00,EUR,COMPLETED,181.38',
    ]));
    expect(txs.map(t => [t.store, t.amount, t.typ])).toEqual([
      ['Payment from VACLAV BLEJSTIL', 400, 'kredit'],
      ['Transfer from ZUZANA BLEJSTILOVA', 40, 'kredit'],
    ]);
  });

  test('PENDING započíta s dátumom začatia, keďže ešte nemá dátum dokončenia', () => {
    const [tx] = parseRevolutCSV(revolut([
      'Card Payment,Current,2026-10-31 12:00:00,,Lidl,-7.20,0.00,EUR,PENDING,',
    ]));
    expect(tx).toMatchObject({ store: 'Lidl', amount: -7.2, date: '31.10.2026', typ: 'debet' });
  });

  test('preskočí REVERTED, DECLINED, FAILED, sporenie (nie Current) a inú menu ako EUR', () => {
    const txs = parseRevolutCSV(revolut([
      'Card Payment,Current,2026-10-24 03:46:32,,Bolt,-3.60,0.00,EUR,REVERTED,',
      'Card Payment,Current,2026-10-24 03:50:00,,Uber,-5.00,0.00,EUR,DECLINED,',
      'Card Payment,Current,2026-10-24 04:00:00,,Wolt,-9.00,0.00,EUR,FAILED,',
      'Transfer,Savings,2026-10-25 10:00:00,2026-10-25 10:00:00,To Savings,50.00,0.00,EUR,COMPLETED,50.00',
      'Card Payment,Current,2026-10-26 10:00:00,2026-10-26 10:00:00,Albert,-100.00,0.00,CZK,COMPLETED,0',
      'Card Payment,Current,2026-10-29 16:25:37,2026-10-30 14:52:29,McDonald\'s,-12.18,0.00,EUR,COMPLETED,53.04',
    ]));
    expect(txs.map(t => t.store)).toEqual(["McDonald's"]);
  });

  test('zvládne názov s čiarkou v úvodzovkách', () => {
    const [tx] = parseRevolutCSV(revolut([
      'Card Payment,Current,2026-10-15 11:45:30,2026-10-16 14:08:36,"Potraviny, samoobsluha",-1.03,0.00,EUR,COMPLETED,132.21',
    ]));
    expect(tx).toMatchObject({ store: 'Potraviny, samoobsluha', amount: -1.03 });
  });

  test('tatrabankový výpis ako Revolut nevráti nič', () => {
    const tatra = 'Dátum spracovania,Suma,Typ,Informácia pre príjemcu,Popis\n03.11.2026,"12,50",Debet,,Billa\n';
    expect(parseRevolutCSV(tatra)).toEqual([]);
  });
});

describe('parseCSV (Tatra banka)', () => {
  test('funguje ako predtým', () => {
    const tatra = 'Dátum spracovania,Suma,Typ,Informácia pre príjemcu,Popis\n'
      + '03.11.2026,"12,50",Debet,,Billa\n'
      + '05.11.2026,"100,00",Kredit,,Refund\n';
    expect(parseCSV(tatra)).toEqual([
      { id: 1, store: 'Billa', amount: -12.5, date: '03.11.2026', typ: 'debet' },
      { id: 2, store: 'Refund', amount: 100, date: '05.11.2026', typ: 'kredit' },
    ]);
  });

  test('revolutový výpis ako Tatra nevráti nič', () => {
    expect(parseCSV(revolut([
      'Card Payment,Current,2026-09-30 18:49:05,2026-10-01 15:38:51,Albert,-4.30,0.00,EUR,COMPLETED,109.73',
    ]))).toEqual([]);
  });
});
