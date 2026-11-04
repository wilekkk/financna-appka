import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { formatMoney, formatPercent } from '../utils/format';
import Money from './Money';
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

  const targeted   = activeGoals.filter(g => g.targetAmount != null);
  const targetSum  = targeted.reduce((sum, g) => sum + g.targetAmount, 0);
  const targetSaved = targeted.reduce((sum, g) => sum + Math.max(0, netOf(g)), 0);

  return (
    <div className="sporenie-tab">
      <section className="hero">
        <div className="hero-label">Nasporené spolu</div>
        <div className="hero-value"><Money value={totalSaved} /></div>
        {targetSum > 0 && (
          <div className="hero-delta hero-delta--muted">
            z cieľov {formatMoney(targetSum)} ({formatPercent(Math.min(100, (targetSaved / targetSum) * 100))} %)
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Aktívne ciele</h2>
          <button className="text-btn text-btn--icon" onClick={openAdd}><Plus size={16} />Nový cieľ</button>
        </div>
        {activeGoals.length === 0 && (
          <p className="section-empty">Zatiaľ žiadne ciele. Pridaj prvý cez Nový cieľ.</p>
        )}
        {activeGoals.map(g => (
          <GoalCard key={g.id} goal={g} goals={goals} onEdit={() => openEdit(g)} onDelete={() => onDelete(g.id)}
            onArchive={() => onUpdate(g.id, { archived: true })}
            onTransfer={activeGoals.length > 1 && netOf(g) > 0.005 ? () => setTransferFrom(g) : null} />
        ))}
      </section>

      {transferFrom && (
        <TransferGoalModal fromGoal={transferFrom} available={netOf(transferFrom)} goals={activeGoals}
          onConfirm={handleTransfer} onCancel={() => setTransferFrom(null)} />
      )}

      {archivedGoals.length > 0 && (
        <details className="goals-archived">
          <summary>
            <span>Ukončené ciele ({archivedGoals.length})</span>
            <ChevronDown size={16} className="goals-archived-chevron" />
          </summary>
          {archivedGoals.map(g => (
            <GoalCard key={g.id} goal={g} goals={goals} onDelete={() => onDelete(g.id)}
              onRestore={() => onUpdate(g.id, { archived: false })} />
          ))}
        </details>
      )}

      {showForm && <GoalForm goal={editGoal} onSave={handleSave} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
