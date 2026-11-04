import { ChevronLeft, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
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
      onComplete([...existingHistory], [...existingCreditHistory, ...newCredits]);
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
          <button className="back-btn" onClick={onBack}><ChevronLeft size={18} />Späť</button>
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

  const transaction = debitList[index];
  return (
    <div className={`screen${flash ? ` screen--flash-${flash}` : ''}`}>
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} />Späť</button>
        <span className="nav-title">{month.label}</span>
      </div>
      <div className="direction-hints">
        <div className="hint hint--wants"><ArrowLeft size={14} />Wants</div>
        <div className="hint hint--savings"><ArrowUp size={14} />Savings</div>
        <div className="hint hint--needs">Needs<ArrowRight size={14} /></div>
      </div>
      <div className="card-area">
        <SwipeCard key={transaction.id} transaction={transaction} onSwipe={handleSwipe} onSplitRequest={() => setShowSplit(true)} />
      </div>
      <div className="hint hint--split"><ArrowDown size={14} />Rozdeliť</div>
      <p className="counter">{index + 1} / {debitList.length}</p>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(index / debitList.length) * 100}%` }} />
      </div>
      {showSplit && <SplitModal transaction={transaction} onConfirm={handleSplitConfirm} onCancel={() => setShowSplit(false)} />}
    </div>
  );
}
