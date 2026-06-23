import { useState } from 'react';

export default function GoalCard({ goal, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const allocated = (goal.allocations || []).reduce((s, a) => s + a.amount, 0);
  const withdrawn = (goal.withdrawals  || []).reduce((s, w) => s + w.amount, 0);
  const net       = Math.max(0, allocated - withdrawn);
  const pct = goal.targetAmount ? Math.min(100, (net / goal.targetAmount) * 100) : null;

  return (
    <div className="goal-card">
      <div className="goal-card-top">
        <span className="goal-name">{goal.name}</span>
        <div className="goal-actions">
          {confirmDelete ? (
            <>
              <span className="goal-confirm-label">Vymazať?</span>
              <button className="tx-confirm-yes" onClick={onDelete}>Áno</button>
              <button className="tx-confirm-no" onClick={() => setConfirmDelete(false)}>Nie</button>
            </>
          ) : (
            <>
              <button className="goal-edit-btn" onClick={onEdit}>✏️</button>
              <button className="tx-delete-btn" onClick={() => setConfirmDelete(true)}>×</button>
            </>
          )}
        </div>
      </div>

      {goal.targetAmount != null ? (
        <>
          <div className="goal-progress-bar">
            <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="goal-progress-label">
            <span className="goal-progress-allocated">{net.toFixed(2)} € nasporené</span>
            <span className="goal-progress-remaining">
              {pct >= 100
                ? '✓ Splnené'
                : `zostatok ${(goal.targetAmount - net).toFixed(2)} € z ${goal.targetAmount.toFixed(2)} €`}
            </span>
          </div>
          {withdrawn > 0 && (
            <div className="goal-withdrawn-label">↩ vybraných {withdrawn.toFixed(2)} €</div>
          )}
        </>
      ) : (
        <div className="goal-progress-label">
          <span className="goal-progress-allocated">{net.toFixed(2)} € nasporené</span>
          {withdrawn > 0 && <span className="goal-progress-remaining">↩ vybraných {withdrawn.toFixed(2)} €</span>}
        </div>
      )}
    </div>
  );
}
