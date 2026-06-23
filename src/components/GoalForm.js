import { useState } from 'react';

export default function GoalForm({ goal, onSave, onCancel }) {
  const [name, setName]     = useState(goal?.name ?? '');
  const [amount, setAmount] = useState(goal?.targetAmount != null ? goal.targetAmount.toFixed(2) : '');

  const handleSave = () => {
    if (!name.trim()) return;
    const parsed = parseFloat(amount.replace(',', '.'));
    onSave({ name: name.trim(), targetAmount: parsed > 0 ? parsed : null });
  };

  return (
    <div className="confirm-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-modal">
        <h3 className="confirm-modal-title">{goal ? 'Upraviť cieľ' : 'Nový cieľ'}</h3>
        <div className="goal-form">
          <input className="goal-input" type="text" placeholder="Názov cieľa (napr. Dovolenka)"
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus />
          <div className="goal-amount-row">
            <input className="goal-input" type="number" step="0.01" placeholder="Cieľová suma (voliteľné)"
              value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
            <span className="goal-eur">€</span>
          </div>
        </div>
        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel" onClick={onCancel}>Zrušiť</button>
          <button className="confirm-modal-ok" disabled={!name.trim()} onClick={handleSave}>
            {goal ? 'Uložiť' : 'Pridať'}
          </button>
        </div>
      </div>
    </div>
  );
}
