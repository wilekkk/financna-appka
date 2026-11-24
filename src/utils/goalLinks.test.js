import { withUids, migrateGoalLinks, isLinkedTo, linkedGoalEntries, removeGoalEntriesFor, describeGoalEntries } from './goalLinks';

const tx = (store, date, amount, extra = {}) => ({ transaction: { store, date, amount }, category: 'savings', ...extra });
const money = n => `${n.toFixed(2).replace('.', ',')} €`;

test('nové transakcie dostanú jedinečné číslo, existujúce si ho nechajú', () => {
  const items = withUids([tx('A', '01.03.2026', -10, { uid: 'x' }), tx('B', '01.03.2026', -5), tx('B', '01.03.2026', -5)]);
  expect(items[0].uid).toBe('x');
  expect(items[1].uid).toBeTruthy();
  expect(items[1].uid).not.toBe(items[2].uid);
  const same = [tx('A', '01.03.2026', -10, { uid: 'x' })];
  expect(withUids(same)).toBe(same);
});

test('pri načítaní doplní čísla a prepojí staré priradenie, ak k nemu pasuje práve jedna transakcia', () => {
  const monthsData = {
    '2026-03': {
      history: [tx('Revolut', '05.03.2026', -50), tx('Revolut', '05.03.2026', -50), tx('Sporenie', '10.03.2026', -100)],
      creditHistory: [tx('Výber', '12.03.2026', 30, { category: 'prijem' })],
    },
  };
  const goals = [{
    id: 1, name: 'Dovolenka',
    allocations: [
      { id: 'i', initial: true, amount: 500 },
      { id: 'a1', store: 'Revolut', date: '05.03.2026', amount: 50 },   // pasujú dve → ostane po starom
      { id: 'a2', store: 'Sporenie', date: '10.03.2026', amount: 100 }, // pasuje jedna → prepojí sa
    ],
    withdrawals: [{ id: 'w1', store: 'Výber', date: '12.03.2026', amount: 30 }],
  }];
  const result = migrateGoalLinks(monthsData, goals);
  expect(result.monthsData['2026-03'].history.map(item => item.uid)).toEqual(['2026-03:d:0', '2026-03:d:1', '2026-03:d:2']);
  expect(result.monthsData['2026-03'].creditHistory[0].uid).toBe('2026-03:c:0');
  const [initial, ambiguous, linked] = result.savingsGoals[0].allocations;
  expect(initial.txUid).toBeUndefined();
  expect(ambiguous.txUid).toBeUndefined();
  expect(linked.txUid).toBe('2026-03:d:2');
  expect(result.savingsGoals[0].withdrawals[0].txUid).toBe('2026-03:c:0');

  // druhé načítanie tých istých dát nič nemení
  const again = migrateGoalLinks(result.monthsData, result.savingsGoals);
  expect(again.monthsData).toBe(result.monthsData);
  expect(again.savingsGoals).toBe(result.savingsGoals);
});

test('prepojené priradenie patrí len k svojej transakcii, aj keď je iná s rovnakým obchodom a dátumom', () => {
  const first = tx('Revolut', '05.03.2026', -50, { uid: 'u1' });
  const second = tx('Revolut', '05.03.2026', -50, { uid: 'u2' });
  const entry = { store: 'Revolut', date: '05.03.2026', amount: 50, txUid: 'u1' };
  expect(isLinkedTo(entry, first)).toBe(true);
  expect(isLinkedTo(entry, second)).toBe(false);
  // staré priradenie bez čísla sa páruje podľa obchodu a dátumu
  expect(isLinkedTo({ store: 'Revolut', date: '05.03.2026', amount: 50 }, second)).toBe(true);
  expect(isLinkedTo({ initial: true, amount: 50 }, second)).toBe(false);
});

test('vymazanie transakcie odoberie z cieľov jej priradenie a výber, ostatné nechá', () => {
  const goals = [
    { id: 1, name: 'Dovolenka', allocations: [{ id: 'a', txUid: 'u1', amount: 50 }, { id: 'b', txUid: 'u2', amount: 20 }], withdrawals: [{ id: 'w', txUid: 'u1', amount: 10 }] },
    { id: 2, name: 'Auto', allocations: [{ id: 'c', txUid: 'u3', amount: 70 }], withdrawals: [] },
  ];
  const items = [{ uid: 'u1', transaction: {} }];
  expect(linkedGoalEntries(goals, items)).toEqual([
    { goalName: 'Dovolenka', amount: 50, kind: 'allocation' },
    { goalName: 'Dovolenka', amount: 10, kind: 'withdrawal' },
  ]);
  const next = removeGoalEntriesFor(goals, items);
  expect(next[0].allocations.map(a => a.id)).toEqual(['b']);
  expect(next[0].withdrawals).toEqual([]);
  expect(next[1]).toBe(goals[1]); // nedotknutý cieľ ostane ten istý
});

test('veta do potvrdenia mazania', () => {
  expect(describeGoalEntries([], money)).toBe('');
  expect(describeGoalEntries([
    { goalName: 'Dovolenka', amount: 50, kind: 'allocation' },
    { goalName: 'Auto', amount: 10, kind: 'withdrawal' },
  ], money)).toBe('Odoberie sa aj sporenie: Dovolenka 50,00 €, výber z cieľa Auto 10,00 €.');
});
