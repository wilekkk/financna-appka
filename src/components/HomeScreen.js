import { calcMonthTotals } from '../utils/finance';

export default function HomeScreen({ months, monthsData, onSelect, onBack }) {
  return (
    <div className="home-screen">
      <div className="nav-header" style={{ marginBottom: 16 }}>
        <button className="back-btn" onClick={onBack}>← Späť</button>
        <span className="nav-title">Mesiace</span>
      </div>
      <div className="month-list">
        {months.map(month => {
          const data = monthsData[month.key];
          let net = null;
          if (data) {
            const { totalIncome, totalExpenses } = calcMonthTotals(data.history, data.creditHistory);
            net = totalIncome - totalExpenses;
          }
          return (
            <div key={month.key} className={`month-card${data ? ' month-card--done' : ''}`} onClick={() => onSelect(month)}>
              <div className="month-card-info">
                <span className="month-name">{month.label}</span>
                {data
                  ? <span className="month-sub" style={{ color: net >= 0 ? '#22c55e' : '#ef4444' }}>
                      {net >= 0 ? '+' : ''}{net.toFixed(2)} €
                    </span>
                  : <span className="month-sub month-sub--empty">Nespracovaný</span>
                }
              </div>
              <span className={`month-arrow${data ? ' month-arrow--done' : ''}`}>{data ? '✓' : '→'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
