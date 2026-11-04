import { ChevronDown, ArrowLeftRight, Pencil, Check, Trash2, RotateCcw } from 'lucide-react';
import { formatMoney, formatPercent } from '../utils/format';
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
    label: a.initial ? 'Počiatočný stav' : a.transfer ? `Presun z „${nameOf(a.fromGoalId)}“` : a.store,
  }));
  const outs = (goal.withdrawals || []).map(w => ({
    ...w, sign: -1,
    label: w.transfer ? `Presun do „${nameOf(w.toGoalId)}“` : `Výber: ${w.store}`,
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

  const movements = open ? buildMovements(goal, goals) : [];

  return (
    <div className={`goal-row${goal.archived ? ' goal-row--archived' : ''}`}>
      <button className="goal-row-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="goal-row-top">
          <span className="goal-row-name">{goal.name}</span>
          {pct !== null && <span className="goal-row-pct">{pct >= 100 ? 'Splnené' : `${formatPercent(pct)} %`}</span>}
          <ChevronDown size={16} className={`goal-row-chevron${open ? ' is-open' : ''}`} />
        </span>
        {pct !== null && (
          <span className="goal-track"><span className="goal-fill" style={{ width: `${pct}%` }} /></span>
        )}
        <span className="goal-row-bottom">
          <span className="goal-row-amount">{formatMoney(net)}</span>
          {goal.targetAmount != null && <span>z {formatMoney(goal.targetAmount)}</span>}
        </span>
        {withdrawn > 0 && <span className="goal-row-note">Vybrané zo sporenia {formatMoney(withdrawn)}</span>}
      </button>

      {open && (
        <div className="goal-row-detail">
          {confirm === 'delete' ? (
            <div className="tx-confirm">
              <span className="tx-confirm-label">Vymazať cieľ aj zo všetkých mesiacov?</span>
              <button className="tx-confirm-yes" onClick={onDelete}>Áno</button>
              <button className="tx-confirm-no" onClick={() => setConfirm(null)}>Nie</button>
            </div>
          ) : confirm === 'blocked' ? (
            <div className="tx-confirm">
              <span className="tx-confirm-label">V cieli je ešte {formatMoney(net)}. Najprv ich presuň do iného cieľa alebo vyber zo sporenia.</span>
              <button className="tx-confirm-no" onClick={() => setConfirm(null)}>OK</button>
            </div>
          ) : (
            <div className="goal-row-actions">
              {goal.archived ? (
                <button className="text-btn text-btn--icon" onClick={onRestore}><RotateCcw size={15} />Obnoviť</button>
              ) : (
                <>
                  {onTransfer && <button className="text-btn text-btn--icon" onClick={onTransfer}><ArrowLeftRight size={15} />Presunúť</button>}
                  <button className="text-btn text-btn--icon" onClick={onEdit}><Pencil size={15} />Upraviť</button>
                  <button className="text-btn text-btn--icon" onClick={handleArchive}><Check size={15} />Ukončiť</button>
                </>
              )}
              <button className="text-btn text-btn--icon text-btn--danger" onClick={() => setConfirm('delete')}><Trash2 size={15} />Vymazať</button>
            </div>
          )}

          <ul className="goal-movements">
            {movements.map(m => (
              <li key={`${m.sign}-${m.id}`} className="goal-movement">
                <span className="goal-movement-date">{formatDate(m)}</span>
                <span className="goal-movement-label">{m.label}</span>
                <span className={`goal-movement-amount ${m.sign < 0 ? 'is-negative' : 'is-positive'}`}>
                  {formatMoney(m.sign * m.amount, { sign: true })}
                </span>
              </li>
            ))}
            {movements.length === 0 && <li className="goal-movement">Zatiaľ žiadne pohyby.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
