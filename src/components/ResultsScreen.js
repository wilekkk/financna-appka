import { useState } from 'react';
import TransactionTable from './TransactionTable';
import DashboardTab from './DashboardTab';

export default function ResultsScreen({ month, history, creditHistory, openingBalance, isFirstInChain, savingsGoals, onUpdateOpeningBalance, onUpdateHistory, onUpdateCreditHistory, onUpdateGoal, onAddGoal, onAddMore, onReset, onBack }) {
  const [tab, setTab]                         = useState('table');
  const [editMode, setEditMode]               = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleUpdateAmounts = (idx, newAmounts, total) => {
    const pct = v => total > 0 ? parseFloat(((v / total) * 100).toFixed(4)) : 0;
    onUpdateHistory(history.map((item, i) =>
      i !== idx ? item : { ...item, category: 'split', splits: { needs: pct(newAmounts.needs), wants: pct(newAmounts.wants), savings: pct(newAmounts.savings) } }
    ));
  };

  const handleDelete = (type, idx) => {
    if (type === 'debit')  onUpdateHistory(history.filter((_, i) => i !== idx));
    else                   onUpdateCreditHistory(creditHistory.filter((_, i) => i !== idx));
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

    const withdrawalKeys = new Set(nextGoals.flatMap(g => (g.withdrawals || []).map(w => `${w.store}|${w.date}`)));
    onUpdateCreditHistory(creditHistory.map(item => ({
      ...item,
      isTransfer: withdrawalKeys.has(`${item.transaction.store}|${item.transaction.date}`),
    })));
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

  return (
    <div className="screen">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>← Späť</button>
        <span className="nav-title">{month.label}</span>
      </div>
      <div className="tabs">
        <button className={`tab-btn${tab === 'table' ? ' tab-btn--active' : ''}`} onClick={() => setTab('table')}>Transakcie</button>
        <button className={`tab-btn${tab === 'dashboard' ? ' tab-btn--active' : ''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
      </div>
      {tab === 'table' && (
        <div className="results-action-bar">
          <button
            className={`edit-mode-btn${editMode ? ' edit-mode-btn--active' : ''}`}
            onClick={() => editMode ? setEditMode(false) : setShowEditConfirm(true)}
          >
            ⚙️ Upraviť
          </button>
          <button className="add-more-btn" onClick={onAddMore}>+ Nahrať výpis</button>
          <button className="reset-month-btn" onClick={() => setShowResetConfirm(true)}>↺ Reset</button>
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
      {tab === 'table'
        ? <TransactionTable
            history={history}
            creditHistory={creditHistory}
            editMode={editMode}
            savingsGoals={savingsGoals}
            onUpdateAmounts={handleUpdateAmounts}
            onUpdateAmount={handleUpdateAmount}
            onDelete={handleDelete}
            onAllocateToGoal={handleAllocateToGoal}
            onAddGoal={onAddGoal}
            onWithdrawalsChanged={handleWithdrawalsChanged}
          />
        : <DashboardTab
            history={history}
            creditHistory={creditHistory}
            openingBalance={openingBalance}
            isFirstInChain={isFirstInChain}
            onUpdateOpeningBalance={onUpdateOpeningBalance}
          />
      }
    </div>
  );
}
