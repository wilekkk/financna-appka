import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function CategoriesScreen({ customCategories, onAddCategory, onDeleteCategory, onBack }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState(null);
  const [name, setName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const handleSubmit = event => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onAddCategory({ id: `${type}-${Date.now()}`, name: trimmedName, type });
    setName('');
    setDialogOpen(false);
    setType(null);
  };

  return (
    <div className="yearly-screen detail-screen">
      <header className="detail-header">
        <button className="icon-btn icon-btn--start" onClick={onBack} aria-label="Späť na nastavenia"><ChevronLeft size={22} strokeWidth={1.75} /></button>
        <h1 className="screen-title">Podkategórie</h1>
        <div className="detail-header-actions">
          <button className="icon-btn" onClick={() => { setType(null); setDialogOpen(true); }} aria-label="Pridať podkategóriu" title="Pridať podkategóriu"><Plus size={22} strokeWidth={1.75} /></button>
        </div>
      </header>

      <p className="screen-intro">Podkategórie priradíš transakciám v mesiaci. Vymazaná podkategória ostane pri transakciách, ktoré ju už majú.</p>

        <section className="section">
          <div className="section-head"><h2 className="section-title">Príjmy</h2></div>
          {customCategories.filter(category => category.type === 'income').map(category => (
            <div className="list-row" key={category.id}>
              <span>{category.name}</span>
              <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => setCategoryToDelete(category)} aria-label={`Vymazať ${category.name}`}><Trash2 size={16} strokeWidth={1.75} /></button>
            </div>
          ))}
          {!customCategories.some(category => category.type === 'income') && (
            <p className="section-empty">Zatiaľ nemáš žiadnu podkategóriu.</p>
          )}
        </section>
        <section className="section">
          <div className="section-head"><h2 className="section-title">Výdavky</h2></div>
          {customCategories.filter(category => category.type === 'expense').map(category => (
            <div className="list-row" key={category.id}>
              <span>{category.name}</span>
              <button className="icon-btn icon-btn--sm icon-btn--danger" onClick={() => setCategoryToDelete(category)} aria-label={`Vymazať ${category.name}`}><Trash2 size={16} strokeWidth={1.75} /></button>
            </div>
          ))}
          {!customCategories.some(category => category.type === 'expense') && (
            <p className="section-empty">Zatiaľ nemáš žiadnu podkategóriu.</p>
          )}
        </section>

      {dialogOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="category-dialog" onSubmit={handleSubmit}>
            <h2>Pridať podkategóriu</h2>
            <p className="dialog-label">Typ</p>
            <div className="category-type-options">
              <button
                type="button"
                className={`category-type-btn${type === 'income' ? ' category-type-btn--active' : ''}`}
                onClick={() => setType('income')}
              >
                Príjmová
              </button>
              <button
                type="button"
                className={`category-type-btn${type === 'expense' ? ' category-type-btn--active' : ''}`}
                onClick={() => setType('expense')}
              >
                Výdavková
              </button>
            </div>
            {type && (
              <>
                <label className="dialog-label" htmlFor="category-name">Názov</label>
                <input
                  id="category-name"
                  className="dialog-input"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="napr. Bývanie"
                  autoFocus
                  required
                />
              </>
            )}
            <div className="dialog-actions">
              <button type="button" className="dialog-cancel-btn" onClick={() => { setDialogOpen(false); setType(null); }}>Zrušiť</button>
              {type && <button type="submit" className="primary-action-btn">Pridať</button>}
            </div>
          </form>
        </div>
      )}

      {categoryToDelete && (
        <div className="modal-backdrop" role="presentation">
          <div className="category-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-category-title">
            <h2 id="delete-category-title">Vymazať podkategóriu?</h2>
            <p className="category-delete-text">
              Naozaj chceš vymazať podkategóriu „{categoryToDelete.name}“?
            </p>
            <div className="dialog-actions">
              <button type="button" className="dialog-cancel-btn" onClick={() => setCategoryToDelete(null)}>Zrušiť</button>
              <button
                type="button"
                className="category-delete-confirm-btn"
                onClick={() => {
                  onDeleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }}
              >
                Vymazať
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
