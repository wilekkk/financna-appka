import { findNewTransactions } from './duplicates';

const tx = (date, store, amount, extra = {}) => ({ date, store, amount, ...extra });

test('rovnaká transakcia (dátum, obchod, suma) je duplicita, iná je nová', () => {
  const existing = [tx('01.10.2026', 'Lidl', -10)];
  const { fresh, duplicates } = findNewTransactions(existing, [tx('01.10.2026', 'Lidl', -10), tx('02.10.2026', 'Lidl', -10)]);
  expect(duplicates).toBe(1);
  expect(fresh).toEqual([tx('02.10.2026', 'Lidl', -10)]);
});

test('dve rovnaké kávy vo výpise, v mesiaci len jedna: jedna je duplicita, druhá sa pridá', () => {
  const coffee = tx('03.10.2026', 'Kaviareň', -1.5);
  const { fresh, duplicates } = findNewTransactions([coffee], [coffee, { ...coffee }]);
  expect(duplicates).toBe(1);
  expect(fresh).toHaveLength(1);
});

test('dve rovnaké kávy v prázdnom mesiaci: obe sa pridajú', () => {
  const coffee = tx('03.10.2026', 'Kaviareň', -1.5);
  expect(findNewTransactions([], [coffee, { ...coffee }]).fresh).toHaveLength(2);
});

test('Revolut: čakajúca platba uložená skôr a tá istá platba už dokončená je duplicita', () => {
  // staršia uložená čakajúca platba ešte nemala `started`, jej dátum je dátum začatia
  const pendingStoredEarlier = tx('31.10.2026', 'Lidl', -7.2);
  const completedNow = tx('02.11.2026', 'Lidl', -7.2, { started: '31.10.2026' });
  const { fresh, duplicates } = findNewTransactions([pendingStoredEarlier], [completedNow]);
  expect(duplicates).toBe(1);
  expect(fresh).toEqual([]);
});

test('Revolut: ten istý výpis nahraný znova je celý duplicitný', () => {
  const t = tx('02.11.2026', 'Lidl', -7.2, { started: '31.10.2026' });
  expect(findNewTransactions([t], [{ ...t }])).toEqual({ fresh: [], duplicates: 1 });
});

test('transakcia bez dátumu (pridaná ručne) sa nikdy nepovažuje za duplicitu', () => {
  const manual = tx('', 'Hotovosť', -5);
  expect(findNewTransactions([manual], [{ ...manual }]).duplicates).toBe(0);
});
