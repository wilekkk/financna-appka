function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx, cy, r, startAngle, sweepAngle) {
  if (sweepAngle >= 360) sweepAngle = 359.999;
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, startAngle + sweepAngle);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${sweepAngle > 180 ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} L ${cx} ${cy} Z`;
}

export default function PieChart({ slices, total }) {
  const cx = 100, cy = 100, r = 85, hole = 52;
  let angle = 0;
  const paths = slices.filter(s => s.value > 0).map(s => {
    const sweep = (s.value / total) * 360;
    const p = { key: s.key, color: s.color, d: slicePath(cx, cy, r, angle, sweep) };
    angle += sweep; return p;
  });
  return (
    <div className="pie-wrapper">
      <svg viewBox="0 0 200 200" className="pie-svg">
        {paths.map(p => <path key={p.key} d={p.d} fill={p.color} />)}
        <circle cx={cx} cy={cy} r={hole} fill="#f8fafc" />
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="10" fill="#94a3b8" fontFamily="-apple-system,sans-serif">Výdavky</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="17" fontWeight="700" fill="#1e293b" fontFamily="-apple-system,sans-serif">{total.toFixed(0)} €</text>
      </svg>
      <div className="pie-legend">
        {slices.filter(s => s.value > 0).map(s => (
          <div key={s.key} className="legend-row">
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
            <span className="legend-pct" style={{ color: s.color }}>{Math.round((s.value / total) * 100)}%</span>
            <span className="legend-amount">{s.value.toFixed(2)} €</span>
          </div>
        ))}
      </div>
    </div>
  );
}
