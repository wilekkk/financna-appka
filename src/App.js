import { useState, useRef } from 'react';
import './App.css';

// ---- CSV parsing ----

function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += ch;
    }
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

  const rawHeaders = parseCSVRow(lines[0]).map(h => h.trim());
  const idx = (name) => {
    const exact = rawHeaders.findIndex(h => h === name);
    return exact !== -1 ? exact : rawHeaders.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
  };

  const iDatum = idx('Dátum spracovania');
  const iSuma  = idx('Suma');
  const iTyp   = idx('Typ');
  const iInfo  = idx('Informácia pre príjemcu');
  const iPopis = idx('Popis');

  return lines.slice(1).flatMap((line, i) => {
    const cols = parseCSVRow(line);
    if (cols.length < 3) return [];
    const typRaw  = (cols[iTyp] || '').trim();
    const isDebet  = typRaw.toLowerCase().includes('debet');
    const isKredit = typRaw.toLowerCase().includes('kredit');
    if (!isDebet && !isKredit) return [];

    const rawAmount = parseAmount(cols[iSuma]);
    const amount    = isDebet ? -Math.abs(rawAmount) : Math.abs(rawAmount);
    const info      = (cols[iInfo] || '').trim();
    const store     = extractStoreName(info) || (cols[iPopis] || '').trim() || '(neznámy)';
    const date      = (cols[iDatum] || '').trim();

    return [{ id: i + 1, store, amount, date, typ: isDebet ? 'debet' : 'kredit' }];
  });
}

// ---- Constants ----

const CATS = [
  { key: 'needs',   label: 'Needs',   color: '#f97316', emoji: '✅' },
  { key: 'wants',   label: 'Wants',   color: '#ef4444', emoji: '🛍️' },
  { key: 'savings', label: 'Savings', color: '#3b82f6', emoji: '💰' },
  { key: 'prijem',  label: 'Príjem',  color: '#22c55e', emoji: '💵' },
];
const CAT_MAP    = Object.fromEntries(CATS.map(c => [c.key, c]));
const SPLIT_INFO = { key: 'split', label: 'Rozdeliť', color: '#8b5cf6' };
const THRESHOLD  = 80;

// ---- Swipe helpers ----

function getDirection(x, y) {
  const ax = Math.abs(x), ay = Math.abs(y);
  if (ax < THRESHOLD && ay < THRESHOLD) return null;
  if (ax >= ay) return x > 0 ? 'needs' : 'wants';
  return y < 0 ? 'savings' : 'split';
}

function getPreviewKey(x, y) {
  const ax = Math.abs(x), ay = Math.abs(y);
  const t = THRESHOLD * 0.4;
  if (ax < t && ay < t) return null;
  if (ax >= ay) {
    if (x > t) return 'needs';
    if (x < -t) return 'wants';
  } else {
    if (y < -t) return 'savings';
    if (y > t) return 'split';
  }
  return null;
}

// ---- Upload screen ----

function UploadScreen({ onLoad }) {
  const inputRef = useRef();
  const [dropping, setDropping] = useState(false);
  const [error, setError]       = useState('');

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const txs = parseCSV(e.target.result);
        if (!txs.length) throw new Error('Nenašli sa žiadne transakcie. Skontroluj formát CSV.');
        onLoad(txs);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file, 'windows-1250');
  };

  return (
    <div className="upload-screen">
      <h1 className="app-title">Finančná appka</h1>
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
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>
      {error && <p className="upload-error">{error}</p>}
    </div>
  );
}

// ---- SwipeCard ----

function SwipeCard({ transaction, onSwipe, onSplitRequest }) {
  const [pos, setPos]       = useState({ x: 0, y: 0 });
  const [exiting, setExiting] = useState(null);
  const dragging = useRef(false);
  const origin   = useRef({ x: 0, y: 0 });

  const handleStart = (cx, cy) => {
    if (exiting) return;
    dragging.current = true;
    origin.current = { x: cx, y: cy };
  };

  const handleMove = (cx, cy) => {
    if (!dragging.current) return;
    setPos({ x: cx - origin.current.x, y: cy - origin.current.y });
  };

  const handleEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dir = getDirection(pos.x, pos.y);
    if (dir === 'split') {
      setPos({ x: 0, y: 0 });
      onSplitRequest();
    } else if (dir) {
      setExiting(dir);
      setTimeout(() => onSwipe(dir), 380);
    } else {
      setPos({ x: 0, y: 0 });
    }
  };

  const getTransform = () => {
    if (exiting === 'needs')   return 'translate(160%, 20%) rotate(25deg)';
    if (exiting === 'wants')   return 'translate(-160%, 20%) rotate(-25deg)';
    if (exiting === 'savings') return 'translate(0, -160%)';
    return `translate(${pos.x}px, ${pos.y}px) rotate(${pos.x * 0.07}deg)`;
  };

  const previewKey = exiting || getPreviewKey(pos.x, pos.y);
  const isMoving   = pos.x !== 0 || pos.y !== 0;
  const previewCat = previewKey === 'split'
    ? SPLIT_INFO
    : (previewKey ? CAT_MAP[previewKey] : null);

  return (
    <div
      className={`card${exiting ? ' card--exiting' : ''}`}
      style={{
        transform: getTransform(),
        transition: exiting
          ? 'transform 0.38s ease-in'
          : (dragging.current ? 'none' : 'transform 0.22s ease-out'),
        borderColor: previewCat?.color,
        boxShadow: previewCat ? `0 8px 40px ${previewCat.color}55` : undefined,
      }}
      onMouseDown={e => handleStart(e.clientX, e.clientY)}
      onMouseMove={e => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
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

// ---- SplitModal ----

function SplitModal({ transaction, onConfirm, onCancel }) {
  const [splits, setSplits] = useState({ needs: 100, wants: 0, savings: 0 });

  const total     = splits.needs + splits.wants + splits.savings;
  const remaining = 100 - total;
  const absAmount = Math.abs(transaction.amount);
  const fmtAmt    = pct => ((absAmount * pct) / 100).toFixed(2);

  const adjust = (cat, delta) => {
    setSplits(prev => {
      const next     = Math.max(0, prev[cat] + delta);
      const newTotal = total - prev[cat] + next;
      if (newTotal > 100) return prev;
      return { ...prev, [cat]: next };
    });
  };

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
          <button className="split-confirm-btn" disabled={total !== 100} onClick={() => onConfirm(splits)}>
            Potvrdiť
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Pie chart ----

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx, cy, r, startAngle, sweepAngle) {
  if (sweepAngle >= 360) sweepAngle = 359.999;
  const s    = polarToCartesian(cx, cy, r, startAngle);
  const e    = polarToCartesian(cx, cy, r, startAngle + sweepAngle);
  const large = sweepAngle > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} L ${cx} ${cy} Z`;
}

function PieChart({ slices, total }) {
  const cx = 100, cy = 100, r = 85, hole = 52;
  let angle = 0;

  const paths = slices.filter(s => s.value > 0).map(s => {
    const sweep = (s.value / total) * 360;
    const p = { key: s.key, color: s.color, d: slicePath(cx, cy, r, angle, sweep) };
    angle += sweep;
    return p;
  });

  return (
    <div className="pie-wrapper">
      <svg viewBox="0 0 200 200" className="pie-svg">
        {paths.map(p => <path key={p.key} d={p.d} fill={p.color} />)}
        <circle cx={cx} cy={cy} r={hole} fill="#f8fafc" />
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="10" fill="#94a3b8"
              fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
          Výdavky
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="17" fontWeight="700" fill="#1e293b"
              fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">
          {total.toFixed(0)} €
        </text>
      </svg>

      <div className="pie-legend">
        {slices.filter(s => s.value > 0).map(s => (
          <div key={s.key} className="legend-row">
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
            <span className="legend-pct" style={{ color: s.color }}>
              {Math.round((s.value / total) * 100)}%
            </span>
            <span className="legend-amount">{s.value.toFixed(2)} €</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Dashboard ----

function Dashboard({ history, creditHistory, onReset }) {
  const catTotals = { needs: 0, wants: 0, savings: 0 };

  history.forEach(item => {
    const abs = Math.abs(item.transaction.amount);
    if (item.category === 'split') {
      Object.keys(catTotals).forEach(k => {
        catTotals[k] += (abs * (item.splits[k] || 0)) / 100;
      });
    } else if (item.category in catTotals) {
      catTotals[item.category] += abs;
    }
  });

  const totalExpenses = catTotals.needs + catTotals.wants + catTotals.savings;
  const totalIncome   = creditHistory.reduce((s, i) => s + i.transaction.amount, 0);
  const balance       = totalIncome - totalExpenses;

  const slices = CATS
    .filter(c => c.key !== 'prijem')
    .map(c => ({ ...c, value: catTotals[c.key] }));

  return (
    <div className="screen">
      <h1 className="app-title">Dashboard</h1>

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
        <div className={`stat-card stat-card--balance${balance >= 0 ? ' positive' : ' negative'}`}>
          <span className="stat-label">Zostatok</span>
          <span className="stat-value">{balance >= 0 ? '+' : ''}{balance.toFixed(2)} €</span>
        </div>
      </div>

      <button className="restart-btn" onClick={onReset}>Nový výpis</button>
    </div>
  );
}

// ---- App ----

function App() {
  const [screen, setScreen]               = useState('upload');
  const [debitList, setDebitList]         = useState([]);
  const [creditHistory, setCreditHistory] = useState([]);
  const [index, setIndex]                 = useState(0);
  const [history, setHistory]             = useState([]);
  const [flash, setFlash]                 = useState(null);
  const [showSplit, setShowSplit]         = useState(false);

  const handleLoad = (transactions) => {
    const debits  = transactions.filter(t => t.typ === 'debet');
    const credits = transactions.filter(t => t.typ === 'kredit')
      .map(t => ({ transaction: t, category: 'prijem', splits: null }));
    setDebitList(debits);
    setCreditHistory(credits);
    setIndex(0);
    setHistory([]);
    setScreen(debits.length > 0 ? 'swipe' : 'dashboard');
  };

  const advance = (entry) => {
    setHistory(h => {
      const next = [...h, entry];
      if (next.length >= debitList.length) setScreen('dashboard');
      return next;
    });
    setFlash(entry.category);
    setTimeout(() => setFlash(null), 900);
    setIndex(i => i + 1);
  };

  const handleSwipe = (direction) => {
    advance({ transaction: debitList[index], category: direction, splits: null });
  };

  const handleSplitConfirm = (splits) => {
    setShowSplit(false);
    advance({ transaction: debitList[index], category: 'split', splits });
  };

  const handleReset = () => {
    setScreen('upload');
    setHistory([]);
    setCreditHistory([]);
  };

  if (screen === 'upload') {
    return <UploadScreen onLoad={handleLoad} />;
  }

  if (screen === 'dashboard') {
    return (
      <Dashboard
        history={history}
        creditHistory={creditHistory}
        onReset={handleReset}
      />
    );
  }

  // swipe
  const transaction = debitList[index];
  return (
    <div className={`screen${flash ? ` screen--flash-${flash}` : ''}`}>
      <h1 className="app-title">Finančná appka</h1>
      <div className="direction-hints">
        <div className="hint hint--wants">← Wants</div>
        <div className="hint hint--savings">↑ Savings</div>
        <div className="hint hint--needs">Needs →</div>
      </div>
      <div className="card-area">
        <SwipeCard
          key={transaction.id}
          transaction={transaction}
          onSwipe={handleSwipe}
          onSplitRequest={() => setShowSplit(true)}
        />
      </div>
      <div className="hint hint--split">↓ Rozdeliť</div>
      <p className="counter">{index + 1} / {debitList.length}</p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(index / debitList.length) * 100}%` }} />
      </div>
      {showSplit && (
        <SplitModal
          transaction={transaction}
          onConfirm={handleSplitConfirm}
          onCancel={() => setShowSplit(false)}
        />
      )}
    </div>
  );
}

export default App;
