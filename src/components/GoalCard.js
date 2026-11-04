import { X, Pencil, Check } from 'lucide-react';
import { useState } from 'react';

const sortKey = m => {
  if (m.initial) return -1;
  if (m.transfer) return Number(String(new Date(m.id).toISOString().slice(0, 10)).replace(/-/g, ''));
  const [d, mo, y] = (m.date || '').split('.');
  return y ? Number(y + mo.padStart(2, '0') + d.padStart(2, '0')) : 0;
};

const formatDate = m => {
  if (m.transfer) return new Date(m.id).toLocaleDateString('sk-SK');
  return m.date || '';
};

function buildMovements(goal, goals) {
  const nameOf = id => goals.find(g => g.id === id)?.name ?? 'zmazaný cieľ';
  const ins = (goal.allocations || []).map(a => ({
    ...a, sign: 1,
    label: a.initial ? 'Počiatočný stav' : a.transfer ? `⇄ z „${nameOf(a.fromGoalId)}“` : a.store,
  }));
  const outs = (goal.withdrawals || []).map(w => ({
    ...w, sign: -1,
    label: w.transfer ? `⇄ do „${nameOf(w.toGoalId)}“` : `↩ ${w.store}`,
  }));
  return [...ins, ...outs].sort((a, b) => sortKey(b) - sortKey(a));
}

export default function GoalCard({ goal, goals = [], onEdit, onDelete, onTransfer, onArchive, onRestore }) {
  const [confirm, setConfirm] = useState(null);
  const [open, setOpen] = useState(false);
  const allocated = (goal.allocations || []).reduce((s, a) => s + a.amount, 0);
  const allOut    = (goal.withdrawals  || []).reduce((s, w) => s + w.amount, 0);
  const withdrawn = (goal.withdrawals  || []).filter(w => !w.transfer).reduce((s, w) => s + w.amount, 0);
  const net       = Math.max(0, allocated - allOut);
  const pct = goal.targetAmount ? Math.min(100, (net / goal.targetAmount) * 100) : null;

  const handleArchive = () => {
    if (net > 0.005) setConfirm('blocked');
    else onArchive();
  };

  return (
    <div className={`goal-card${goal.archived ? ' goal-card--archived' : ''}`}>
      <div className="goal-card-top">
        <button className="goal-toggle" onClick={() => setOpen(o => !o)}>
          <span className="goal-toggle-arrow">{open ? '▾' : '▸'}</span>
          <span className="goal-name">{goal.name}</span>
        </button>
        <div className="goal-actions">
          {confirm === 'delete' ? (
            <>
              <span className="goal-confirm-label">Vymazať aj zo všetkých mesiacov?</span>
              <button className="tx-confirm-yes" onClick={onDelete}>Áno</button>
              <button className="tx-confirm-no" onClick={() => setConfirm(null)}>Nie</button>
            </>
          ) : goal.archived ? (
            <>
              <button className="goal-edit-btn" onClick={onRestore} title="Obnoviť cieľ">↺</button>
              <button className="tx-delete-btn" onClick={() => setConfirm('delete')}><X size={16} /></button>
            </>
          ) : (
            <>
              {onTransfer && <button className="goal-edit-btn" onClick={onTransfer} title="Presunúť do iného cieľa">⇄</button>}
              <button className="goal-edit-btn" onClick={onEdit} aria-label="Upraviť cieľ"><Pencil size={16} /></button>
              <button className="goal-edit-btn" onClick={handleArchive} title="Ukončiť cieľ" aria-label="Ukončiť cieľ"><Check size={16} /></button>
              <button className="tx-delete-btn" onClick={() => setConfirm('delete')}><X size={16} /></button>
            </>
          )}
        </div>
      </div>

      {confirm === 'blocked' && (
        <div className="goal-withdrawn-label">
          V cieli je ešte {net.toFixed(2)} €. Najprv ich presuň cez ⇄ alebo vyber zo sporenia.{' '}
          <button className="tx-confirm-no" onClick={() => setConfirm(null)}>OK</button>
        </div>
      )}

      {goal.targetAmount != null ? (
        <>
          <div className="goal-progress-bar">
            <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="goal-progress-label">
            <span className="goal-progress-allocated">{net.toFixed(2)} € nasporené</span>
            <span className="goal-progress-remaining">
              {pct >= 100
                ? 'Splnené'
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

      {open && (
        <ul className="goal-movements">
          {buildMovements(goal, goals).map(m => (
            <li key={`${m.sign}-${m.id}`} className="goal-movement">
              <span className="goal-movement-date">{formatDate(m)}</span>
              <span className="goal-movement-label">{m.label}</span>
              <span className={`goal-movement-amount${m.sign < 0 ? ' goal-movement-amount--out' : ''}`}>
                {m.sign > 0 ? '+' : '−'}{m.amount.toFixed(2)} €
              </span>
            </li>
          ))}
          {buildMovements(goal, goals).length === 0 && <li className="goal-movement">Zatiaľ žiadne pohyby.</li>}
        </ul>
      )}
    </div>
  );
}
