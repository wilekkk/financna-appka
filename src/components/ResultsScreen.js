import { useState } from 'react';
import TransactionTable from './TransactionTable';
import DashboardTab from './DashboardTab';
import { getRemainingAmount } from '../utils/finance';
import AddTransactionModal from './AddTransactionModal';

export default function ResultsScreen({ month, history, creditHistory, savingsGoals, customCategories, selectedSubcategory, onSelectSubcategory, onClearSubcategory, onUpdateHistory, onUpdateCreditHistory, onUpdateGoal, onAddGoal, onAddMore, onReset, onBack }) {
  const [tab, setTab]                         = useState(selectedSubcategory ? 'table' : 'dashboard');
  const [editMode, setEditMode]               = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  const handleAddTransaction = item => {
    if (item.category === 'prijem') onUpdateCreditHistory([...creditHistory, item]);
    else onUpdateHistory([...history, item]);
    setShowAddTransaction(false);
  };

  const handleUpdateAmounts = (idx, newAmounts, total) => {
    const pct = v => total > 0 ? parseFloat(((v / total) * 100).toFixed(4)) : 0;
    onUpdateHistory(history.map((item, i) =>
      i !== idx ? item : { ...item, category: 'split', splits: { needs: pct(newAmounts.needs), wants: pct(newAmounts.wants), savings: pct(newAmounts.savings) } }
    ));
  };

  const handleDelete = (type, idx) => {
    const item = type === 'debit' ? history[idx] : creditHistory[idx];
    const removeClearing = items => items.map(entry =>
      entry.clearing?.some?.(clearing => item?.clearing?.some(itemClearing => itemClearing.id === clearing.id))
        ? { ...entry, clearing: entry.clearing.filter(clearing => !item.clearing.some(itemClearing => itemClearing.id === clearing.id)) }
        : entry
    );
    if (type === 'debit') {
      onUpdateHistory(history.filter((_, i) => i !== idx));
      if (item?.clearing) onUpdateCreditHistory(removeClearing(creditHistory));
    } else {
      onUpdateCreditHistory(creditHistory.filter((_, i) => i !== idx));
      if (item?.clearing) onUpdateHistory(removeClearing(history));
    }
  };

  const handleClearPair = (source, target) => {
    if (!source || !target || source.type === target.type) return;
    const sourceItem = source.type === 'debit' ? history[source.idx] : creditHistory[source.idx];
    const targetItem = target.type === 'debit' ? history[target.idx] : creditHistory[target.idx];
    if (!sourceItem || !targetItem) return;
    const sourceAmount = getRemainingAmount(sourceItem);
    const targetAmount = getRemainingAmount(targetItem);
    const amount = Math.min(sourceAmount, targetAmount);
    if (amount <= 0.005) return;
    const clearingId = `${Date.now()}-${Math.random()}`;
    const sourceClearing = { id: clearingId, amount, with: targetItem.transaction.store };
    const targetClearing = { id: clearingId, amount, with: sourceItem.transaction.store };
    const appendClearing = (item, entry) => ({
      ...item,
      clearing: [...(Array.isArray(item.clearing) ? item.clearing : item.clearing ? [item.clearing] : []), entry],
    });
    const update = (items, type, ref, entry) => items.map((item, index) =>
      ref.type === type && ref.idx === index
        ? appendClearing(item, entry)
        : item
    );
    onUpdateHistory(update(
      update(history, 'debit', source, sourceClearing),
      'debit',
      target,
      targetClearing
    ));
    onUpdateCreditHistory(update(
      update(creditHistory, 'credit', source, sourceClearing),
      'credit',
      target,
      targetClearing
    ));
  };

  const handleUndoClear = clearingId => {
    const remove = items => items.map(item =>
      Array.isArray(item.clearing)
        ? { ...item, clearing: item.clearing.filter(clearing => clearing.id !== clearingId) }
        : item.clearing?.id === clearingId ? ({ ...item, clearing: undefined }) : item
    );
    onUpdateHistory(remove(history));
    onUpdateCreditHistory(remove(creditHistory));
  };

  const handleAllocateToGoal = (allocs, txRef) => {
    allocs.forEach(({ goalId, amount }) => {
      const goal = savingsGoals.find(g => g.id === goalId);
      if (!goal) return;
      onUpdateGoal(goalId, {
        allocations: [...(goal.allocations || []), { id: Date.now() + Math.random(), ...txRef, amount }],
      });
    });
  };

  const handleWithdrawalsChanged = ({ updates, deletes, adds }, txRef) => {
    const nextGoals = savingsGoals.map(g => {
      let w = [...(g.withdrawals || [])];
      deletes.filter(d => d.goalId === g.id).forEach(d => { w = w.filter(x => x.id !== d.withdrawalId); });
      updates.filter(u => u.goalId === g.id).forEach(u => { w = w.map(x => x.id === u.withdrawalId ? { ...x, amount: u.amount } : x); });
      adds.filter(a => a.goalId === g.id).forEach(a => { w = [...w, { id: Date.now() + Math.random(), ...txRef, amount: a.amount }]; });
      return { ...g, withdrawals: w };
    });

    const changedIds = new Set([...updates.map(u => u.goalId), ...deletes.map(d => d.goalId), ...adds.map(a => a.goalId)]);
    changedIds.forEach(goalId => {
      const ng = nextGoals.find(g => g.id === goalId);
      if (ng) onUpdateGoal(goalId, { withdrawals: ng.withdrawals });
    });

    onUpdateCreditHistory(creditHistory);
  };

  const handleUpdateAmount = (type, idx, newAbs) => {
    if (type === 'debit') {
      onUpdateHistory(history.map((item, i) =>
        i !== idx ? item : { ...item, transaction: { ...item.transaction, amount: -newAbs } }
      ));
    } else {
      onUpdateCreditHistory(creditHistory.map((item, i) =>
        i !== idx ? item : { ...item, transaction: { ...item.transaction, amount: newAbs } }
      ));
    }
  };

  const handleAssignSubcategory = (type, idx, subcategory) => {
    if (type === 'debit') {
      onUpdateHistory(history.map((item, i) => i !== idx ? item : { ...item, subcategory }));
    } else {
      onUpdateCreditHistory(creditHistory.map((item, i) => i !== idx ? item : { ...item, subcategory }));
    }
  };

  return (
    <div className="screen">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>← Späť</button>
        <span className="nav-title">{month.label}</span>
        <button className="reset-month-btn" onClick={() => setShowResetConfirm(true)}>↺ Reset</button>
      </div>
      <div className="tabs">
        <button className={`tab-btn${tab === 'dashboard' ? ' tab-btn--active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={`tab-btn${tab === 'table' ? ' tab-btn--active' : ''}`} onClick={() => setTab('table')}>Transakcie</button>
      </div>
      {tab === 'table' && (
        <div className="results-action-bar">
          <button
            className={`edit-mode-btn${editMode ? ' edit-mode-btn--active' : ''}`}
            onClick={() => editMode ? setEditMode(false) : setShowEditConfirm(true)}
          >
            ⚙️ Upraviť
          </button>
          {editMode && <span className="clearing-hint">Potiahni príjem na výdavok (alebo opačne) a vyrovnaj ich</span>}
          <button className="add-more-btn" onClick={onAddMore}>+ Nahrať výpis</button>
          <button className="add-transaction-btn" onClick={() => setShowAddTransaction(true)}>+ Pridať transakciu</button>
        </div>
      )}

      {showEditConfirm && (
        <div className="confirm-overlay" onClick={() => setShowEditConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon">⚙️</div>
            <h3 className="confirm-modal-title">Prepnúť do editačného módu?</h3>
            <p className="confirm-modal-text">Editačný mód je určený skúsenejším používateľom. Môžete meniť sumy, kategórie aj mazať transakcie.</p>
            <div className="confirm-modal-actions">
              <button className="confirm-modal-cancel" onClick={() => setShowEditConfirm(false)}>Zrušiť</button>
              <button className="confirm-modal-ok" onClick={() => { setEditMode(true); setShowEditConfirm(false); }}>Prepnúť</button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="confirm-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon">↺</div>
            <h3 className="confirm-modal-title">Resetovať mesiac?</h3>
            <p className="confirm-modal-text">Vymažú sa všetky transakcie za {month.label}. Budete môcť nahrať výpis znovu.</p>
            <div className="confirm-modal-actions">
              <button className="confirm-modal-cancel" onClick={() => setShowResetConfirm(false)}>Zrušiť</button>
              <button className="confirm-modal-ok" style={{ background: '#ef4444' }} onClick={() => { setShowResetConfirm(false); onReset(); }}>Vymazať</button>
            </div>
          </div>
        </div>
      )}
      {showAddTransaction && (
        <AddTransactionModal onConfirm={handleAddTransaction} onCancel={() => setShowAddTransaction(false)} />
      )}
      {tab === 'table'
        ? <>
          {selectedSubcategory && (
            <div className="subcategory-filter-banner">
              Zobrazené transakcie: <strong>{selectedSubcategory.name}</strong>
              <button type="button" onClick={onClearSubcategory}>Zrušiť filter</button>
            </div>
          )}
          <TransactionTable
            history={history}
            creditHistory={creditHistory}
            editMode={editMode}
            savingsGoals={savingsGoals}
            customCategories={customCategories}
            subcategoryFilter={selectedSubcategory}
            onUpdateAmounts={handleUpdateAmounts}
            onUpdateAmount={handleUpdateAmount}
            onDelete={handleDelete}
            onAllocateToGoal={handleAllocateToGoal}
            onAddGoal={onAddGoal}
            onWithdrawalsChanged={handleWithdrawalsChanged}
            onAssignSubcategory={handleAssignSubcategory}
            onClearPair={handleClearPair}
            onUndoClear={handleUndoClear}
          />
        </>
        : <DashboardTab
            history={history}
            creditHistory={creditHistory}
            customCategories={customCategories}
            onSelectSubcategory={subcategory => {
              onSelectSubcategory(subcategory);
              setTab('table');
            }}
          />
      }
    </div>
  );
}
