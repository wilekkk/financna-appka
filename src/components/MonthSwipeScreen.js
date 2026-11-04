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
  const year = month.key.slice(0, 4);

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
      <div className="yearly-screen detail-screen">
        <header className="detail-header">
          <button className="icon-btn icon-btn--start" onClick={onBack} aria-label="Späť"><ChevronLeft size={22} strokeWidth={1.75} /></button>
          <h1 className="screen-title">{month.label} {year}</h1>
          <span />
        </header>
        <section className="hero">
          <div className="hero-label">Nahratie výpisu</div>
          <p className="upload-intro">
            {existingHistory.length > 0
              ? `Mesiac už má ${existingHistory.length + existingCreditHistory.length} transakcií. Nahraj ďalší výpis, duplikáty sa preskočia.`
              : 'Po nahratí zatriedíš každý výdavok potiahnutím karty.'}
          </p>
        </section>
        <UploadZone onLoad={handleLoad} />
      </div>
    );
  }

  const transaction = debitList[index];
  return (
    <div className={`yearly-screen detail-screen swipe-screen${flash ? ` screen--flash-${flash}` : ''}`}>
      <header className="detail-header">
        <button className="icon-btn icon-btn--start" onClick={onBack} aria-label="Späť"><ChevronLeft size={22} strokeWidth={1.75} /></button>
        <h1 className="screen-title">{month.label} {year}</h1>
        <span className="swipe-counter">{index + 1} / {debitList.length}</span>
      </header>
      <div className="progress-bar swipe-progress">
        <div className="progress-fill" style={{ width: `${(index / debitList.length) * 100}%` }} />
      </div>
      <p className="swipe-help">Potiahni kartu smerom ku kategórii.</p>
      <div className="swipe-stage">
      <div className="direction-hints">
        <div className="hint hint--wants"><ArrowLeft size={14} />Wants</div>
        <div className="hint hint--savings"><ArrowUp size={14} />Savings</div>
        <div className="hint hint--needs">Needs<ArrowRight size={14} /></div>
      </div>
      <div className="card-area">
        <SwipeCard key={transaction.id} transaction={transaction} onSwipe={handleSwipe} onSplitRequest={() => setShowSplit(true)} />
      </div>
      <div className="hint hint--split"><ArrowDown size={14} />Rozdeliť</div>
      </div>
      {showSplit && <SplitModal transaction={transaction} onConfirm={handleSplitConfirm} onCancel={() => setShowSplit(false)} />}
    </div>
  );
}
