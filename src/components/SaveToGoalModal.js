import { useState, useRef } from 'react';

export default function SaveToGoalModal({ transaction, savingsAmount, goals, onConfirm, onCancel, onAddGoal }) {
  const [selections, setSelections] = useState(
    Object.fromEntries(goals.map(g => [g.id, { selected: false, amount: '' }]))
  );
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName]         = useState('');
  const [newTarget, setNewTarget]     = useState('');

  const prevGoalCount = useRef(goals.length);
  if (goals.length > prevGoalCount.current) {
    prevGoalCount.current = goals.length;
    const added = goals.filter(g => !(g.id in selections));
    if (added.length) {
      setSelections(p => ({
        ...p,
        ...Object.fromEntries(added.map(g => [g.id, { selected: false, amount: '' }])),
      }));
    }
  }

  const handleAddNewGoal = () => {
    if (!newName.trim()) return;
    const parsed = parseFloat(newTarget.replace(',', '.'));
    onAddGoal({ name: newName.trim(), targetAmount: parsed > 0 ? parsed : null });
    setNewName('');
    setNewTarget('');
    setShowNewForm(false);
  };

  const totalAllocated = goals
    .filter(g => selections[g.id]?.selected)
    .reduce((s, g) => s + (parseFloat(selections[g.id].amount) || 0), 0);
  const remaining = savingsAmount - totalAllocated;

  const toggle = id => setSelections(p => ({ ...p, [id]: { ...p[id], selected: !p[id].selected } }));
  const setAmt  = (id, v) => setSelections(p => ({ ...p, [id]: { ...p[id], amount: v } }));

  const handleConfirm = () => {
    const allocs = goals
      .filter(g => selections[g.id]?.selected)
      .map(g => ({ goalId: g.id, amount: parseFloat(selections[g.id].amount) || 0 }))
      .filter(a => a.amount > 0);
    onConfirm(allocs, { store: transaction.store, date: transaction.date });
  };

  const hasAny = goals.some(g => selections[g.id]?.selected);

  return (
    <div className="split-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="split-sheet">
        <div className="split-handle" />
        <div className="split-tx-info">
          <span className="split-tx-store">{transaction.store}</span>
          <span className="split-tx-amount" style={{ color: '#3b82f6' }}>💰 {savingsAmount.toFixed(2)} €</span>
        </div>

        <div className="stg-goals-list">
          {goals.map(g => {
            const sel = selections[g.id];
            if (!sel) return null;
            const allocated = (g.allocations || []).reduce((s, a) => s + a.amount, 0);
            return (
              <div key={g.id} className={`stg-goal-row${sel.selected ? ' stg-goal-row--active' : ''}`}>
                <label className="stg-goal-label">
                  <input type="checkbox" checked={sel.selected} onChange={() => toggle(g.id)} />
                  <span className="stg-goal-name">{g.name}</span>
                  {g.targetAmount && (
                    <span className="stg-goal-meta">{allocated.toFixed(0)} / {g.targetAmount.toFixed(0)} €</span>
                  )}
                </label>
                {sel.selected && (
                  <div className="goal-amount-row stg-amount-row">
                    <input className="goal-input" type="number" step="0.01" placeholder="Suma"
                      value={sel.amount} onChange={e => setAmt(g.id, e.target.value)} autoFocus />
                    <span className="goal-eur">€</span>
                  </div>
                )}
              </div>
            );
          })}

          {showNewForm ? (
            <div className="stg-new-form">
              <input className="goal-input" type="text" placeholder="Názov cieľa"
                value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNewGoal()} autoFocus />
              <div className="goal-amount-row">
                <input className="goal-input" type="number" step="0.01" placeholder="Cieľová suma (voliteľné)"
                  value={newTarget} onChange={e => setNewTarget(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNewGoal()} />
                <span className="goal-eur">€</span>
              </div>
              <div className="stg-new-form-actions">
                <button className="stg-cancel-new" onClick={() => setShowNewForm(false)}>Zrušiť</button>
                <button className="stg-save-new" disabled={!newName.trim()} onClick={handleAddNewGoal}>Vytvoriť</button>
              </div>
            </div>
          ) : (
            <button className="stg-add-new-btn" onClick={() => setShowNewForm(true)}>+ Nový cieľ</button>
          )}
        </div>

        {remaining < -0.005 && (
          <div className="split-remaining">
            ⚠ Presah o <strong>{Math.abs(remaining).toFixed(2)} €</strong> nad dostupné sporenie
          </div>
        )}

        <div className="split-actions">
          <button className="split-cancel-btn" onClick={onCancel}>Zrušiť</button>
          <button className="split-confirm-btn" disabled={!hasAny || remaining < -0.005} onClick={handleConfirm}>
            Priradiť
          </button>
        </div>
      </div>
    </div>
  );
}
