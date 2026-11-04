import { formatCompact, formatMoney } from '../utils/format';

const W = 340;
const H = 120;

// Čiarový graf kumulatívneho cashflowu.
// points: [{ label: 'Jan', value: číslo alebo null }] – null = mesiac ešte bez dát.
export default function CashflowChart({ points, activeIndex }) {
  const known = points.filter(p => p.value !== null);
  if (known.length === 0) {
    return <p className="chart-empty">Graf sa zobrazí po nahratí prvého mesiaca.</p>;
  }

  const values = known.map(p => p.value);
  let max = Math.max(0, ...values);
  let min = Math.min(0, ...values);
  if (max === min) max = min + 1;
  const pad = (max - min) * 0.12;
  const top = max + pad;
  const bottom = min < 0 ? min - pad : 0;

  const x = i => (i / (points.length - 1)) * W;
  const y = v => H - ((v - bottom) / (top - bottom)) * H;

  const coords = points
    .map((p, i) => (p.value === null ? null : [x(i), y(p.value)]))
    .filter(Boolean);
  const line = coords.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const first = coords[0];
  const last = coords[coords.length - 1];
  const area = `${line} L${last[0].toFixed(1)} ${y(bottom)} L${first[0].toFixed(1)} ${y(bottom)} Z`;

  const grid = [max, (max + min) / 2, min]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map(v => ({ v, top: (y(v) / H) * 100 }));

  const showLabel = i => i === activeIndex || (i % 2 === 0 && Math.abs(i - activeIndex) !== 1);
  const lastValue = known[known.length - 1].value;

  return (
    <figure className="cf-chart" aria-label={`Kumulatívny cashflow, aktuálne ${formatMoney(lastValue, { sign: true })}`}>
      <div className="cf-plot">
        <svg className="cf-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="cf-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {grid.map(g => (
            <line key={g.v} x1="0" x2={W} y1={y(g.v)} y2={y(g.v)} stroke="var(--line)"
                  strokeDasharray={g.v === 0 ? undefined : '2 4'} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#cf-fade)" />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="cf-dot" style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%` }} />
        {grid.map(g => (
          <span key={g.v} className="cf-axis-label" style={{ top: `${g.top}%` }}>{formatCompact(g.v)}</span>
        ))}
      </div>
      <div className="cf-months" aria-hidden="true">
        {points.map((p, i) => showLabel(i) && (
          <span key={p.label} className={`cf-month${i === activeIndex ? ' is-active' : ''}`} style={{ left: `${(x(i) / W) * 100}%` }}>
            {p.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
