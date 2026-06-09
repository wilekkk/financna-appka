import { useState, useRef, useMemo } from 'react';
import './App.css';

// ── CSV parsing ──────────────────────────────────────────────────────────────

function parseCSVRow(row) {
  const result = [];
  let current = '', inQuotes = false;
  for (const ch of row) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function extractStoreName(info) {
  if (!info) return '';
  const match = info.match(/[\d][0-9,.]*\s*EUR\s+([\s\S]+)/i);
  return match ? match[1].trim() : info.trim();
}

function parseAmount(str) {
  return parseFloat((str || '0').replace(',', '.').replace(/\s/g, '')) || 0;
}

function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map(h => h.trim());
  const idx = name => {
    const e = headers.findIndex(h => h === name);
    return e !== -1 ? e : headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
  };
  const iDatum = idx('Dátum spracovania'), iSuma = idx('Suma');
  const iTyp = idx('Typ'), iInfo = idx('Informácia pre príjemcu'), iPopis = idx('Popis');

  return lines.slice(1).flatMap((line, i) => {
    const cols = parseCSVRow(line);
    if (cols.length < 3) return [];
    const typRaw = (cols[iTyp] || '').trim();
    const isDebet = typRaw.toLowerCase().includes('debet');
    const isKredit = typRaw.toLowerCase().includes('kredit');
    if (!isDebet && !isKredit) return [];
    const amount = isDebet
      ? -Math.abs(parseAmount(cols[iSuma]))
      :  Math.abs(parseAmount(cols[iSuma]));
    const info  = (cols[iInfo] || '').trim();
    const store = extractStoreName(info) || (cols[iPopis] || '').trim() || '(neznámy)';
    return [{ id: i + 1, store, amount, date: (cols[iDatum] || '').trim(), typ: isDebet ? 'debet' : 'kredit' }];
  });
}

// ── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];

const CATS = [
  { key: 'needs',   label: 'Needs',   color: '#f97316', emoji: '✅' },
  { key: 'wants',   label: 'Wants',   color: '#ef4444', emoji: '🛍️' },
  { key: 'savings', label: 'Savings', color: '#3b82f6', emoji: '💰' },
  { key: 'prijem',  label: 'Príjem',  color: '#22c55e', emoji: '💵' },
];
const CAT_MAP    = Object.fromEntries(CATS.map(c => [c.key, c]));
const SPLIT_INFO = { key: 'split', label: 'Rozdeliť', color: '#8b5cf6' };
const THRESHOLD  = 80;

function calcMonthTotals(history, creditHistory) {
  const catTotals = { needs: 0, wants: 0, savings: 0 };
  history.forEach(item => {
    const abs = Math.abs(item.transaction.amount);
    if (item.category === 'split') { Object.keys(catTotals).forEach(k => { catTotals[k] += (abs * (item.splits[k] || 0)) / 100; }); }
    else if (item.category in catTotals) { catTotals[item.category] += abs; }
  });
  const totalExpenses = catTotals.needs + catTotals.wants + catTotals.savings;
  const totalIncome   = creditHistory.reduce((s, i) => s + i.transaction.amount, 0);
  return { totalIncome, totalExpenses, catTotals };
}

function getPrevMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

function computeOpeningBalance(monthKey, months, monthsData) {
  const keys = months.map(m => m.key);
  const targetIdx = keys.indexOf(monthKey);
  let running = null;
  for (let i = 0; i < targetIdx; i++) {
    const data = monthsData[keys[i]];
    if (!data) continue;
    if (running === null) running = data.openingBalance ?? 0;
    const { totalIncome, totalExpenses } = calcMonthTotals(data.history, data.creditHistory);
    running += totalIncome - totalExpenses;
  }
  if (running !== null) return running;
  return monthsData[monthKey]?.openingBalance ?? 0;
}

function isFirstInChain(monthKey, months, monthsData) {
  const keys = months.map(m => m.key);
  const idx  = keys.indexOf(monthKey);
  for (let i = 0; i < idx; i++) { if (monthsData[keys[i]]) return false; }
  return true;
}

function generateMonths() {
  const year = new Date().getFullYear();
  return MONTH_NAMES.map((name, m) => ({
    key: `${year}-${String(m + 1).padStart(2, '0')}`,
    label: name,
  }));
}

// ── Swipe helpers ────────────────────────────────────────────────────────────

function getDirection(x, y) {
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ax < THRESHOLD && ay < THRESHOLD) return null;
  if (ax >= ay) return x > 0 ? 'needs' : 'wants';
  return y < 0 ? 'savings' : 'split';
}

function getPreviewKey(x, y) {
  const ax = Math.abs(x), ay = Math.abs(y), t = THRESHOLD * 0.4;
  if (ax < t && ay < t) return null;
  if (ax >= ay) { if (x > t) return 'needs'; if (x < -t) return 'wants'; }
  else { if (y < -t) return 'savings'; if (y > t) return 'split'; }
  return null;
}

// ── YearlyScreen ─────────────────────────────────────────────────────────────

function MonthlyBarChart({ stats }) {
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
                {m.needs   > 0 && <rect x={ex} y={baseY - nH}          width={BAR} height={nH}            fill="#f97316" rx="2" />}
                {m.wants   > 0 && <rect x={ex} y={baseY - nH - wH}     width={BAR} height={wH}            fill="#ef4444" />}
                {m.savings > 0 && <rect x={ex} y={baseY - nH - wH - sH} width={BAR} height={sH}           fill="#3b82f6" />}
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

function BalanceLineChart({ stats }) {
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

function YearlyScreen({ months, monthsData, onOpenMonths, onSelectMonth }) {
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

  return (
    <div className="yearly-screen">
      <div className="yearly-header">
        <h1 className="app-title" style={{ margin: 0 }}>Prehľad {year}</h1>
        <button className="months-btn" onClick={onOpenMonths}>Mesiace →</button>
      </div>

      <div className="kpi-grid">
        {[
          { label: 'Celkové príjmy',  value: `+${totalIncome.toFixed(2)} €`,                        color: '#22c55e' },
          { label: 'Celkové výdavky', value: `-${totalExpenses.toFixed(2)} €`,                      color: '#ef4444' },
          { label: 'Čistý CF (YTD)',  value: `${netCF >= 0 ? '+' : ''}${netCF.toFixed(2)} €`,       color: netCF >= 0 ? '#22c55e' : '#ef4444' },
          { label: 'Zostatok',        value: `${lastClosing >= 0 ? '+' : ''}${lastClosing.toFixed(2)} €`, color: lastClosing >= 0 ? '#22c55e' : '#ef4444' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value" style={{ color: k.color }}>{k.value}</span>
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
    </div>
  );
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

function HomeScreen({ months, monthsData, onSelect, onBack }) {
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

// ── UploadZone ────────────────────────────────────────────────────────────────

function UploadZone({ onLoad }) {
  const inputRef  = useRef();
  const [dropping, setDropping] = useState(false);
  const [error, setError]       = useState('');

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const txs = parseCSV(e.target.result);
        if (!txs.length) throw new Error('Nenašli sa žiadne transakcie. Skontroluj formát CSV.');
        onLoad(txs);
      } catch (err) { setError(err.message); }
    };
    reader.readAsText(file, 'windows-1250');
  };

  return (
    <div className="upload-area">
      <div
        className={`upload-zone${dropping ? ' upload-zone--active' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDropping(true); }}
        onDragLeave={() => setDropping(false)}
        onDrop={e => { e.preventDefault(); setDropping(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <div className="upload-icon">📂</div>
        <p className="upload-label">Nahraj CSV výpis z Tatra banky</p>
        <p className="upload-sub">Klikni alebo pretiahni súbor sem</p>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
               onChange={e => handleFile(e.target.files[0])} />
      </div>
      {error && <p className="upload-error">{error}</p>}
    </div>
  );
}

// ── SwipeCard ─────────────────────────────────────────────────────────────────

function SwipeCard({ transaction, onSwipe, onSplitRequest }) {
  const [pos, setPos]           = useState({ x: 0, y: 0 });
  const [exiting, setExiting]   = useState(null);
  const dragging = useRef(false);
  const origin   = useRef({ x: 0, y: 0 });

  const handleStart = (cx, cy) => { if (exiting) return; dragging.current = true; origin.current = { x: cx, y: cy }; };
  const handleMove  = (cx, cy) => { if (!dragging.current) return; setPos({ x: cx - origin.current.x, y: cy - origin.current.y }); };
  const handleEnd   = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dir = getDirection(pos.x, pos.y);
    if (dir === 'split') { setPos({ x: 0, y: 0 }); onSplitRequest(); }
    else if (dir) { setExiting(dir); setTimeout(() => onSwipe(dir), 380); }
    else { setPos({ x: 0, y: 0 }); }
  };

  const getTransform = () => {
    if (exiting === 'needs')   return 'translate(160%, 20%) rotate(25deg)';
    if (exiting === 'wants')   return 'translate(-160%, 20%) rotate(-25deg)';
    if (exiting === 'savings') return 'translate(0, -160%)';
    return `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x * 0.07}deg)`;
  };

  const previewKey = exiting || getPreviewKey(pos.x, pos.y);
  const isMoving   = pos.x !== 0 || pos.y !== 0;
  const previewCat = previewKey === 'split' ? SPLIT_INFO : (previewKey ? CAT_MAP[previewKey] : null);

  return (
    <div
      className={`card${exiting ? ' card--exiting' : ''}`}
      style={{
        transform: getTransform(),
        transition: exiting ? 'transform 0.38s ease-in' : (dragging.current ? 'none' : 'transform 0.22s ease-out'),
        borderColor: previewCat?.color,
        boxShadow: previewCat ? `0 8px 40px ${previewCat.color}55` : undefined,
      }}
      onMouseDown={e => handleStart(e.clientX, e.clientY)}
      onMouseMove={e => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd} onMouseLeave={handleEnd}
      onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={handleEnd}
    >
      {previewCat && isMoving && (
        <div className="swipe-badge" style={{ color: previewCat.color, borderColor: previewCat.color }}>
          {previewKey === 'split' ? '✂️ Rozdeliť' : previewCat.label}
        </div>
      )}
      <div className="card-icon">🏪</div>
      <div className="card-store">{transaction.store}</div>
      <div className="card-amount">{transaction.amount.toFixed(2)} €</div>
      <div className="card-date">{transaction.date}</div>
    </div>
  );
}

// ── SplitModal ────────────────────────────────────────────────────────────────

function SplitModal({ transaction, onConfirm, onCancel }) {
  const [splits, setSplits] = useState({ needs: 100, wants: 0, savings: 0 });
  const total = splits.needs + splits.wants + splits.savings;
  const remaining = 100 - total;
  const absAmount = Math.abs(transaction.amount);
  const fmtAmt = pct => ((absAmount * pct) / 100).toFixed(2);
  const adjust = (cat, delta) => setSplits(prev => {
    const next = Math.max(0, prev[cat] + delta);
    if (total - prev[cat] + next > 100) return prev;
    return { ...prev, [cat]: next };
  });

  return (
    <div className="split-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="split-sheet">
        <div className="split-handle" />
        <div className="split-tx-info">
          <span className="split-tx-store">{transaction.store}</span>
          <span className="split-tx-amount">{transaction.amount.toFixed(2)} €</span>
        </div>
        <div className="split-rows">
          {CATS.filter(c => c.key !== 'prijem').map(cat => (
            <div key={cat.key} className="split-row">
              <div className="split-row-label">
                <span className="split-dot" style={{ background: cat.color }} />
                <span>{cat.label}</span>
              </div>
              <div className="split-row-controls">
                <button className="split-btn" onClick={() => adjust(cat.key, -5)} disabled={splits[cat.key] === 0}>−</button>
                <span className="split-pct">{splits[cat.key]}%</span>
                <button className="split-btn" onClick={() => adjust(cat.key, +5)} disabled={remaining < 5}>+</button>
              </div>
              <div className="split-row-amount" style={{ color: splits[cat.key] > 0 ? cat.color : '#cbd5e1' }}>
                {splits[cat.key] > 0 ? `${fmtAmt(splits[cat.key])} €` : '—'}
              </div>
            </div>
          ))}
        </div>
        {remaining > 0 && (
          <div className="split-remaining">
            Nerozdelené: <strong>{remaining}%</strong> <span>({fmtAmt(remaining)} €)</span>
          </div>
        )}
        <div className="split-actions">
          <button className="split-cancel-btn" onClick={onCancel}>Zrušiť</button>
          <button className="split-confirm-btn" disabled={total !== 100} onClick={() => onConfirm(splits)}>Potvrdiť</button>
        </div>
      </div>
    </div>
  );
}

// ── MonthSwipeScreen ──────────────────────────────────────────────────────────

function MonthSwipeScreen({ month, onComplete, onBack }) {
  const [subScreen, setSubScreen] = useState('upload');
  const [debitList, setDebitList] = useState([]);
  const [creditHistory, setCreditHistory] = useState([]);
  const [index, setIndex]         = useState(0);
  const [flash, setFlash]         = useState(null);
  const [showSplit, setShowSplit] = useState(false);
  const historyRef = useRef([]);

  const handleLoad = (transactions) => {
    const debits  = transactions.filter(t => t.typ === 'debet');
    const credits = transactions.filter(t => t.typ === 'kredit').map(t => ({ transaction: t, category: 'prijem', splits: null }));
    historyRef.current = [];
    setDebitList(debits);
    setCreditHistory(credits);
    setIndex(0);
    if (debits.length > 0) setSubScreen('swiping');
    else onComplete([], credits);
  };

  const advance = (entry) => {
    const newHistory = [...historyRef.current, entry];
    historyRef.current = newHistory;
    setFlash(entry.category);
    setTimeout(() => setFlash(null), 900);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= debitList.length) onComplete(newHistory, creditHistory);
  };

  const handleSwipe      = dir  => advance({ transaction: debitList[index], category: dir, splits: null });
  const handleSplitConfirm = sp => { setShowSplit(false); advance({ transaction: debitList[index], category: 'split', splits: sp }); };

  if (subScreen === 'upload') {
    return (
      <div className="screen">
        <div className="nav-header">
          <button className="back-btn" onClick={onBack}>← Späť</button>
          <span className="nav-title">{month.label}</span>
        </div>
        <UploadZone onLoad={handleLoad} />
      </div>
    );
  }

  const transaction = debitList[index];
  return (
    <div className={`screen${flash ? ` screen--flash-${flash}` : ''}`}>
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>← Späť</button>
        <span className="nav-title">{month.label}</span>
      </div>
      <div className="direction-hints">
        <div className="hint hint--wants">← Wants</div>
        <div className="hint hint--savings">↑ Savings</div>
        <div className="hint hint--needs">Needs →</div>
      </div>
      <div className="card-area">
        <SwipeCard key={transaction.id} transaction={transaction} onSwipe={handleSwipe} onSplitRequest={() => setShowSplit(true)} />
      </div>
      <div className="hint hint--split">↓ Rozdeliť</div>
      <p className="counter">{index + 1} / {debitList.length}</p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(index / debitList.length) * 100}%` }} />
      </div>
      {showSplit && <SplitModal transaction={transaction} onConfirm={handleSplitConfirm} onCancel={() => setShowSplit(false)} />}
    </div>
  );
}

// ── Pie chart ─────────────────────────────────────────────────────────────────

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

function PieChart({ slices, total }) {
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

// ── TransactionTable ──────────────────────────────────────────────────────────

function getBubbleAmounts(item) {
  const abs = Math.abs(item.transaction.amount);
  if (item.category === 'split') {
    return {
      needs:   (abs * (item.splits.needs   || 0)) / 100,
      wants:   (abs * (item.splits.wants   || 0)) / 100,
      savings: (abs * (item.splits.savings || 0)) / 100,
    };
  }
  return {
    needs:   item.category === 'needs'   ? abs : 0,
    wants:   item.category === 'wants'   ? abs : 0,
    savings: item.category === 'savings' ? abs : 0,
  };
}

function EditableBubble({ value, color, emoji, onChange }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('');

  const start = e => { e.stopPropagation(); setInput(value.toFixed(2)); setEditing(true); };
  const confirm = () => { onChange(Math.max(0, parseFloat(input.replace(',', '.')) || 0)); setEditing(false); };

  if (editing) {
    return (
      <span className="bubble-editing" style={{ background: color }}>
        <input className="bubble-input" type="number" step="0.01" value={input}
          onChange={e => setInput(e.target.value)}
          onBlur={confirm}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus onClick={e => e.stopPropagation()}
        />€
      </span>
    );
  }
  return (
    <span className="summary-tag" style={{ background: color, cursor: 'pointer' }} onClick={start}>
      {emoji} {value.toFixed(2)} €
    </span>
  );
}

function TransactionRow({ item, editMode, onUpdateAmounts, onUpdateAmount, onDelete }) {
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [editingAmount, setEditingAmount]   = useState(false);
  const [amountInput, setAmountInput]       = useState('');
  const isCredit   = item._type === 'credit';
  const abs        = Math.abs(item.transaction.amount);
  const bubbleCats = CATS.filter(c => c.key !== 'prijem');
  const amounts    = isCredit ? null : getBubbleAmounts(item);
  const sum        = amounts ? amounts.needs + amounts.wants + amounts.savings : abs;
  const isValid    = Math.abs(sum - abs) < 0.005;

  return (
    <div className={`tx-row${editMode && !isValid ? ' tx-row--invalid' : ''}`}>

      {/* Top row: [× in editMode] [store] [amount] */}
      <div className="tx-row-top">
        {editMode && (
          <button className="tx-delete-btn" onClick={() => setConfirmDelete(c => !c)}>×</button>
        )}
        <span className="tx-store">{item.transaction.store}</span>
        {editMode && editingAmount ? (
          <span className="amount-editing" style={{ color: isCredit ? '#22c55e' : '#ef4444' }}>
            <input
              className="amount-input"
              type="number" step="0.01"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              onBlur={() => {
                const val = Math.max(0, parseFloat(amountInput.replace(',', '.')) || 0);
                onUpdateAmount(item._type, item._idx, val);
                setEditingAmount(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') setEditingAmount(false);
              }}
              autoFocus onClick={e => e.stopPropagation()}
            />€
          </span>
        ) : (
          <span
            className={`tx-amount${editMode ? ' tx-amount--editable' : ''}`}
            style={{ color: isCredit ? '#22c55e' : '#ef4444' }}
            onClick={editMode ? () => { setAmountInput(Math.abs(item.transaction.amount).toFixed(2)); setEditingAmount(true); } : undefined}
          >
            {item.transaction.amount.toFixed(2)} €
          </span>
        )}
      </div>

      {/* Confirmation */}
      {editMode && confirmDelete && (
        <div className="tx-confirm">
          <span className="tx-confirm-label">Naozaj vymazať?</span>
          <button className="tx-confirm-yes" onClick={() => onDelete(item._type, item._idx)}>Áno</button>
          <button className="tx-confirm-no" onClick={() => setConfirmDelete(false)}>Nie</button>
        </div>
      )}

      {/* Bottom row: [date] [bubbles / tag] */}
      {!confirmDelete && (
        <div className="tx-row-bottom">
          <span className="tx-date">{item.transaction.date}</span>
          {isCredit ? (
            <span className="summary-tag" style={{ background: CAT_MAP['prijem'].color, whiteSpace: 'nowrap' }}>
              {CAT_MAP['prijem'].emoji} {item.transaction.amount.toFixed(2)} €
            </span>
          ) : editMode ? (
            <div className="tx-bubbles-area">
              {bubbleCats.map(c => (
                <EditableBubble key={c.key} value={amounts[c.key]} color={c.color} emoji={c.emoji}
                  onChange={val => onUpdateAmounts(item._idx, { ...amounts, [c.key]: val }, abs)}
                />
              ))}
            </div>
          ) : (
            <div className="tx-tags">
              {bubbleCats.filter(c => amounts[c.key] > 0.005).map(c => (
                <span key={c.key} className="summary-tag" style={{ background: c.color, whiteSpace: 'nowrap' }}>
                  {c.emoji} {amounts[c.key].toFixed(2)} €
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {editMode && !isValid && !confirmDelete && (
        <p className="tx-validation-warn">⚠ Súčet: {sum.toFixed(2)} € / {abs.toFixed(2)} €</p>
      )}
    </div>
  );
}

function TransactionTable({ history, creditHistory, editMode, onUpdateAmounts, onUpdateAmount, onDelete }) {
  const parseDate = str => { const [d, m, y] = (str || '').split('.'); return new Date(+y, +m - 1, +d) || new Date(0); };
  const all = [
    ...history.map((item, i) => ({ ...item, _type: 'debit',  _idx: i })),
    ...creditHistory.map((item, i) => ({ ...item, _type: 'credit', _idx: i })),
  ].sort((a, b) => parseDate(b.transaction.date) - parseDate(a.transaction.date));

  return (
    <div className="tx-list">
      {all.map((item, i) => (
        <TransactionRow key={i} item={item} editMode={editMode} onUpdateAmounts={onUpdateAmounts} onUpdateAmount={onUpdateAmount} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ── DashboardTab ──────────────────────────────────────────────────────────────

function DashboardTab({ history, creditHistory, openingBalance, isFirstInChain, onUpdateOpeningBalance }) {
  const [editing, setEditing]   = useState(false);
  const [inputVal, setInputVal] = useState('');

  const { totalIncome, totalExpenses, catTotals } = calcMonthTotals(history, creditHistory);
  const closingBalance = openingBalance + totalIncome - totalExpenses;
  const slices = CATS.filter(c => c.key !== 'prijem').map(c => ({ ...c, value: catTotals[c.key] }));

  const startEdit = () => { setInputVal(openingBalance.toFixed(2)); setEditing(true); };
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

// ── ResultsScreen ─────────────────────────────────────────────────────────────

function ResultsScreen({ month, history, creditHistory, openingBalance, isFirstInChain, onUpdateOpeningBalance, onUpdateHistory, onUpdateCreditHistory, onBack }) {
  const [tab, setTab]                   = useState('table');
  const [editMode, setEditMode]         = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);

  const handleUpdateAmounts = (idx, newAmounts, total) => {
    const pct = v => total > 0 ? parseFloat(((v / total) * 100).toFixed(4)) : 0;
    onUpdateHistory(history.map((item, i) =>
      i !== idx ? item : { ...item, category: 'split', splits: { needs: pct(newAmounts.needs), wants: pct(newAmounts.wants), savings: pct(newAmounts.savings) } }
    ));
  };

  const handleDelete = (type, idx) => {
    if (type === 'debit')  onUpdateHistory(history.filter((_, i) => i !== idx));
    else                   onUpdateCreditHistory(creditHistory.filter((_, i) => i !== idx));
  };

  const handleUpdateAmount = (type, idx, newAbs) => {
    if (type === 'debit') {
      onUpdateHistory(history.map((item, i) =>
        i !== idx ? item : { ...item, transaction: { ...item.transaction, amount: -newAbs } }
      ));
    } else {
      onUpdateCreditHistory(creditHistory.map((item, i) =>
        i !== idx ? item : { ...item, transaction: { ...item.transaction, amount: newAbs } }
      ));
    }
  };

  return (
    <div className="screen">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>← Späť</button>
        <span className="nav-title">{month.label}</span>
      </div>
      <div className="tabs">
        <button className={`tab-btn${tab === 'table' ? ' tab-btn--active' : ''}`} onClick={() => setTab('table')}>Transakcie</button>
        <button className={`tab-btn${tab === 'dashboard' ? ' tab-btn--active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
      </div>
      {tab === 'table' && (
        <button
          className={`edit-mode-btn${editMode ? ' edit-mode-btn--active' : ''}`}
          onClick={() => editMode ? setEditMode(false) : setShowEditConfirm(true)}
        >
          ⚙️ Upraviť
        </button>
      )}

      {showEditConfirm && (
        <div className="confirm-overlay" onClick={() => setShowEditConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon">⚙️</div>
            <h3 className="confirm-modal-title">Prepnúť do editačného módu?</h3>
            <p className="confirm-modal-text">Editačný mód je určený skúsenejším používateľom. Môžete meniť sumy, kategórie aj mazať transakcie.</p>
            <div className="confirm-modal-actions">
              <button className="confirm-modal-cancel" onClick={() => setShowEditConfirm(false)}>Zrušiť</button>
              <button className="confirm-modal-ok" onClick={() => { setEditMode(true); setShowEditConfirm(false); }}>Prepnúť</button>
            </div>
          </div>
        </div>
      )}
      {tab === 'table'
        ? <TransactionTable
            history={history}
            creditHistory={creditHistory}
            editMode={editMode}
            onUpdateAmounts={handleUpdateAmounts}
            onUpdateAmount={handleUpdateAmount}
            onDelete={handleDelete}
          />
        : <DashboardTab
            history={history}
            creditHistory={creditHistory}
            openingBalance={openingBalance}
            isFirstInChain={isFirstInChain}
            onUpdateOpeningBalance={onUpdateOpeningBalance}
          />
      }
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [screen, setScreen]               = useState('yearly');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthsData, setMonthsData]       = useState({});
  const months = useMemo(() => generateMonths(), []);

  const handleSelect = (month) => {
    setSelectedMonth(month);
    setScreen(monthsData[month.key] ? 'results' : 'swipe');
  };

  const handleComplete = (history, creditHistory) => {
    setMonthsData(prev => ({
      ...prev,
      [selectedMonth.key]: {
        history,
        creditHistory,
        openingBalance: prev[selectedMonth.key]?.openingBalance ?? 0,
      },
    }));
    setScreen('results');
  };

  const handleUpdateOpeningBalance = (value) => {
    setMonthsData(prev => ({ ...prev, [selectedMonth.key]: { ...prev[selectedMonth.key], openingBalance: value } }));
  };

  const handleUpdateHistory = (newHistory) => {
    setMonthsData(prev => ({ ...prev, [selectedMonth.key]: { ...prev[selectedMonth.key], history: newHistory } }));
  };

  const handleUpdateCreditHistory = (newCreditHistory) => {
    setMonthsData(prev => ({ ...prev, [selectedMonth.key]: { ...prev[selectedMonth.key], creditHistory: newCreditHistory } }));
  };

  if (screen === 'yearly') {
    return <YearlyScreen months={months} monthsData={monthsData} onOpenMonths={() => setScreen('months')} onSelectMonth={handleSelect} />;
  }

  if (screen === 'months') {
    return <HomeScreen months={months} monthsData={monthsData} onSelect={handleSelect} onBack={() => setScreen('yearly')} />;
  }

  if (screen === 'swipe') {
    return <MonthSwipeScreen month={selectedMonth} onComplete={handleComplete} onBack={() => setScreen('months')} />;
  }

  const data = monthsData[selectedMonth.key];
  const computedOpening = computeOpeningBalance(selectedMonth.key, months, monthsData);
  const isFirst = isFirstInChain(selectedMonth.key, months, monthsData);
  return (
    <ResultsScreen
      month={selectedMonth}
      history={data.history}
      creditHistory={data.creditHistory}
      openingBalance={computedOpening}
      isFirstInChain={isFirst}
      onUpdateOpeningBalance={handleUpdateOpeningBalance}
      onUpdateHistory={handleUpdateHistory}
      onUpdateCreditHistory={handleUpdateCreditHistory}
      onBack={() => setScreen('months')}
    />
  );
}

export default App;
