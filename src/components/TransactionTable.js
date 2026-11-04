import TransactionRow from './TransactionRow';
import { getRemainingAmount } from '../utils/finance';
import { formatDayLabel, formatMoney } from '../utils/format';

function ClearingSummary({ clearing, onUndoClear }) {
  return (
    <div className="tx-item tx-item--cleared">
      <div className="tx-item-main">
        <div className="tx-item-info">
          <div className="tx-item-name">{clearing.names.join(' + ')}</div>
          <div className="tx-item-meta">Úplne vyrovnané, {formatMoney(clearing.amount)}</div>
        </div>
        <button className="text-btn" onClick={() => onUndoClear(clearing.id)}>Vrátiť</button>
      </div>
    </div>
  );
}

// Rozdelí zoradené transakcie do skupín podľa dňa. Ručne pridané majú vlastnú skupinu navrchu.
function groupByDay(items, isManual) {
  const groups = [];
  items.forEach(item => {
    const key = isManual(item) ? '__manual' : item.transaction.date || '';
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.key === key) lastGroup.items.push(item);
    else groups.push({ key, label: key === '__manual' ? 'Pridané ručne' : formatDayLabel(key), items: [item] });
  });
  return groups.map(group => ({
    ...group,
    total: group.items.reduce((sum, item) => sum + (item._type === 'credit' ? 1 : -1) * getRemainingAmount(item), 0),
  }));
}

export default function TransactionTable({ history, creditHistory, editMode, savingsGoals, customCategories, subcategoryFilter, onUpdateAmounts, onUpdateAmount, onDelete, onAllocateToGoal, onAddGoal, onWithdrawalsChanged, onAssignSubcategory, onClearPair, onUndoClear }) {
  // Invalid dates become 0, so they sort to the end of the list.
  const parseDate = str => { const [d, m, y] = (str || '').split('.'); return new Date(+y, +m - 1, +d).getTime() || 0; };
  const isManual = item => String(item.transaction.id ?? '').startsWith('manual-');
  const manualAddedAt = item => Number(String(item.transaction.id).slice('manual-'.length)) || 0;
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
    .sort((a, b) => {
      // Manually added transactions stay on top, newest first; the rest are sorted by date.
      if (isManual(a) !== isManual(b)) return isManual(a) ? -1 : 1;
      if (isManual(a)) return manualAddedAt(b) - manualAddedAt(a);
      return parseDate(b.transaction.date) - parseDate(a.transaction.date);
    });
  // Stable row keys, so row state (open menus, delete confirmation) stays with its transaction after deletes or filtering.
  const keyCounts = new Map();
  const rowKey = item => {
    const base = `${item._type}|${item.transaction.date}|${item.transaction.store}|${item.transaction.amount}`;
    const count = keyCounts.get(base) || 0;
    keyCounts.set(base, count + 1);
    return `${base}|${count}`;
  };

  const groups = groupByDay(all, isManual);

  return (
    <div className="tx-list">
      {completedClearings.length > 0 && (
        <div className="tx-day">
          <div className="tx-day-head"><span>Vyrovnané platby</span></div>
          {completedClearings.map(clearing => (
            <ClearingSummary key={clearing.id} clearing={clearing} onUndoClear={onUndoClear} />
          ))}
        </div>
      )}
      {groups.map((group, i) => (
        <div key={`${group.key}-${i}`} className="tx-day">
          <div className="tx-day-head">
            <span>{group.label}</span>
            <span>{formatMoney(group.total, { sign: true })}</span>
          </div>
          {group.items.map(item => (
            <TransactionRow key={rowKey(item)} item={item} editMode={editMode} savingsGoals={savingsGoals} customCategories={customCategories}
              showDate={group.key === '__manual'}
              onUpdateAmounts={onUpdateAmounts} onUpdateAmount={onUpdateAmount}
              onDelete={onDelete} onAllocateToGoal={onAllocateToGoal} onAddGoal={onAddGoal} onWithdrawalsChanged={onWithdrawalsChanged}
              onAssignSubcategory={onAssignSubcategory} onClearPair={onClearPair} onUndoClear={onUndoClear} />
          ))}
        </div>
      ))}
      {groups.length === 0 && completedClearings.length === 0 && (
        <p className="section-empty">Žiadne transakcie na zobrazenie.</p>
      )}
    </div>
  );
}
