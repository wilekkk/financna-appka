// Prepojenie cieľov sporenia s transakciami.
// Každá transakcia má jedinečné číslo `uid` a priradenie k cieľu (alebo výber z cieľa) si pamätá
// číslo svojej transakcie v `txUid`. Staršie priradenia mali len obchod a dátum.

const randomUid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// Novým transakciám (z výpisu alebo pridaným ručne) dá jedinečné číslo.
export function withUids(items) {
  return items.some(item => !item.uid) ? items.map(item => item.uid ? item : { ...item, uid: randomUid() }) : items;
}

// Starším uloženým transakciám dá číslo podľa mesiaca a poradia. Pri každom načítaní tých istých
// dát vyjde rovnaké, takže sa môže uložiť až spolu s ďalšou zmenou.
function addMissingUids(monthsData) {
  let changed = false;
  const result = {};
  Object.entries(monthsData).forEach(([key, month]) => {
    const fill = (items, kind) => (items || []).map((item, i) => {
      if (item.uid) return item;
      changed = true;
      return { ...item, uid: `${key}:${kind}:${i}` };
    });
    result[key] = { ...month, history: fill(month.history, 'd'), creditHistory: fill(month.creditHistory, 'c') };
  });
  return changed ? result : monthsData;
}

const isFromTransaction = entry => !entry.initial && !entry.transfer;

// Staršie priradenia (bez txUid) prepojí s transakciou, ak k nim pasuje práve jedna
// (rovnaký obchod a dátum). Ak pasujú dve rovnaké, ostanú po starom.
function linkOldEntries(savingsGoals, monthsData) {
  const debits = [], credits = [];
  Object.values(monthsData).forEach(month => {
    debits.push(...(month.history || []));
    credits.push(...(month.creditHistory || []));
  });
  const findUid = (entry, items) => {
    const matches = items.filter(item => item.transaction?.store === entry.store && item.transaction?.date === entry.date);
    return matches.length === 1 ? matches[0].uid : null;
  };
  let changed = false;
  const link = (entries, items) => (entries || []).map(entry => {
    if (entry.txUid || !isFromTransaction(entry)) return entry;
    const txUid = findUid(entry, items);
    if (!txUid) return entry;
    changed = true;
    return { ...entry, txUid };
  });
  const result = savingsGoals.map(goal => ({
    ...goal,
    allocations: link(goal.allocations, debits),
    withdrawals: link(goal.withdrawals, credits),
  }));
  return changed ? result : savingsGoals;
}

// Pri načítaní: doplní čísla transakciám a prepojí staršie priradenia.
export function migrateGoalLinks(monthsData, savingsGoals) {
  const months = addMissingUids(monthsData);
  return { monthsData: months, savingsGoals: linkOldEntries(savingsGoals, months) };
}

// Patrí priradenie alebo výber k tejto transakcii?
export function isLinkedTo(entry, item) {
  if (entry.txUid) return entry.txUid === item.uid;
  return isFromTransaction(entry) && entry.store === item.transaction.store && entry.date === item.transaction.date;
}

// Priradenia a výbery, ktoré sa odoberú spolu s týmito transakciami (pri vymazaní alebo resete).
// Odoberajú sa len tie, ktoré sú s transakciou určite prepojené (majú txUid).
export function linkedGoalEntries(savingsGoals, items) {
  const uids = new Set(items.map(item => item.uid).filter(Boolean));
  return savingsGoals.flatMap(goal => [
    ...(goal.allocations || []).filter(a => uids.has(a.txUid)).map(a => ({ goalName: goal.name, amount: a.amount, kind: 'allocation' })),
    ...(goal.withdrawals || []).filter(w => uids.has(w.txUid)).map(w => ({ goalName: goal.name, amount: w.amount, kind: 'withdrawal' })),
  ]);
}

// Ciele bez priradení a výberov týchto transakcií.
export function removeGoalEntriesFor(savingsGoals, items) {
  const uids = new Set(items.map(item => item.uid).filter(Boolean));
  if (!uids.size) return savingsGoals;
  return savingsGoals.map(goal => {
    const allocations = (goal.allocations || []).filter(a => !uids.has(a.txUid));
    const withdrawals = (goal.withdrawals || []).filter(w => !uids.has(w.txUid));
    const same = allocations.length === (goal.allocations || []).length && withdrawals.length === (goal.withdrawals || []).length;
    return same ? goal : { ...goal, allocations, withdrawals };
  });
}

// Veta do potvrdzovacieho okna, napr. „Odoberie sa aj sporenie: Dovolenka 50,00 €.“
export function describeGoalEntries(entries, formatMoney) {
  if (!entries.length) return '';
  const parts = entries.map(e => `${e.kind === 'withdrawal' ? 'výber z cieľa ' : ''}${e.goalName} ${formatMoney(e.amount)}`);
  return `Odoberie sa aj sporenie: ${parts.join(', ')}.`;
}
