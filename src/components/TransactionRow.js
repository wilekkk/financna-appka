import { useState } from 'react';
import { CATS, CAT_MAP } from '../constants';
import SaveToGoalModal from './SaveToGoalModal';
import WithdrawFromGoalModal from './WithdrawFromGoalModal';

function getBubbleAmounts(item) {
  const abs = Math.abs(item.transaction.amount);
  if (item.category === 'split') {
    return {
      needs:   (abs * (item.splits.needs   || 0)) / 100,
      wants:   (abs * (item.splits.wants   || 0)) / 100,
      savings: (abs * (item.splits.savings || 0)) / 100,
    };
  }
  return {
    needs:   item.category === 'needs'   ? abs : 0,
    wants:   item.category === 'wants'   ? abs : 0,
    savings: item.category === 'savings' ? abs : 0,
  };
}

function EditableBubble({ value, color, emoji, onChange }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('');

  const start   = e => { e.stopPropagation(); setInput(value.toFixed(2)); setEditing(true); };
  const confirm = () => { onChange(Math.max(0, parseFloat(input.replace(',', '.')) || 0)); setEditing(false); };

  if (editing) {
    return (
      <span className="bubble-editing" style={{ background: color }}>
        <input className="bubble-input" type="number" step="0.01" value={input}
          onChange={e => setInput(e.target.value)}
          onBlur={confirm}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus onClick={e => e.stopPropagation()}
        />€
      </span>
    );
  }
  return (
    <span className="summary-tag" style={{ background: color, cursor: 'pointer' }} onClick={start}>
      {emoji} {value.toFixed(2)} €
    </span>
  );
}

export default function TransactionRow({ item, editMode, savingsGoals, onUpdateAmounts, onUpdateAmount, onDelete, onAllocateToGoal, onAddGoal, onWithdrawalsChanged }) {
  const [confirmDelete, setConfirmDelete]         = useState(false);
  const [editingAmount, setEditingAmount]         = useState(false);
  const [amountInput, setAmountInput]             = useState('');
  const [showGoalModal, setShowGoalModal]         = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const isCredit   = item._type === 'credit';
  const abs        = Math.abs(item.transaction.amount);
  const bubbleCats = CATS.filter(c => c.key !== 'prijem');
  const amounts    = isCredit ? null : getBubbleAmounts(item);
  const sum        = amounts ? amounts.needs + amounts.wants + amounts.savings : abs;
  const isValid    = Math.abs(sum - abs) < 0.005;
  const savingsAmt = amounts?.savings ?? 0;
  const showGoalBtn = savingsAmt > 0.005;

  const txAllocations = savingsGoals.flatMap(g =>
    (g.allocations || [])
      .filter(a => a.store === item.transaction.store && a.date === item.transaction.date)
      .map(a => ({ goalName: g.name, amount: a.amount }))
  );
  const totalAllocatedForTx = txAllocations.reduce((s, a) => s + a.amount, 0);
  const remainingForTx      = parseFloat((savingsAmt - totalAllocatedForTx).toFixed(2));
  const canAllocateMore     = remainingForTx > 0.005;

  // Withdrawal logic (credit transactions)
  const txWithdrawals = savingsGoals.flatMap(g =>
    (g.withdrawals || [])
      .filter(w => w.store === item.transaction.store && w.date === item.transaction.date)
      .map(w => ({ goalId: g.id, goalName: g.name, amount: w.amount, withdrawalId: w.id }))
  );
  const totalWithdrawnForTx = txWithdrawals.reduce((s, w) => s + w.amount, 0); // eslint-disable-line no-unused-vars
  const goalsHaveBalance      = savingsGoals.some(g => {
    const net = (g.allocations || []).reduce((s, a) => s + a.amount, 0)
              - (g.withdrawals  || []).reduce((s, w) => s + w.amount, 0);
    return net > 0.005;
  });
  const showWithdrawBtn = isCredit && (txWithdrawals.length > 0 || goalsHaveBalance);

  return (
    <div className={`tx-row${editMode && !isValid ? ' tx-row--invalid' : ''}`}>
      <div className="tx-row-top">
        {editMode && (
          <button className="tx-delete-btn" onClick={() => setConfirmDelete(c => !c)}>×</button>
        )}
        <span className="tx-store">{item.transaction.store}</span>
        {editMode && editingAmount ? (
          <span className="amount-editing" style={{ color: isCredit ? '#22c55e' : '#ef4444' }}>
            <input
              className="amount-input"
              type="number" step="0.01"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              onBlur={() => {
                const val = Math.max(0, parseFloat(amountInput.replace(',', '.')) || 0);
                onUpdateAmount(item._type, item._idx, val);
                setEditingAmount(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') e.target.blur();
                if (e.key === 'Escape') setEditingAmount(false);
              }}
              autoFocus onClick={e => e.stopPropagation()}
            />€
          </span>
        ) : (
          <span
            className={`tx-amount${editMode ? ' tx-amount--editable' : ''}`}
            style={{ color: isCredit ? '#22c55e' : '#ef4444' }}
            onClick={editMode ? () => { setAmountInput(Math.abs(item.transaction.amount).toFixed(2)); setEditingAmount(true); } : undefined}
          >
            {item.transaction.amount.toFixed(2)} €
          </span>
        )}
      </div>

      {editMode && confirmDelete && (
        <div className="tx-confirm">
          <span className="tx-confirm-label">Naozaj vymazať?</span>
          <button className="tx-confirm-yes" onClick={() => onDelete(item._type, item._idx)}>Áno</button>
          <button className="tx-confirm-no" onClick={() => setConfirmDelete(false)}>Nie</button>
        </div>
      )}

      {!confirmDelete && (
        <div className="tx-row-bottom">
          <span className="tx-date">{item.transaction.date}</span>
          {isCredit ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span className="summary-tag" style={{ background: CAT_MAP['prijem'].color, whiteSpace: 'nowrap' }}>
                {CAT_MAP['prijem'].emoji} {item.transaction.amount.toFixed(2)} €
              </span>
              {txWithdrawals.length > 0 && txWithdrawals.map((w) => (
                <span
                  key={w.withdrawalId}
                  className="tx-withdraw-tag tx-withdraw-tag--clickable"
                  onClick={() => setShowWithdrawModal(true)}
                >
                  ↩ {w.goalName} · {w.amount.toFixed(2)} €
                </span>
              ))}
            </div>
          ) : editMode ? (
            <div className="tx-bubbles-area">
              {bubbleCats.map(c => (
                <EditableBubble key={c.key} value={amounts[c.key]} color={c.color} emoji={c.emoji}
                  onChange={val => onUpdateAmounts(item._idx, { ...amounts, [c.key]: val }, abs)}
                />
              ))}
            </div>
          ) : (
            <div className="tx-tags">
              {bubbleCats.filter(c => amounts[c.key] > 0.005).map(c => (
                <span key={c.key} className="summary-tag" style={{ background: c.color, whiteSpace: 'nowrap' }}>
                  {c.emoji} {amounts[c.key].toFixed(2)} €
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {editMode && !isValid && !confirmDelete && (
        <p className="tx-validation-warn">⚠ Súčet: {sum.toFixed(2)} € / {abs.toFixed(2)} €</p>
      )}

      {showGoalBtn && !confirmDelete && (
        <div className="tx-goal-row">
          {txAllocations.length > 0 ? (
            <div className="tx-alloc-list">
              {txAllocations.map((a, i) => (
                <span key={i} className="tx-alloc-tag">💰 {a.goalName} · {a.amount.toFixed(2)} €</span>
              ))}
              {canAllocateMore && (
                <button className="goal-alloc-btn" onClick={() => setShowGoalModal(true)} title="Pridať ďalší cieľ">+</button>
              )}
            </div>
          ) : (
            <>
              <button className="goal-alloc-btn" onClick={() => setShowGoalModal(true)}>+</button>
              <span className="tx-goal-label">Priradiť k cieľu sporenia</span>
            </>
          )}
        </div>
      )}

      {showGoalModal && (
        <SaveToGoalModal
          transaction={item.transaction}
          savingsAmount={remainingForTx}
          goals={savingsGoals}
          onConfirm={(allocs, txRef) => { onAllocateToGoal(allocs, txRef); setShowGoalModal(false); }}
          onCancel={() => setShowGoalModal(false)}
          onAddGoal={onAddGoal}
        />
      )}

      {showWithdrawBtn && !confirmDelete && (
        <div className="tx-goal-row">
          {txWithdrawals.length > 0 ? (
            <div className="tx-alloc-list">
              <button className="withdraw-alloc-btn" onClick={() => setShowWithdrawModal(true)}>↩</button>
            </div>
          ) : (
            <>
              <button className="withdraw-alloc-btn" onClick={() => setShowWithdrawModal(true)}>↩</button>
              <span className="tx-goal-label">Výber zo sporenia</span>
            </>
          )}
        </div>
      )}

      {showWithdrawModal && (
        <WithdrawFromGoalModal
          transaction={item.transaction}
          maxAmount={abs}
          goals={savingsGoals}
          existingWithdrawals={txWithdrawals}
          onConfirm={(diff, txRef) => { onWithdrawalsChanged(diff, txRef); setShowWithdrawModal(false); }}
          onCancel={() => setShowWithdrawModal(false)}
        />
      )}
    </div>
  );
}
