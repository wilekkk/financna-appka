import { ChevronRight, FileUp } from 'lucide-react';
import { CAT_MAP } from '../constants';
import { calcMonthTotals } from '../utils/finance';
import { formatMoney } from '../utils/format';

const CAT_KEYS = ['needs', 'wants', 'savings'];

// Zoznam mesiacov roka. Mesiac s dátami ukáže výsledok, prázdny ponúkne nahratie výpisu.
export default function HomeScreen({ months, monthsData, onSelect }) {
  const year = months[0]?.key.slice(0, 4);
  return (
    <div className="yearly-screen overview-screen">
      <header className="screen-header">
        <h1 className="screen-title">Mesiace {year}</h1>
      </header>

      <div className="month-rows">
        {months.map(month => {
          const data = monthsData[month.key];
          if (!data) {
            return (
              <button key={month.key} className="month-row month-row--empty" onClick={() => onSelect(month)}>
                <span className="month-row-info">
                  <span className="month-row-name">{month.label}</span>
                  <span className="month-row-sub">Bez výpisu</span>
                </span>
                <span className="month-row-upload"><FileUp size={16} />Nahrať</span>
              </button>
            );
          }
          const { totalIncome, totalExpenses, catTotals } = calcMonthTotals(data.history, data.creditHistory);
          const net = totalIncome - totalExpenses;
          return (
            <button key={month.key} className="month-row" onClick={() => onSelect(month)}>
              <span className="month-row-info">
                <span className="month-row-name">{month.label}</span>
                <span className="month-row-sub">
                  <span className="is-positive">{formatMoney(totalIncome, { sign: true })}</span>
                  <span className="is-negative">{formatMoney(-totalExpenses)}</span>
                </span>
                {totalExpenses > 0 && (
                  <span className="month-table-bar" aria-hidden="true">
                    {CAT_KEYS.filter(k => catTotals[k] > 0).map(k => (
                      <span key={k} style={{ flexGrow: catTotals[k], background: CAT_MAP[k].color }} />
                    ))}
                  </span>
                )}
              </span>
              <span className={`month-row-net${net < -0.004 ? ' is-negative' : ''}`}>{formatMoney(net, { sign: true })}</span>
              <ChevronRight size={18} className="month-row-chevron" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
