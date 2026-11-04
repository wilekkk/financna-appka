import { ChevronLeft, ChevronRight, SlidersHorizontal, FileUp, RotateCcw, Plus } from 'lucide-react';
import { useState } from 'react';
import TransactionTable from './TransactionTable';
import DashboardTab from './DashboardTab';
import { calcMonthTotals, getRemainingAmount } from '../utils/finance';
import { CAT_MAP } from '../constants';
import { formatMoney } from '../utils/format';
import Money from './Money';
import AddTransactionModal from './AddTransactionModal';

export default function ResultsScreen({ month, history, creditHistory, savingsGoals, customCategories, selectedSubcategory, onSelectSubcategory, onClearSubcategory, onUpdateHistory, onUpdateCreditHistory, onUpdateGoal, onAddGoal, onAddMore, onReset, onBack, onPrevMonth, onNextMonth }) {
  const [tab, setTab]                         = useState('table');
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

  const { totalIncome, totalExpenses, catTotals } = calcMonthTotals(history, creditHistory);
  const net = totalIncome - totalExpenses;
  const categories = ['needs', 'wants', 'savings'].map(key => ({ key, ...CAT_MAP[key], value: catTotals[key] }));
  const year = month.key.slice(0, 4);

  return (
    <div className="yearly-screen detail-screen overview-screen">
      <header className="detail-header">
        <button className="icon-btn icon-btn--start" onClick={onBack} aria-label="Späť na mesiace"><ChevronLeft size={22} strokeWidth={1.75} /></button>
        <div className="month-switch">
          <button className="icon-btn icon-btn--sm" onClick={onPrevMonth || undefined} disabled={!onPrevMonth} aria-label="Predchádzajúci mesiac"><ChevronLeft size={18} strokeWidth={1.75} /></button>
          <h1 className="screen-title">{month.label} {year}</h1>
          <button className="icon-btn icon-btn--sm" onClick={onNextMonth || undefined} disabled={!onNextMonth} aria-label="Nasledujúci mesiac"><ChevronRight size={18} strokeWidth={1.75} /></button>
        </div>
        <div className="detail-header-actions">
          <button className="icon-btn" onClick={onAddMore} aria-label="Nahrať ďalší výpis" title="Nahrať ďalší výpis"><FileUp size={20} strokeWidth={1.75} /></button>
          <button className="icon-btn" onClick={() => setShowResetConfirm(true)} aria-label="Resetovať mesiac" title="Resetovať mesiac"><RotateCcw size={20} strokeWidth={1.75} /></button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-label">Zostatok mesiaca</div>
        <div className={`hero-value hero-value--m${net < -0.004 ? ' is-negative' : ''}`}><Money value={net} sign /></div>
      </section>

      <section className="split-figures">
        <div>
          <div className="figure-label">Príjmy</div>
          <div className="figure-value is-positive">{formatMoney(totalIncome, { sign: true })}</div>
        </div>
        <div>
          <div className="figure-label">Výdavky</div>
          <div className="figure-value is-negative">{formatMoney(-totalExpenses)}</div>
        </div>
      </section>

      {totalExpenses > 0 && (
        <section className="month-cats">
          <div className="cat-bar cat-bar--thin" aria-hidden="true">
            {categories.filter(c => c.value > 0).map(c => (
              <span key={c.key} style={{ flexGrow: c.value, background: c.color }} />
            ))}
          </div>
          <div className="month-cats-legend">
            {categories.map(c => (
              <span key={c.key} style={{ color: c.color }}>
                <span className="cat-swatch" style={{ background: c.color }} />{c.label} {formatMoney(c.value)}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="tabs month-tabs">
        <button className={`tab-btn${tab === 'table' ? ' tab-btn--active' : ''}`} onClick={() => setTab('table')}>Transakcie</button>
        <button className={`tab-btn${tab === 'dashboard' ? ' tab-btn--active' : ''}`} onClick={() => setTab('dashboard')}>Podkategórie</button>
        {tab === 'table' && (
          <div className="month-tabs-actions">
            <button
              className={`text-btn text-btn--icon${editMode ? ' is-active' : ''}`}
              onClick={() => editMode ? setEditMode(false) : setShowEditConfirm(true)}
            >
              <SlidersHorizontal size={15} />{editMode ? 'Hotovo' : 'Upraviť'}
            </button>
            <button className="text-btn text-btn--icon" onClick={() => setShowAddTransaction(true)}><Plus size={16} />Pridať</button>
          </div>
        )}
      </div>
      {tab === 'table' && editMode && (
        <p className="clearing-hint">Ťuknutím na sumu ju zmeníš. Potiahnutím príjmu na výdavok (alebo opačne) ich vyrovnáš.</p>
      )}

      {showEditConfirm && (
        <div className="confirm-overlay" onClick={() => setShowEditConfirm(false)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal-icon"><SlidersHorizontal size={28} strokeWidth={1.5} /></div>
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
            <div className="confirm-modal-icon"><RotateCcw size={28} strokeWidth={1.5} /></div>
            <h3 className="confirm-modal-title">Resetovať mesiac?</h3>
            <p className="confirm-modal-text">Vymažú sa všetky transakcie za {month.label}. Budete môcť nahrať výpis znovu.</p>
            <div className="confirm-modal-actions">
              <button className="confirm-modal-cancel" onClick={() => setShowResetConfirm(false)}>Zrušiť</button>
              <button className="confirm-modal-ok" style={{ background: 'var(--negative)' }} onClick={() => { setShowResetConfirm(false); onReset(); }}>Vymazať</button>
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
