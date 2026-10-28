import TransactionRow from './TransactionRow';
import { getRemainingAmount } from '../utils/finance';

function ClearingSummary({ clearing, onUndoClear }) {
  return (
    <div className="tx-clearing-summary">
      <div>
        <strong>− {clearing.names.join(' + ')}</strong>
        <span>Úplne vyrovnané · {clearing.amount.toFixed(2)} €</span>
      </div>
      <button className="tx-clearing-undo" onClick={() => onUndoClear(clearing.id)}>Vrátiť</button>
    </div>
  );
}

export default function TransactionTable({ history, creditHistory, editMode, savingsGoals, customCategories, subcategoryFilter, onUpdateAmounts, onUpdateAmount, onDelete, onAllocateToGoal, onAddGoal, onWithdrawalsChanged, onAssignSubcategory, onClearPair, onUndoClear }) {
  const parseDate = str => { const [d, m, y] = (str || '').split('.'); return new Date(+y, +m - 1, +d) || new Date(0); };
  const sourceItems = [
    ...history.map((item, i) => ({ ...item, _type: 'debit', _idx: i })),
    ...creditHistory.map((item, i) => ({ ...item, _type: 'credit', _idx: i })),
  ];
  const clearingItems = new Map();
  sourceItems.forEach(item => {
    const clearings = Array.isArray(item.clearing) ? item.clearing : item.clearing ? [item.clearing] : [];
    clearings.forEach(clearing => {
      const current = clearingItems.get(clearing.id) || { ...clearing, names: [] };
      current.names.push(item.transaction.store);
      current.amount = clearing.amount;
      clearingItems.set(clearing.id, current);
    });
  });
  const completedClearings = [...clearingItems.values()].filter(clearing => {
    const pair = sourceItems.filter(item => {
      const clearings = Array.isArray(item.clearing) ? item.clearing : item.clearing ? [item.clearing] : [];
      return clearings.some(entry => entry.id === clearing.id);
    });
    return pair.length > 1 && pair.every(item => getRemainingAmount(item) <= 0.005);
  });
  const all = [
    ...history.map((item, i) => ({ ...item, _type: 'debit',  _idx: i })),
    ...creditHistory.map((item, i) => ({ ...item, _type: 'credit', _idx: i })),
  ].filter(item => {
    if (getRemainingAmount(item) <= 0.005) return false;
    if (!subcategoryFilter) return true;
    if (subcategoryFilter.unassigned) return !item.subcategory;
    return item.subcategory?.id === subcategoryFilter.id;
  })
    .sort((a, b) => parseDate(b.transaction.date) - parseDate(a.transaction.date));

  return (
    <div className="tx-list">
      {completedClearings.map(clearing => (
        <ClearingSummary key={clearing.id} clearing={clearing} onUndoClear={onUndoClear} />
      ))}
      {all.map((item, i) => (
        <TransactionRow key={i} item={item} editMode={editMode} savingsGoals={savingsGoals} customCategories={customCategories}
          onUpdateAmounts={onUpdateAmounts} onUpdateAmount={onUpdateAmount}
          onDelete={onDelete} onAllocateToGoal={onAllocateToGoal} onAddGoal={onAddGoal} onWithdrawalsChanged={onWithdrawalsChanged}
          onAssignSubcategory={onAssignSubcategory} onClearPair={onClearPair} onUndoClear={onUndoClear} />
      ))}
    </div>
  );
}
