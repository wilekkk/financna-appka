export default function BalanceLineChart({ stats }) {
  const PAD_L = 40, PAD_R = 12, PAD_T = 12, PAD_B = 22, CHART_H = 90;
  const W = stats.length * 32 + PAD_L + PAD_R;
  const svgH = CHART_H + PAD_T + PAD_B;
  const pts = stats.map((m, i) => ({ i, val: m.hasData ? m.closing : null })).filter(p => p.val !== null);
  if (pts.length < 1) return null;
  const vals = pts.map(p => p.val);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const colW = (W - PAD_L - PAD_R) / (stats.length - 1 || 1);
  const toX = i => PAD_L + i * colW;
  const toY = v => PAD_T + CHART_H - ((v - minV) / range) * CHART_H;
  const mapped = pts.map(p => ({ x: toX(p.i), y: toY(p.val), val: p.val }));
  const path = mapped.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="chart-box">
      <span className="chart-title">Vývoj zostatku</span>
      <div className="chart-scroll">
        <svg width={W} height={svgH} style={{ display: 'block' }}>
          {minV < 0 && maxV > 0 && <line x1={PAD_L} y1={toY(0)} x2={W - PAD_R} y2={toY(0)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,2" />}
          <path d={path} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {mapped.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />)}
          {stats.map((m, i) => (
            <text key={i} x={toX(i)} y={svgH - 4} textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="sans-serif">{m.label.slice(0, 3)}</text>
          ))}
        </svg>
      </div>
    </div>
  );
}
