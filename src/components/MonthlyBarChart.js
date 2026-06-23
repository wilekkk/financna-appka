export default function MonthlyBarChart({ stats }) {
  const PAD_L = 32, PAD_R = 8, PAD_T = 8, PAD_B = 22;
  const COL = 32, BAR = 11, BAR_GAP = 3, CHART_H = 130;
  const chartW = stats.length * COL + PAD_L + PAD_R;
  const svgH = CHART_H + PAD_T + PAD_B;
  const maxVal = Math.max(...stats.flatMap(m => [m.income, m.expenses]), 1);
  const toH = v => (v / maxVal) * CHART_H;
  const baseY = PAD_T + CHART_H;
  const ticks = [0, 0.5, 1].map(f => ({ y: PAD_T + CHART_H * (1 - f), label: (maxVal * f) > 999 ? `${((maxVal*f)/1000).toFixed(1)}k` : (maxVal * f).toFixed(0) }));

  return (
    <div className="chart-box">
      <span className="chart-title">Príjmy vs Výdavky</span>
      <div className="chart-scroll">
        <svg width={chartW} height={svgH} style={{ display: 'block' }}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD_L} y1={t.y} x2={chartW - PAD_R} y2={t.y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PAD_L - 4} y={t.y + 3} textAnchor="end" fontSize="8" fill="#94a3b8" fontFamily="sans-serif">{t.label}</text>
            </g>
          ))}
          {stats.map((m, i) => {
            const x  = PAD_L + i * COL + 3;
            const ix = x, ex = x + BAR + BAR_GAP;
            const nH = toH(m.needs), wH = toH(m.wants), sH = toH(m.savings);
            return (
              <g key={m.key}>
                {m.income > 0 && <rect x={ix} y={baseY - toH(m.income)} width={BAR} height={toH(m.income)} fill="#22c55e" rx="2" />}
                {m.needs   > 0 && <rect x={ex} y={baseY - nH}           width={BAR} height={nH}            fill="#f97316" rx="2" />}
                {m.wants   > 0 && <rect x={ex} y={baseY - nH - wH}      width={BAR} height={wH}            fill="#ef4444" />}
                {m.savings > 0 && <rect x={ex} y={baseY - nH - wH - sH} width={BAR} height={sH}            fill="#3b82f6" />}
                <text x={x + COL / 2 - 3} y={svgH - 4} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="sans-serif">{m.label.slice(0, 3)}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="chart-legend">
        {[['#22c55e','Príjmy'],['#f97316','Needs'],['#ef4444','Wants'],['#3b82f6','Savings']].map(([c,l]) => (
          <span key={l} className="chart-legend-item"><span className="chart-legend-dot" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </div>
  );
}
