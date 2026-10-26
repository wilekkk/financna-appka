export default function SettingsScreen({ onBack, onOpenCategories }) {
  return (
    <div className="yearly-screen">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}>← Späť</button>
        <h1 className="nav-title">Nastavenia</h1>
      </div>

      <div className="settings-list">
        <button className="settings-list-item" onClick={onOpenCategories}>
          <span>Podkategórie príjmov/výdavkov</span>
          <span className="settings-list-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
