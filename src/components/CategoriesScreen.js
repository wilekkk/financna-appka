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
    <div className="yearly-screen">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>← Späť</button>
        <h1 className="nav-title">Podkategórie príjmov/výdavkov</h1>
      </div>

      <button className="primary-action-btn" onClick={() => { setType(null); setDialogOpen(true); }}>
        + Pridať kategóriu
      </button>

      <div className="category-groups">
        <section className="category-group">
          <h2 className="category-group-title">Príjmové kategórie</h2>
          {customCategories.filter(category => category.type === 'income').map(category => (
            <div className="category-row" key={category.id || category.key}>
              <span>{category.label || category.name}</span>
              <button className="category-delete-btn" onClick={() => setCategoryToDelete(category)} aria-label={`Vymazať ${category.name}`}>×</button>
            </div>
          ))}
          {!customCategories.some(category => category.type === 'income') && (
            <div className="category-empty">Zatiaľ nemáš žiadnu podkategóriu.</div>
          )}
        </section>
        <section className="category-group">
          <h2 className="category-group-title">Výdavkové kategórie</h2>
          {customCategories.filter(category => category.type === 'expense').map(category => (
            <div className="category-row" key={category.id || category.key}>
              <span>{category.label || category.name}</span>
              <button className="category-delete-btn" onClick={() => setCategoryToDelete(category)} aria-label={`Vymazať ${category.name}`}>×</button>
            </div>
          ))}
          {!customCategories.some(category => category.type === 'expense') && (
            <div className="category-empty">Zatiaľ nemáš žiadnu podkategóriu.</div>
          )}
        </section>
      </div>

      {dialogOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="category-dialog" onSubmit={handleSubmit}>
            <h2>Pridať kategóriu</h2>
            <p className="dialog-label">Aký typ kategórie chceš pridať?</p>
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
                <label className="dialog-label" htmlFor="category-name">Názov kategórie</label>
                <input
                  id="category-name"
                  className="auth-input"
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
