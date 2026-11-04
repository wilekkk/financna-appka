import { calcSubcategoryTotals, getRemainingAmount } from '../utils/finance';
import { formatMoney } from '../utils/format';

// Záložka "Podkategórie": súčty podkategórií za mesiac. Kliknutím sa vyfiltrujú transakcie.
export default function DashboardTab({ history, creditHistory, customCategories, onSelectSubcategory }) {
  const subcategoryTotals = calcSubcategoryTotals([...creditHistory, ...history], customCategories);
  const unassignedIncome = creditHistory
    .filter(item => !item.subcategory)
    .reduce((sum, item) => sum + getRemainingAmount(item), 0);
  const unassignedExpense = history
    .filter(item => !item.subcategory)
    .reduce((sum, item) => sum + getRemainingAmount(item), 0);
  const incomeSubcategories = [
    ...subcategoryTotals.filter(category => category.type === 'income'),
    { id: '__unassigned-income', name: 'Nezaradené', type: 'income', total: unassignedIncome, unassigned: true },
  ];
  const expenseSubcategories = [
    ...subcategoryTotals.filter(category => category.type === 'expense'),
    { id: '__unassigned-expense', name: 'Nezaradené', type: 'expense', total: unassignedExpense, unassigned: true },
  ];

  const row = (category, isIncome) => (
    <button key={category.id} className={`list-row list-row--btn${category.unassigned ? ' list-row--muted' : ''}`}
            onClick={() => onSelectSubcategory(category)}>
      <span>{category.name}</span>
      <span className={isIncome ? 'is-positive' : 'is-negative'}>
        {formatMoney(isIncome ? category.total : -category.total, { sign: isIncome })}
      </span>
    </button>
  );

  return (
    <div className="month-subcategories">
      <h3 className="subsection-title">Príjmy</h3>
      {incomeSubcategories.map(category => row(category, true))}
      <h3 className="subsection-title">Výdavky</h3>
      {expenseSubcategories.map(category => row(category, false))}
    </div>
  );
}
