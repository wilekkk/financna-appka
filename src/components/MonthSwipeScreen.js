import { useState, useRef } from 'react';
import UploadZone from './UploadZone';
import SwipeCard from './SwipeCard';
import SplitModal from './SplitModal';

const txKey = t => `${t.date}|${t.store}|${t.amount}`;

export default function MonthSwipeScreen({ month, existingHistory = [], existingCreditHistory = [], onComplete, onBack }) {
  const [subScreen, setSubScreen]     = useState('upload');
  const [debitList, setDebitList]     = useState([]);
  const [creditHistory, setCreditHistory] = useState([]);
  const [index, setIndex]             = useState(0);
  const [flash, setFlash]             = useState(null);
  const [showSplit, setShowSplit]     = useState(false);
  const [noNew, setNoNew]             = useState(false);
  const historyRef = useRef([]);

  const handleLoad = (transactions) => {
    const existingDebitKeys  = new Set(existingHistory.map(h => txKey(h.transaction)));
    const existingCreditKeys = new Set(existingCreditHistory.map(h => txKey(h.transaction)));

    const debits = transactions.filter(t => t.typ === 'debet'  && !existingDebitKeys.has(txKey(t)));
    const newCredits = transactions
      .filter(t => t.typ === 'kredit' && !existingCreditKeys.has(txKey(t)))
      .map(t => ({ transaction: t, category: 'prijem', splits: null }));

    historyRef.current = [];
    setDebitList(debits);
    setCreditHistory(newCredits);
    setIndex(0);

    if (debits.length === 0) {
      if (newCredits.length > 0 || existingHistory.length > 0) {
        setNoNew(true);
        setSubScreen('swiping');
        onComplete([...existingHistory], [...existingCreditHistory, ...newCredits]);
      } else {
        onComplete([], newCredits);
      }
    } else {
      setSubScreen('swiping');
    }
  };

  const advance = (entry) => {
    const newHistory = [...historyRef.current, entry];
    historyRef.current = newHistory;
    setFlash(entry.category);
    setTimeout(() => setFlash(null), 900);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= debitList.length) {
      onComplete([...existingHistory, ...newHistory], [...existingCreditHistory, ...creditHistory]);
    }
  };

  const handleSwipe        = dir => advance({ transaction: debitList[index], category: dir, splits: null });
  const handleSplitConfirm = sp  => { setShowSplit(false); advance({ transaction: debitList[index], category: 'split', splits: sp }); };

  if (subScreen === 'upload') {
    return (
      <div className="screen">
        <div className="nav-header">
          <button className="back-btn" onClick={onBack}>← Späť</button>
          <span className="nav-title">{month.label}</span>
        </div>
        {existingHistory.length > 0 && (
          <div className="add-more-info">
            Aktuálne {existingHistory.length + existingCreditHistory.length} transakcií — nahraj ďalší výpis a duplikáty sa preskočia.
          </div>
        )}
        <UploadZone onLoad={handleLoad} />
      </div>
    );
  }

  if (noNew) {
    return (
      <div className="screen">
        <div className="nav-header">
          <button className="back-btn" onClick={onBack}>← Späť</button>
          <span className="nav-title">{month.label}</span>
        </div>
        <div className="no-new-screen">
          <div className="no-new-icon">✓</div>
          <p className="no-new-title">Žiadne nové transakcie</p>
          <p className="no-new-sub">Všetky transakcie z výpisu už boli nahrané.</p>
          <button className="months-btn" onClick={onBack}>Späť na prehľad</button>
        </div>
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
