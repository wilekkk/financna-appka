import { useState } from 'react';
import { CATS } from '../constants';

export default function SplitModal({ transaction, onConfirm, onCancel }) {
  const [splits, setSplits] = useState({ needs: 100, wants: 0, savings: 0 });
  const total     = splits.needs + splits.wants + splits.savings;
  const remaining = 100 - total;
  const absAmount = Math.abs(transaction.amount);
  const fmtAmt    = pct => ((absAmount * pct) / 100).toFixed(2);
  const adjust    = (cat, delta) => setSplits(prev => {
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
