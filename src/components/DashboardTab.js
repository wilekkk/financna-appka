import { useState } from 'react';
import { CATS } from '../constants';
import { calcMonthTotals } from '../utils/finance';
import PieChart from './PieChart';

export default function DashboardTab({ history, creditHistory, openingBalance, isFirstInChain, onUpdateOpeningBalance }) {
  const [editing, setEditing]   = useState(false);
  const [inputVal, setInputVal] = useState('');

  const { totalIncome, totalExpenses, catTotals } = calcMonthTotals(history, creditHistory);
  const closingBalance = openingBalance + totalIncome - totalExpenses;
  const slices = CATS.filter(c => c.key !== 'prijem').map(c => ({ ...c, value: catTotals[c.key] }));

  const startEdit   = () => { setInputVal(openingBalance.toFixed(2)); setEditing(true); };
  const confirmEdit = () => {
    const val = parseFloat(inputVal.replace(',', '.')) || 0;
    onUpdateOpeningBalance(val);
    setEditing(false);
  };

  return (
    <div className="dashboard-tab">
      <div className="balance-chain">
        <div className="balance-card balance-card--opening">
          <span className="stat-label">Počiatočný zostatok</span>
          {isFirstInChain ? (
            editing ? (
              <div className="balance-edit-row">
                <input className="balance-input" type="number" value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onBlur={confirmEdit} onKeyDown={e => e.key === 'Enter' && confirmEdit()} autoFocus />
                <span className="balance-input-eur">€</span>
              </div>
            ) : (
              <div className="balance-display-row" onClick={startEdit}>
                <span className="stat-value" style={{ color: openingBalance >= 0 ? '#22c55e' : '#ef4444' }}>
                  {openingBalance >= 0 ? '+' : ''}{openingBalance.toFixed(2)} €
                </span>
                <span className="balance-edit-icon">✏️</span>
              </div>
            )
          ) : (
            <div className="balance-display-row">
              <span className="stat-value" style={{ color: openingBalance >= 0 ? '#22c55e' : '#ef4444' }}>
                {openingBalance >= 0 ? '+' : ''}{openingBalance.toFixed(2)} €
              </span>
              <span className="balance-derived-label">← prenesené</span>
            </div>
          )}
        </div>
        <div className="balance-arrow">↓</div>
      </div>

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
        <div className={`stat-card stat-card--balance${closingBalance >= 0 ? ' positive' : ' negative'}`}>
          <span className="stat-label">Konečný zostatok</span>
          <span className="stat-value">{closingBalance >= 0 ? '+' : ''}{closingBalance.toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
}
