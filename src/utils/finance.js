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

export function generateMonths() {
  const year = new Date().getFullYear();
  return MONTH_NAMES.map((name, m) => ({
    key: `${year}-${String(m + 1).padStart(2, '0')}`,
    label: name,
  }));
}
