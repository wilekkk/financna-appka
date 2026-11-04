import { ChartLine, CalendarDays, Target, Settings } from 'lucide-react';

// Spodné menu aplikácie. active: 'prehled' | 'mesiace' | 'sporenie' | 'nastavenia'
export default function BottomNav({ active, onOverview, onMonths, onSavings, onSettings }) {
  const items = [
    { key: 'prehled',    label: 'Prehľad',    Icon: ChartLine,    onClick: onOverview },
    { key: 'mesiace',    label: 'Mesiace',    Icon: CalendarDays, onClick: onMonths },
    { key: 'sporenie',   label: 'Sporenie',   Icon: Target,       onClick: onSavings },
    { key: 'nastavenia', label: 'Nastavenia', Icon: Settings,     onClick: onSettings },
  ];
  return (
    <nav className="bottom-nav" aria-label="Hlavná navigácia">
      <div className="bottom-nav-inner">
        {items.map(({ key, label, Icon, onClick }) => (
          <button key={key} className={`bottom-nav-btn${active === key ? ' is-active' : ''}`}
                  onClick={onClick} aria-current={active === key ? 'page' : undefined}>
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
