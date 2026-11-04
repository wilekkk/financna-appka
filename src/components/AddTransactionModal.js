import { CAT_MAP } from '../constants';
import { useState } from 'react';

// Accepts d.m.yyyy or dd.mm.yyyy and returns dd.mm.yyyy, or null for an invalid date.
const normalizeDate = str => {
  const match = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
};

export default function AddTransactionModal({ onConfirm, onCancel }) {
  const [type, setType] = useState('expense');
  const [store, setStore] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('needs');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  const submit = event => {
    event.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!store.trim()) {
      setError('Zadaj názov transakcie.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Zadaj platnú sumu väčšiu ako 0.');
      return;
    }
    if (type === 'expense' && !category) {
      setError('Vyber kategóriu výdavku.');
      return;
    }
    const parsedDate = date.trim() ? normalizeDate(date.trim()) : '';
    if (parsedDate === null) {
      setError('Zadaj dátum v tvare dd.mm.rrrr.');
      return;
    }
    onConfirm({
      transaction: {
        id: `manual-${Date.now()}`,
        store: store.trim(),
        amount: type === 'expense' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
        date: parsedDate,
        typ: type === 'expense' ? 'debet' : 'kredit',
      },
      category: type === 'expense' ? category : 'prijem',
      splits: null,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="add-transaction-dialog" onSubmit={submit} onClick={event => event.stopPropagation()}>
        <h2>Pridať transakciu</h2>
        <div className="add-transaction-type">
          <button type="button" className={`category-type-btn${type === 'income' ? ' category-type-btn--active' : ''}`} onClick={() => setType('income')}>
            Príjmová
          </button>
          <button type="button" className={`category-type-btn${type === 'expense' ? ' category-type-btn--active' : ''}`} onClick={() => setType('expense')}>
            Výdavková
          </button>
        </div>
        <label className="dialog-label" htmlFor="manual-store">Názov</label>
        <input id="manual-store" className="dialog-input" value={store} onChange={event => setStore(event.target.value)} placeholder="Napr. Jožko alebo Lidl" autoFocus />
        <label className="dialog-label" htmlFor="manual-amount">Suma (€)</label>
        <input id="manual-amount" className="dialog-input" type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0,00" />
        {type === 'expense' && (
          <>
            <span className="dialog-label">Kategória</span>
            <div className="add-transaction-categories">
              {['needs', 'wants', 'savings'].map(value => (
                <label key={value} className={`add-transaction-category${category === value ? ' add-transaction-category--active' : ''}`} style={{ '--c': CAT_MAP[value].color }}>
                  <input type="radio" name="manual-category" value={value} checked={category === value} onChange={() => setCategory(value)} />
                  {value === 'needs' ? 'Needs' : value === 'wants' ? 'Wants' : 'Savings'}
                </label>
              ))}
            </div>
          </>
        )}
        <label className="dialog-label" htmlFor="manual-date">Dátum (voliteľné)</label>
        <input id="manual-date" className="dialog-input" value={date} onChange={event => setDate(event.target.value)} placeholder="dd.mm.rrrr" />
        {error && <p className="add-transaction-error">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel-btn" onClick={onCancel}>Zrušiť</button>
          <button type="submit" className="primary-action-btn">Pridať</button>
        </div>
      </form>
    </div>
  );
}
