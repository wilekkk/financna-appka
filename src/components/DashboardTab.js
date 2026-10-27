import { CATS } from '../constants';
import { calcMonthTotals } from '../utils/finance';
import PieChart from './PieChart';

export default function DashboardTab({ history, creditHistory, customCategories, onSelectSubcategory }) {
  const { totalIncome, totalExpenses, catTotals } = calcMonthTotals(history, creditHistory);
  const slices = CATS.filter(c => c.key !== 'prijem').map(c => ({ ...c, value: catTotals[c.key] }));
  const subcategoryTotals = customCategories.map(category => ({
    ...category,
    total: [...creditHistory, ...history]
      .filter(item => item.subcategory?.id === category.id)
      .reduce((sum, item) => sum + Math.abs(item.transaction.amount), 0),
  })).filter(category => category.total > 0);
  const incomeTransactions = creditHistory.map(item => ({ ...item, type: 'income' }));
  const expenseTransactions = history.map(item => ({ ...item, type: 'expense' }));
  const unassignedIncome = incomeTransactions
    .filter(item => !item.subcategory)
    .reduce((sum, item) => sum + Math.abs(item.transaction.amount), 0);
  const unassignedExpense = expenseTransactions
    .filter(item => !item.subcategory)
    .reduce((sum, item) => sum + Math.abs(item.transaction.amount), 0);
  const incomeSubcategories = [
    ...subcategoryTotals.filter(category => category.type === 'income'),
    { id: '__unassigned-income', name: 'Nezaradené', type: 'income', total: unassignedIncome, unassigned: true },
  ];
  const expenseSubcategories = [
    ...subcategoryTotals.filter(category => category.type === 'expense'),
    { id: '__unassigned-expense', name: 'Nezaradené', type: 'expense', total: unassignedExpense, unassigned: true },
  ];
  const hasSubcategorySummary = incomeSubcategories.length > 0 || expenseSubcategories.length > 0;

  return (
    <div className="dashboard-tab">
      {totalExpenses > 0
        ? <PieChart slices={slices} total={totalExpenses} />
        : <p className="no-chart-data">Žiadne výdavky na zobrazenie</p>
      }

      <div className="stats-grid">
        <div className="stat-card stat-card--income">
          <span className="stat-label">Príjmy</span>
          <span className="stat-value">+{totalIncome.toFixed(2)} €</span>
        </div>
        <div className="stat-card stat-card--expense">
          <span className="stat-label">Výdavky</span>
          <span className="stat-value">-{totalExpenses.toFixed(2)} €</span>
        </div>
        <div className={`stat-card stat-card--balance stat-card--net${(totalIncome - totalExpenses) >= 0 ? ' positive' : ' negative'}`}>
          <span className="stat-label">{(totalIncome - totalExpenses) >= 0 ? '💪 Zarobil si' : '📉 Minul si'}</span>
          <span className="stat-value">{Math.abs(totalIncome - totalExpenses).toFixed(2)} €</span>
        </div>
      </div>

      {hasSubcategorySummary && (
        <div className="subcategory-summary">
          <h3 className="subcategory-summary-title">Podkategórie</h3>
          {incomeSubcategories.length > 0 && (
            <section>
              <h4 className="subcategory-summary-heading">Príjmy</h4>
              {incomeSubcategories.map(category => (
                <button key={category.id} className={`subcategory-summary-row subcategory-summary-row--income${category.unassigned ? ' subcategory-summary-row--unassigned' : ''}`} onClick={() => onSelectSubcategory(category)}>
                  <span>{category.name}</span>
                  <strong>+{category.total.toFixed(2)} €</strong>
                </button>
              ))}
            </section>
          )}
          {expenseSubcategories.length > 0 && (
            <section>
              <h4 className="subcategory-summary-heading">Výdavky</h4>
              {expenseSubcategories.map(category => (
                <button key={category.id} className={`subcategory-summary-row subcategory-summary-row--expense${category.unassigned ? ' subcategory-summary-row--unassigned' : ''}`} onClick={() => onSelectSubcategory(category)}>
                  <span>{category.name}</span>
                  <strong>-{category.total.toFixed(2)} €</strong>
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
