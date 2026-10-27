import TransactionRow from './TransactionRow';

export default function TransactionTable({ history, creditHistory, editMode, savingsGoals, customCategories, subcategoryFilter, onUpdateAmounts, onUpdateAmount, onDelete, onAllocateToGoal, onAddGoal, onWithdrawalsChanged, onAssignSubcategory }) {
  const parseDate = str => { const [d, m, y] = (str || '').split('.'); return new Date(+y, +m - 1, +d) || new Date(0); };
  const all = [
    ...history.map((item, i) => ({ ...item, _type: 'debit',  _idx: i })),
    ...creditHistory.map((item, i) => ({ ...item, _type: 'credit', _idx: i })),
  ].filter(item => {
    if (!subcategoryFilter) return true;
    if (subcategoryFilter.unassigned) return !item.subcategory;
    return item.subcategory?.id === subcategoryFilter.id;
  })
    .sort((a, b) => parseDate(b.transaction.date) - parseDate(a.transaction.date));

  return (
    <div className="tx-list">
      {all.map((item, i) => (
        <TransactionRow key={i} item={item} editMode={editMode} savingsGoals={savingsGoals} customCategories={customCategories}
          onUpdateAmounts={onUpdateAmounts} onUpdateAmount={onUpdateAmount}
          onDelete={onDelete} onAllocateToGoal={onAllocateToGoal} onAddGoal={onAddGoal} onWithdrawalsChanged={onWithdrawalsChanged}
          onAssignSubcategory={onAssignSubcategory} />
      ))}
    </div>
  );
}
