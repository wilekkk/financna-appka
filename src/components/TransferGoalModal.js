import { useState } from 'react';

export default function TransferGoalModal({ fromGoal, available, goals, onConfirm, onCancel }) {
  const targets = goals.filter(g => g.id !== fromGoal.id);
  const [toId, setToId]     = useState(targets[0]?.id ?? '');
  const [amount, setAmount] = useState(available.toFixed(2));

  const parsed  = parseFloat(String(amount).replace(',', '.')) || 0;
  const tooMuch = parsed > available + 0.005;
  const canSave = toId !== '' && parsed > 0 && !tooMuch;

  const handleSave = () => {
    if (canSave) onConfirm(targets.find(g => String(g.id) === String(toId)).id, parsed);
  };

  return (
    <div className="confirm-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-modal">
        <h3 className="confirm-modal-title">Presunúť z „{fromGoal.name}“</h3>
        <div className="goal-form">
          <select className="goal-input" value={toId} onChange={e => setToId(e.target.value)}>
            {targets.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div className="goal-amount-row">
            <input className={`goal-input${tooMuch ? ' goal-input--error' : ''}`} type="number" step="0.01"
              value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus />
            <span className="goal-eur">€</span>
          </div>
          <span className="goal-withdrawn-label">max {available.toFixed(2)} €</span>
        </div>
        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel" onClick={onCancel}>Zrušiť</button>
          <button className="confirm-modal-ok" disabled={!canSave} onClick={handleSave}>Presunúť</button>
        </div>
      </div>
    </div>
  );
}
