import { ChevronLeft, ChevronRight } from 'lucide-react';
export default function SettingsScreen({ onBack, onOpenProfile, onOpenCategories }) {
  return (
    <div className="yearly-screen">
      <div className="nav-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={18} />Späť</button>
        <h1 className="nav-title">Nastavenia</h1>
      </div>

      <div className="settings-list">
        <button className="settings-list-item" onClick={onOpenProfile}>
          <span>Profil</span>
          <span className="settings-list-arrow"><ChevronRight size={18} /></span>
        </button>
        <button className="settings-list-item" onClick={onOpenCategories}>
          <span>Podkategórie príjmov/výdavkov</span>
          <span className="settings-list-arrow"><ChevronRight size={18} /></span>
        </button>
      </div>
    </div>
  );
}
