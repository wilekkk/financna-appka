import { MONTH_NAMES } from '../constants';

export function calcMonthTotals(history, creditHistory) {
  const catTotals = { needs: 0, wants: 0, savings: 0 };
  history.forEach(item => {
    const abs = Math.abs(item.transaction.amount);
    if (item.category === 'split') { Object.keys(catTotals).forEach(k => { catTotals[k] += (abs * (item.splits[k] || 0)) / 100; }); }
    else if (item.category in catTotals) { catTotals[item.category] += abs; }
  });
  const totalExpenses = catTotals.needs + catTotals.wants + catTotals.savings;
  const totalIncome   = creditHistory.reduce((s, i) => s + i.transaction.amount, 0);
  return { totalIncome, totalExpenses, catTotals };
}

export function getPrevMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function computeOpeningBalance(monthKey, months, monthsData) {
  const keys = months.map(m => m.key);
  const targetIdx = keys.indexOf(monthKey);
  let running = null;
  for (let i = 0; i < targetIdx; i++) {
    const data = monthsData[keys[i]];
    if (!data) continue;
    if (running === null) running = data.openingBalance ?? 0;
    const { totalIncome, totalExpenses } = calcMonthTotals(data.history, data.creditHistory);
    running += totalIncome - totalExpenses;
  }
  if (running !== null) return running;
  return monthsData[monthKey]?.openingBalance ?? 0;
}

export function isFirstInChain(monthKey, months, monthsData) {
  const keys = months.map(m => m.key);
  const idx  = keys.indexOf(monthKey);
  for (let i = 0; i < idx; i++) { if (monthsData[keys[i]]) return false; }
  return true;
}

export function generateMonths() {
  const year = new Date().getFullYear();
  return MONTH_NAMES.map((name, m) => ({
    key: `${year}-${String(m + 1).padStart(2, '0')}`,
    label: name,
  }));
}
