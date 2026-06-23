import { useState } from 'react';

export default function WithdrawFromGoalModal({ transaction, maxAmount, goals, existingWithdrawals, onConfirm, onCancel }) {
  const goalsWithBalance = goals.map(g => {
    const allocated = (g.allocations || []).reduce((s, a) => s + a.amount, 0);
    const withdrawn  = (g.withdrawals  || []).reduce((s, w) => s + w.amount, 0);
    return { ...g, net: parseFloat((allocated - withdrawn).toFixed(2)) };
  });

  // Goals visible in modal: those with existing withdrawal OR positive net balance
  const visibleGoals = goalsWithBalance.filter(g => {
    const hasExisting = existingWithdrawals.some(w => w.goalId === g.id);
    return hasExisting || g.net > 0.005;
  });

  const [selections, setSelections] = useState(() => {
    const init = {};
    visibleGoals.forEach(g => {
      const existing = existingWithdrawals.find(w => w.goalId === g.id);
      init[g.id] = existing
        ? { selected: true,  amount: existing.amount.toFixed(2), withdrawalId: existing.withdrawalId }
        : { selected: false, amount: '', withdrawalId: null };
    });
    return init;
  });

  const toggle = id => setSelections(p => ({ ...p, [id]: { ...p[id], selected: !p[id].selected } }));
  const setAmt  = (id, v) => setSelections(p => ({ ...p, [id]: { ...p[id], amount: v } }));

  const totalSelected = visibleGoals
    .filter(g => selections[g.id]?.selected)
    .reduce((s, g) => s + (parseFloat(selections[g.id].amount) || 0), 0);

  const overMax     = totalSelected > maxAmount + 0.005;
  const exceedsGoal = visibleGoals.some(g => {
    const sel = selections[g.id];
    if (!sel?.selected) return false;
    const amt    = parseFloat(sel.amount) || 0;
    const hasEx  = existingWithdrawals.some(w => w.goalId === g.id);
    // Net available = goal net + already withdrawn by this tx (since those are counted in net)
    const exAmt  = existingWithdrawals.find(w => w.goalId === g.id)?.amount || 0;
    const avail  = g.net + (hasEx ? exAmt : 0);
    return amt > avail + 0.005;
  });

  const hasAny    = visibleGoals.some(g => selections[g.id]?.selected);
  const hasChange = existingWithdrawals.length > 0 || hasAny;

  const handleConfirm = () => {
    const updates = [], deletes = [], adds = [];
    visibleGoals.forEach(g => {
      const sel      = selections[g.id];
      const existing = existingWithdrawals.find(w => w.goalId === g.id);
      if (existing) {
        if (!sel.selected) {
          deletes.push({ goalId: g.id, withdrawalId: existing.withdrawalId });
        } else {
          const newAmt = parseFloat(sel.amount) || 0;
          if (Math.abs(newAmt - existing.amount) > 0.005) {
            updates.push({ goalId: g.id, withdrawalId: existing.withdrawalId, amount: newAmt });
          }
        }
      } else if (sel.selected) {
        const newAmt = parseFloat(sel.amount) || 0;
        if (newAmt > 0) adds.push({ goalId: g.id, amount: newAmt });
      }
    });
    onConfirm({ updates, deletes, adds }, { store: transaction.store, date: transaction.date });
  };

  return (
    <div className="split-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="split-sheet">
        <div className="split-handle" />
        <div className="split-tx-info">
          <span className="split-tx-store">{transaction.store}</span>
          <span className="split-tx-amount" style={{ color: '#22c55e' }}>↩ {maxAmount.toFixed(2)} €</span>
        </div>

        {visibleGoals.length === 0 ? (
          <p className="stg-no-goals">Žiadne ciele so zostatkom na výber.</p>
        ) : (
          <div className="stg-goals-list">
            {visibleGoals.map(g => {
              const sel      = selections[g.id];
              if (!sel) return null;
              const existing = existingWithdrawals.find(w => w.goalId === g.id);
              const exAmt    = existing?.amount || 0;
              const avail    = parseFloat((g.net + (existing ? exAmt : 0)).toFixed(2));
              const amt      = parseFloat(sel.amount) || 0;
              const overGoal = sel.selected && amt > avail + 0.005;
              return (
                <div key={g.id} className={`stg-goal-row${sel.selected ? ' stg-goal-row--active' : ''}`}>
                  <label className="stg-goal-label">
                    <input type="checkbox" checked={sel.selected} onChange={() => toggle(g.id)} />
                    <span className="stg-goal-name">{g.name}</span>
                    <span className="stg-goal-meta" style={{ color: '#22c55e' }}>max {avail.toFixed(2)} €</span>
                  </label>
                  {sel.selected && (
                    <div className="goal-amount-row stg-amount-row">
                      <input
                        className={`goal-input${overGoal ? ' goal-input--error' : ''}`}
                        type="number" step="0.01" placeholder="Suma"
                        value={sel.amount} onChange={e => setAmt(g.id, e.target.value)} autoFocus
                      />
                      <span className="goal-eur">€</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {overMax    && <div className="split-remaining">⚠ Presah o <strong>{(totalSelected - maxAmount).toFixed(2)} €</strong> nad sumu transakcie</div>}
        {exceedsGoal && <div className="split-remaining">⚠ Suma presahuje zostatok cieľa</div>}

        <div className="split-actions">
          <button className="split-cancel-btn" onClick={onCancel}>Zrušiť</button>
          <button className="split-confirm-btn" disabled={!hasChange || overMax || exceedsGoal} onClick={handleConfirm}>
            Potvrdiť
          </button>
        </div>
      </div>
    </div>
  );
}
