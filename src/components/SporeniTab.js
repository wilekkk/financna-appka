import { useState } from 'react';
import GoalCard from './GoalCard';
import GoalForm from './GoalForm';
import TransferGoalModal from './TransferGoalModal';

export default function SporeniTab({ goals, totalSaved, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [transferFrom, setTransferFrom] = useState(null);

  const activeGoals   = goals.filter(g => !g.archived);
  const archivedGoals = goals.filter(g => g.archived);

  const openAdd  = () => { setEditGoal(null); setShowForm(true); };
  const openEdit = g  => { setEditGoal(g);    setShowForm(true); };

  const handleSave = data => {
    if (editGoal) onUpdate(editGoal.id, data);
    else          onAdd(data);
    setShowForm(false);
  };

  const netOf = g => (g.allocations || []).reduce((s, a) => s + a.amount, 0)
                   - (g.withdrawals  || []).reduce((s, w) => s + w.amount, 0);

  const handleTransfer = (toId, amount) => {
    const from = transferFrom;
    const to   = goals.find(g => g.id === toId);
    const id   = Date.now();
    onUpdate(from.id, { withdrawals: [...(from.withdrawals || []), { id, transfer: true, toGoalId: to.id, amount }] });
    onUpdate(to.id,   { allocations: [...(to.allocations   || []), { id, transfer: true, fromGoalId: from.id, amount }] });
    setTransferFrom(null);
  };

  return (
    <div className="sporenie-tab">
      <div className="sporenie-total-card">
        <span className="stat-label">Nasporené v cieľoch</span>
        <span className="stat-value" style={{ color: '#4C7DFF' }}>+{totalSaved.toFixed(2)} €</span>
      </div>

      {activeGoals.length === 0 && (
        <p className="sporenie-empty">Zatiaľ žiadne ciele. Pridaj prvý!</p>
      )}

      <div className="goals-list">
        {activeGoals.map(g => (
          <GoalCard key={g.id} goal={g} goals={goals} onEdit={() => openEdit(g)} onDelete={() => onDelete(g.id)}
            onArchive={() => onUpdate(g.id, { archived: true })}
            onTransfer={activeGoals.length > 1 && netOf(g) > 0.005 ? () => setTransferFrom(g) : null} />
        ))}
      </div>

      {transferFrom && (
        <TransferGoalModal fromGoal={transferFrom} available={netOf(transferFrom)} goals={activeGoals}
          onConfirm={handleTransfer} onCancel={() => setTransferFrom(null)} />
      )}

      <button className="add-goal-btn" onClick={openAdd}>+ Pridať cieľ</button>

      {archivedGoals.length > 0 && (
        <details className="goals-archived">
          <summary>Ukončené ciele ({archivedGoals.length})</summary>
          <div className="goals-list">
            {archivedGoals.map(g => (
              <GoalCard key={g.id} goal={g} goals={goals} onDelete={() => onDelete(g.id)}
                onRestore={() => onUpdate(g.id, { archived: false })} />
            ))}
          </div>
        </details>
      )}

      {showForm && <GoalForm goal={editGoal} onSave={handleSave} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
