import { ChevronRight } from 'lucide-react';
export default function SettingsScreen({ onOpenProfile, onOpenCategories }) {
  return (
    <div className="yearly-screen overview-screen">
      <header className="screen-header">
        <h1 className="screen-title">Nastavenia</h1>
      </header>

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
