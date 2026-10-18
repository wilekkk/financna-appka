import { CATS } from '../constants';
import { calcMonthTotals } from '../utils/finance';
import PieChart from './PieChart';

export default function DashboardTab({ history, creditHistory }) {
  const { totalIncome, totalExpenses, catTotals } = calcMonthTotals(history, creditHistory);
  const slices = CATS.filter(c => c.key !== 'prijem').map(c => ({ ...c, value: catTotals[c.key] }));

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
    </div>
  );
}
