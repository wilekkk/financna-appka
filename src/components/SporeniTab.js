import { useState } from 'react';
import GoalCard from './GoalCard';
import GoalForm from './GoalForm';

export default function SporeniTab({ goals, totalSaved, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);

  const openAdd  = () => { setEditGoal(null); setShowForm(true); };
  const openEdit = g  => { setEditGoal(g);    setShowForm(true); };
  const handleSave = data => {
    if (editGoal) onUpdate(editGoal.id, data);
    else          onAdd(data);
    setShowForm(false);
  };

  return (
    <div className="sporenie-tab">
      <div className="sporenie-total-card">
        <span className="stat-label">Nasporené v cieľoch</span>
        <span className="stat-value" style={{ color: '#3b82f6' }}>+{totalSaved.toFixed(2)} €</span>
      </div>

      {goals.length === 0 && (
        <p className="sporenie-empty">Zatiaľ žiadne ciele. Pridaj prvý!</p>
      )}

      <div className="goals-list">
        {goals.map(g => (
          <GoalCard key={g.id} goal={g} onEdit={() => openEdit(g)} onDelete={() => onDelete(g.id)} />
        ))}
      </div>

      <button className="add-goal-btn" onClick={openAdd}>+ Pridať cieľ</button>

      {showForm && <GoalForm goal={editGoal} onSave={handleSave} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
