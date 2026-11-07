import { ChevronLeft, ChevronRight } from 'lucide-react';

// Nadpis obrazovky so šípkami na prepnutie roka: ‹ 2026 ›
export default function YearSwitch({ title, year, minYear, maxYear, onChange }) {
  return (
    <div className="month-switch">
      <button className="icon-btn icon-btn--sm" onClick={() => onChange(year - 1)} disabled={year <= minYear} aria-label="Predchádzajúci rok">
        <ChevronLeft size={18} strokeWidth={1.75} />
      </button>
      <h1 className="screen-title">{title}</h1>
      <button className="icon-btn icon-btn--sm" onClick={() => onChange(year + 1)} disabled={year >= maxYear} aria-label="Nasledujúci rok">
        <ChevronRight size={18} strokeWidth={1.75} />
      </button>
    </div>
  );
}
