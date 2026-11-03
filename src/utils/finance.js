import { MONTH_NAMES } from '../constants';

export function getRemainingAmount(item) {
  const amount = Math.abs(item?.transaction?.amount || 0);
  const clearings = Array.isArray(item?.clearing) ? item.clearing : item?.clearing ? [item.clearing] : [];
  return Math.max(0, amount - clearings.reduce((sum, clearing) => sum + (clearing.amount || 0), 0));
}

export function calcMonthTotals(history, creditHistory) {
  const catTotals = { needs: 0, wants: 0, savings: 0 };
  history.forEach(item => {
    const abs = getRemainingAmount(item);
    if (item.category === 'split') { Object.keys(catTotals).forEach(k => { catTotals[k] += (abs * (item.splits[k] || 0)) / 100; }); }
    else if (item.category in catTotals) { catTotals[item.category] += abs; }
  });
  const totalExpenses = catTotals.needs + catTotals.wants + catTotals.savings;
  const totalIncome   = creditHistory.reduce((s, i) => s + getRemainingAmount(i), 0);
  return { totalIncome, totalExpenses, catTotals };
}

// Totals per subcategory. Subcategories deleted in settings are kept under the name stored on the transaction.
export function calcSubcategoryTotals(items, customCategories) {
  const totals = new Map(customCategories.map(category => [category.id, { ...category, total: 0 }]));
  items.forEach(item => {
    const subcategory = item.subcategory;
    if (!subcategory) return;
    if (!totals.has(subcategory.id)) {
      const type = subcategory.type || (item.transaction.amount >= 0 ? 'income' : 'expense');
      totals.set(subcategory.id, { ...subcategory, type, total: 0 });
    }
    totals.get(subcategory.id).total += getRemainingAmount(item);
  });
  return [...totals.values()]
    .filter(category => category.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function generateMonths() {
  const year = new Date().getFullYear();
  return MONTH_NAMES.map((name, m) => ({
    key: `${year}-${String(m + 1).padStart(2, '0')}`,
    label: name,
  }));
}
