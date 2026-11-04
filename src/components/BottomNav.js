import { ChartLine, CalendarDays, Target, Settings } from 'lucide-react';

// Spodné menu aplikácie. active: 'prehled' | 'mesiace' | 'sporenie' | 'nastavenia'
export default function BottomNav({ active, onNavigate }) {
  const items = [
    { key: 'prehled',    label: 'Prehľad',    Icon: ChartLine },
    { key: 'mesiace',    label: 'Mesiace',    Icon: CalendarDays },
    { key: 'sporenie',   label: 'Sporenie',   Icon: Target },
    { key: 'nastavenia', label: 'Nastavenia', Icon: Settings },
  ];
  return (
    <nav className="bottom-nav" aria-label="Hlavná navigácia">
      <div className="bottom-nav-inner">
        {items.map(({ key, label, Icon }) => (
          <button key={key} className={`bottom-nav-btn${active === key ? ' is-active' : ''}`}
                  onClick={() => onNavigate(key)} aria-current={active === key ? 'page' : undefined}>
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
