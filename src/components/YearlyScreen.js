import { useState } from 'react';
import { computeOpeningBalance, calcMonthTotals } from '../utils/finance';
import MonthlyBarChart from './MonthlyBarChart';
import BalanceLineChart from './BalanceLineChart';
import SporeniTab from './SporeniTab';

export default function YearlyScreen({ months, monthsData, savingsGoals, onAddGoal, onUpdateGoal, onDeleteGoal, onOpenMonths, onSelectMonth, user, onLogout }) {
  const [activeTab, setActiveTab] = useState('prehled');
  const year = new Date().getFullYear();
  const stats = months.map(({ key, label }) => {
    const data = monthsData[key];
    if (!data) return { key, label, income: 0, needs: 0, wants: 0, savings: 0, expenses: 0, closing: null, hasData: false };
    const opening = computeOpeningBalance(key, months, monthsData);
    const { totalIncome, totalExpenses, catTotals } = calcMonthTotals(data.history, data.creditHistory);
    return { key, label, income: totalIncome, needs: catTotals.needs, wants: catTotals.wants, savings: catTotals.savings, expenses: totalExpenses, closing: opening + totalIncome - totalExpenses, hasData: true };
  });

  const totalIncome   = stats.reduce((s, m) => s + m.income, 0);
  const totalExpenses = stats.reduce((s, m) => s + m.expenses, 0);
  const netCF         = totalIncome - totalExpenses;
  const lastClosing   = [...stats].reverse().find(m => m.hasData)?.closing ?? 0;
  const totalNeeds    = stats.reduce((s, m) => s + m.needs, 0);
  const totalWants    = stats.reduce((s, m) => s + m.wants, 0);
  const totalSavingsCat = stats.reduce((s, m) => s + m.savings, 0);
  const pct = v => totalExpenses > 0 ? ((v / totalExpenses) * 100).toFixed(1) : '0.0';
  const totalSaved    = savingsGoals.reduce((s, g) => {
    const alloc = (g.allocations || []).reduce((a, x) => a + x.amount, 0);
    const withdr = (g.withdrawals  || []).reduce((a, x) => a + x.amount, 0);
    return s + Math.max(0, alloc - withdr);
  }, 0);

  return (
    <div className="yearly-screen">
      <div className="yearly-header">
        <h1 className="app-title" style={{ margin: 0 }}>Prehľad {year}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="months-btn" onClick={onOpenMonths}>Mesiace →</button>
          <button className="logout-btn" onClick={onLogout} title={user?.email}>⎋</button>
        </div>
      </div>

      <div className="tabs" style={{ width: '100%' }}>
        <button className={`tab-btn${activeTab === 'prehled' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('prehled')}>Prehľad</button>
        <button className={`tab-btn${activeTab === 'sporenie' ? ' tab-btn--active' : ''}`} onClick={() => setActiveTab('sporenie')}>Sporenie</button>
      </div>

      {activeTab === 'sporenie' && (
        <SporeniTab
          goals={savingsGoals}
          totalSaved={totalSaved}
          onAdd={onAddGoal}
          onUpdate={onUpdateGoal}
          onDelete={onDeleteGoal}
        />
      )}

      {activeTab === 'prehled' && <>
        <div className="kpi-grid">
          {[
            { label: 'Celkové príjmy',  value: `+${totalIncome.toFixed(2)} €`,                              color: '#22c55e' },
            { label: 'Celkové výdavky', value: `-${totalExpenses.toFixed(2)} €`,                            color: '#ef4444' },
            { label: 'Čistý CF (YTD)',  value: `${netCF >= 0 ? '+' : ''}${netCF.toFixed(2)} €`,             color: netCF >= 0 ? '#22c55e' : '#ef4444' },
            { label: 'Zostatok',        value: `${lastClosing >= 0 ? '+' : ''}${lastClosing.toFixed(2)} €`, color: lastClosing >= 0 ? '#22c55e' : '#ef4444' },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <span className="kpi-label">{k.label}</span>
              <span className="kpi-value" style={{ color: k.color }}>{k.value}</span>
            </div>
          ))}
        </div>

        <div className="kpi-grid kpi-grid--3">
          {[
            { label: 'Needs',   value: totalNeeds.toFixed(2),      pct: pct(totalNeeds),      color: '#f97316' },
            { label: 'Wants',   value: totalWants.toFixed(2),      pct: pct(totalWants),      color: '#ef4444' },
            { label: 'Savings', value: totalSavingsCat.toFixed(2), pct: pct(totalSavingsCat), color: '#3b82f6' },
          ].map(k => (
            <div key={k.label} className="kpi-card">
              <span className="kpi-label">{k.label}</span>
              <span className="kpi-value" style={{ color: k.color }}>{k.value} €</span>
              <span className="kpi-pct" style={{ color: k.color }}>{k.pct} %</span>
            </div>
          ))}
        </div>

        <MonthlyBarChart stats={stats} />
        <BalanceLineChart stats={stats} />

        <div className="chart-box">
          <span className="chart-title">Mesačný prehľad</span>
          <div className="mtable-scroll">
            <table className="mtable">
              <thead>
                <tr><th>Mesiac</th><th>Príjmy</th><th>Needs</th><th>Wants</th><th>Savings</th><th>Zostatok</th></tr>
              </thead>
              <tbody>
                {stats.map((m, i) => (
                  <tr key={m.key} className={m.hasData ? 'mtrow--done' : ''} onClick={() => onSelectMonth(months[i])}>
                    <td className="mtd-month">{m.label.slice(0, 3)}</td>
                    <td className="mtd-income">{m.hasData ? m.income.toFixed(2) : '—'}</td>
                    <td>{m.hasData ? m.needs.toFixed(2) : '—'}</td>
                    <td>{m.hasData ? m.wants.toFixed(2) : '—'}</td>
                    <td>{m.hasData ? m.savings.toFixed(2) : '—'}</td>
                    <td className={m.hasData ? (m.closing >= 0 ? 'mtd-pos' : 'mtd-neg') : ''}>{m.hasData ? m.closing.toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}
    </div>
  );
}
