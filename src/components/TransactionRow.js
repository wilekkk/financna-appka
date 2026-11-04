import { X, TriangleAlert, Target, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { CATS } from '../constants';
import { getRemainingAmount } from '../utils/finance';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';
import SaveToGoalModal from './SaveToGoalModal';
import WithdrawFromGoalModal from './WithdrawFromGoalModal';

function getBubbleAmounts(item) {
  const abs = getRemainingAmount(item);
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

function EditableBubble({ value, color, onChange }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('');

  const start   = e => { e.stopPropagation(); setInput(value.toFixed(2)); setEditing(true); };
  const confirm = () => { onChange(Math.max(0, parseFloat(input.replace(',', '.')) || 0)); setEditing(false); };

  if (editing) {
    return (
      <span className="bubble-editing" style={{ '--tag-color': color }}>
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
    <span className="summary-tag" style={{ '--tag-color': color, cursor: 'pointer' }} onClick={start}>
      {formatMoney(value)}
    </span>
  );
}

export default function TransactionRow({ item, showDate, editMode, savingsGoals, customCategories, onUpdateAmounts, onUpdateAmount, onDelete, onAllocateToGoal, onAddGoal, onWithdrawalsChanged, onAssignSubcategory, onClearPair, onUndoClear }) {
  const [confirmDelete, setConfirmDelete]         = useState(false);
  const [editingAmount, setEditingAmount]         = useState(false);
  const [amountInput, setAmountInput]             = useState('');
  const [showGoalModal, setShowGoalModal]         = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSubcategoryMenu, setShowSubcategoryMenu] = useState(false);
  const isCredit   = item._type === 'credit';
  const originalAbs = Math.abs(item.transaction.amount);
  const abs        = getRemainingAmount(item);
  const clearings  = Array.isArray(item.clearing) ? item.clearing : item.clearing ? [item.clearing] : [];
  const isCleared  = clearings.length > 0;
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
  const goalsHaveBalance      = savingsGoals.some(g => {
    const net = (g.allocations || []).reduce((s, a) => s + a.amount, 0)
              - (g.withdrawals  || []).reduce((s, w) => s + w.amount, 0);
    return net > 0.005;
  });
  const showWithdrawBtn = isCredit && (txWithdrawals.length > 0 || goalsHaveBalance);
  const subcategories = customCategories.filter(category => category.type === (isCredit ? 'income' : 'expense'));
  const assignedSubcategory = item.subcategory;

  const catParts = amounts
    ? bubbleCats.filter(c => amounts[c.key] > 0.005).map(c => ({ ...c, pct: abs > 0 ? (amounts[c.key] / abs) * 100 : 0 }))
    : [];
  const amountColor = isCredit ? 'var(--positive)' : 'var(--negative)';

  return (
    <div
      className={`tx-item${editMode && !isValid ? ' tx-item--invalid' : ''}`}
      draggable={editMode && abs > 0.005}
      onDragStart={e => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: item._type, idx: item._idx }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={e => { if (editMode && abs > 0.005) e.preventDefault(); }}
      onDrop={e => {
        e.preventDefault();
        if (!editMode || abs <= 0.005) return;
        try {
          const source = JSON.parse(e.dataTransfer.getData('application/json'));
          onClearPair(source, { type: item._type, idx: item._idx });
        } catch {
          // Ignore drops that did not originate from a transaction row.
        }
      }}
    >
      <div className="tx-item-main">
        {editMode && (
          <button className="tx-item-delete" onClick={() => setConfirmDelete(c => !c)} aria-label="Vymazať transakciu"><X size={16} /></button>
        )}
        <div className="tx-item-info">
          <div className="tx-item-name">{item.transaction.store}</div>
          <div className="tx-item-meta">
            {showDate && <span>{item.transaction.date}</span>}
            {isCredit
              ? <span>Príjem</span>
              : catParts.map(c => (
                <span key={c.key} className="tx-item-cat" style={{ color: c.color }}>
                  <span className="cat-swatch" style={{ background: c.color }} />
                  {c.label}{catParts.length > 1 ? ` ${formatPercent(c.pct)} %` : ''}
                </span>
              ))}
            <span className="tx-subcategory-menu">
              <button
                className={`tx-item-sub${assignedSubcategory ? '' : ' tx-item-sub--empty'}`}
                onClick={() => setShowSubcategoryMenu(open => !open)}
                disabled={subcategories.length === 0}
                title={subcategories.length === 0 ? 'Najprv pridaj podkategóriu v Nastaveniach' : assignedSubcategory ? 'Zmeniť podkategóriu' : 'Priradiť podkategóriu'}
              >
                {assignedSubcategory ? assignedSubcategory.name : '+ Podkategória'}
              </button>
              {showSubcategoryMenu && subcategories.length > 0 && (
                <span className="tx-subcategory-dropdown">
                  {subcategories.map(category => (
                    <button
                      key={category.id}
                      className="tx-subcategory-option"
                      onClick={() => {
                        onAssignSubcategory(item._type, item._idx, category);
                        setShowSubcategoryMenu(false);
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                  {assignedSubcategory && (
                    <button
                      className="tx-subcategory-option tx-subcategory-option--remove"
                      onClick={() => {
                        onAssignSubcategory(item._type, item._idx, null);
                        setShowSubcategoryMenu(false);
                      }}
                    >
                      Zrušiť priradenie
                    </button>
                  )}
                </span>
              )}
            </span>
          </div>
        </div>
        {editMode && editingAmount ? (
          <span className="amount-editing" style={{ color: amountColor }}>
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
            className={`tx-item-amount${editMode && !isCleared ? ' tx-amount--editable' : ''}`}
            style={{ color: amountColor }}
            onClick={editMode && !isCleared ? () => { setAmountInput(abs.toFixed(2)); setEditingAmount(true); } : undefined}
          >
            {formatMoney(isCredit ? abs : -abs, { sign: isCredit })}
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

      {editMode && !isCredit && !confirmDelete && (
        <div className="tx-item-extra tx-bubbles-area">
          {bubbleCats.map(c => (
            <EditableBubble key={c.key} value={amounts[c.key]} color={c.color}
              onChange={val => onUpdateAmounts(item._idx, { ...amounts, [c.key]: val }, abs)}
            />
          ))}
        </div>
      )}

      {editMode && !isValid && !confirmDelete && (
        <p className="tx-validation-warn"><TriangleAlert size={12} className="inline-icon" />Súčet {formatNumber(sum)} z {formatMoney(abs)}</p>
      )}

      {isCleared && !confirmDelete && (
        <div className="tx-item-extra">
          {clearings.map(clearing => (
            <span className="tx-item-note" key={clearing.id}>
              Vyrovnané s {clearing.with || 'inou platbou'}, {formatMoney(clearing.amount)}
              <button className="text-btn" onClick={() => onUndoClear(clearing.id)}>Vrátiť</button>
            </span>
          ))}
          <span className="tx-item-note">Zostáva {formatMoney(abs)} z {formatMoney(originalAbs)}</span>
        </div>
      )}

      {showGoalBtn && !confirmDelete && (
        <div className="tx-item-extra">
          {txAllocations.map((a, i) => (
            <span key={i} className="tx-item-note"><Target size={13} className="inline-icon" />{a.goalName} {formatMoney(a.amount)}</span>
          ))}
          {(txAllocations.length === 0 || canAllocateMore) && (
            <button className="tx-item-action" onClick={() => setShowGoalModal(true)}>
              <Target size={13} />{txAllocations.length === 0 ? 'Priradiť k cieľu sporenia' : 'Priradiť zvyšok'}
            </button>
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
        <div className="tx-item-extra">
          {txWithdrawals.map(w => (
            <span key={w.withdrawalId} className="tx-item-note"><Undo2 size={13} className="inline-icon" />Výber z cieľa {w.goalName} {formatMoney(w.amount)}</span>
          ))}
          <button className="tx-item-action" onClick={() => setShowWithdrawModal(true)}>
            <Undo2 size={13} />{txWithdrawals.length > 0 ? 'Upraviť výber zo sporenia' : 'Výber zo sporenia'}
          </button>
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
