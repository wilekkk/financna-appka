import { LogOut } from 'lucide-react';
import { CAT_MAP, MONTH_NAMES_IN } from '../constants';
import { calcMonthTotals, calcSubcategoryTotals, getRemainingAmount } from '../utils/finance';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';
import Money from './Money';
import CashflowChart from './CashflowChart';
import SporeniTab from './SporeniTab';

const CAT_KEYS = ['needs', 'wants', 'savings'];

export default function YearlyScreen({ months, monthsData, customCategories, savingsGoals, onAddGoal, onUpdateGoal, onDeleteGoal, onOpenMonths, onSelectMonth, user, onLogout, tab = 'prehled' }) {
  const activeTab = tab;
  const year = new Date().getFullYear();
  const stats = months.map(({ key, label }) => {
    const data = monthsData[key];
    if (!data) return { key, label, income: 0, needs: 0, wants: 0, savings: 0, expenses: 0, hasData: false };
    const { totalIncome, totalExpenses, catTotals } = calcMonthTotals(data.history, data.creditHistory);
    return { key, label, income: totalIncome, needs: catTotals.needs, wants: catTotals.wants, savings: catTotals.savings, expenses: totalExpenses, hasData: true };
  });

  const totalIncome   = stats.reduce((s, m) => s + m.income, 0);
  const totalExpenses = stats.reduce((s, m) => s + m.expenses, 0);
  const netCF         = totalIncome - totalExpenses;
  const totalSaved    = savingsGoals.reduce((s, g) => {
    const alloc = (g.allocations || []).reduce((a, x) => a + x.amount, 0);
    const withdr = (g.withdrawals  || []).reduce((a, x) => a + x.amount, 0);
    return s + Math.max(0, alloc - withdr);
  }, 0);

  // Kategórie výdavkov za rok
  const categories = CAT_KEYS.map(key => {
    const value = stats.reduce((s, m) => s + m[key], 0);
    return { key, label: CAT_MAP[key].label, color: CAT_MAP[key].color, value, pct: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0 };
  });

  // Graf: kumulatívny cashflow po posledný mesiac s dátami
  const lastIdx = stats.reduce((acc, m, i) => (m.hasData ? i : acc), -1);
  let running = 0;
  const cfPoints = stats.map((m, i) => {
    running += m.income - m.expenses;
    return { label: m.label.slice(0, 3), value: i <= lastIdx ? running : null };
  });
  const lastMonth = lastIdx >= 0 ? stats[lastIdx] : null;
  const lastNet = lastMonth ? lastMonth.income - lastMonth.expenses : 0;

  // Mesiace s dátami, najnovší hore
  const monthRows = stats.map((m, i) => ({ ...m, month: months[i] })).filter(m => m.hasData).reverse();

  // Podkategórie za celý rok
  const allTransactions = months.flatMap(month => {
    const data = monthsData[month.key];
    return data ? [...(data.history || []), ...(data.creditHistory || [])] : [];
  });
  const yearlySubcategoryTotals = calcSubcategoryTotals(allTransactions, customCategories);
  const unassignedIncome = allTransactions
    .filter(item => !item.subcategory && item.transaction.amount >= 0)
    .reduce((sum, item) => sum + getRemainingAmount(item), 0);
  const unassignedExpense = allTransactions
    .filter(item => !item.subcategory && item.transaction.amount < 0)
    .reduce((sum, item) => sum + getRemainingAmount(item), 0);
  const incomeSubcategories = [
    ...yearlySubcategoryTotals.filter(category => category.type === 'income'),
    { id: '__yearly-unassigned-income', name: 'Nezaradené', type: 'income', total: unassignedIncome, unassigned: true },
  ];
  const expenseSubcategories = [
    ...yearlySubcategoryTotals.filter(category => category.type === 'expense'),
    { id: '__yearly-unassigned-expense', name: 'Nezaradené', type: 'expense', total: unassignedExpense, unassigned: true },
  ];

  return (
    <div className="yearly-screen overview-screen">
      <header className="screen-header">
        <h1 className="screen-title">{activeTab === 'sporenie' ? 'Sporenie' : year}</h1>
        <button className="icon-btn" onClick={onLogout} title={user?.email} aria-label="Odhlásiť sa">
          <LogOut size={20} strokeWidth={1.75} />
        </button>
      </header>

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
        <section className="hero">
          <div className="hero-label">Čistý cashflow za rok</div>
          <div className={`hero-value${netCF < -0.004 ? ' is-negative' : ''}`}><Money value={netCF} sign /></div>
          {lastMonth && (
            <div className={`hero-delta ${lastNet < -0.004 ? 'is-negative' : 'is-positive'}`}>
              {formatMoney(lastNet, { sign: true })} {MONTH_NAMES_IN[lastIdx]}
            </div>
          )}
        </section>

        <CashflowChart points={cfPoints} activeIndex={lastIdx} />

        <section className="split-figures">
          <div>
            <div className="figure-label">Príjmy</div>
            <div className="figure-value is-positive">{formatMoney(totalIncome, { sign: true })}</div>
          </div>
          <div>
            <div className="figure-label">Výdavky</div>
            <div className="figure-value is-negative">{formatMoney(-totalExpenses)}</div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Rozdelenie výdavkov</h2>
            <span className="section-meta">{formatMoney(totalExpenses)}</span>
          </div>
          {totalExpenses > 0 ? <>
            <div className="cat-bar" role="img" aria-label={categories.map(c => `${c.label} ${formatPercent(c.pct)} %`).join(', ')}>
              {categories.filter(c => c.value > 0).map(c => (
                <span key={c.key} style={{ flexGrow: c.value, background: c.color }} />
              ))}
            </div>
            {categories.map(c => (
              <div key={c.key} className="cat-row">
                <span className="cat-name" style={{ color: c.color }}>
                  <span className="cat-swatch" style={{ background: c.color }} />{c.label}
                </span>
                <span className="cat-pct">{formatPercent(c.pct)} %</span>
                <span className="cat-amount">{formatMoney(c.value)}</span>
              </div>
            ))}
          </> : <p className="section-empty">Zatiaľ žiadne výdavky.</p>}
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Mesiace</h2>
            <button className="text-btn" onClick={onOpenMonths}>Zobraziť všetky</button>
          </div>
          {monthRows.length > 0 ? (
            <div className="month-table">
              <div className="month-table-head">
                <span>Mesiac</span><span>Príjmy</span><span>Výdavky</span><span>Rozdiel</span>
              </div>
              {monthRows.map(m => {
                const net = m.income - m.expenses;
                return (
                  <button key={m.key} className="month-table-row" onClick={() => onSelectMonth(m.month)}>
                    <span className="month-table-cells">
                      <span>{m.label}</span>
                      <span className="is-positive">{formatNumber(m.income)}</span>
                      <span className="is-negative">{formatNumber(m.expenses)}</span>
                      <span className={net < -0.004 ? 'is-negative' : ''}>{formatNumber(net, { sign: true })}</span>
                    </span>
                    {m.expenses > 0 && (
                      <span className="month-table-bar" aria-hidden="true">
                        {CAT_KEYS.filter(k => m[k] > 0).map(k => (
                          <span key={k} style={{ flexGrow: m[k], background: CAT_MAP[k].color }} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="section-empty">Zatiaľ žiadny mesiac. Nahraj výpis v časti Mesiace.</p>
          )}
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Podkategórie za celý rok</h2>
          </div>
          <h3 className="subsection-title">Príjmy</h3>
          {incomeSubcategories.map(category => (
            <div key={category.id} className={`list-row${category.unassigned ? ' list-row--muted' : ''}`}>
              <span>{category.name}</span>
              <span className="is-positive">{formatMoney(category.total, { sign: true })}</span>
            </div>
          ))}
          <h3 className="subsection-title">Výdavky</h3>
          {expenseSubcategories.map(category => (
            <div key={category.id} className={`list-row${category.unassigned ? ' list-row--muted' : ''}`}>
              <span>{category.name}</span>
              <span className="is-negative">{formatMoney(-category.total)}</span>
            </div>
          ))}
        </section>
      </>}
    </div>
  );
}
