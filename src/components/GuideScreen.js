import { ChevronLeft } from 'lucide-react';
import { BANK_STATEMENT_HELP, CAT_MAP } from '../constants';

// Návod pre nového používateľa. Len text, nič nečíta ani neukladá.
export default function GuideScreen({ onBack }) {
  return (
    <div className="yearly-screen detail-screen">
      <header className="detail-header">
        <button className="icon-btn icon-btn--start" onClick={onBack} aria-label="Späť"><ChevronLeft size={22} strokeWidth={1.75} /></button>
        <h1 className="screen-title">Ako používať appku</h1>
        <span />
      </header>

      <div className="guide">
        <section className="section">
          <h2 className="section-title">1. Stiahni výpis z banky</h2>
          <p>Appka pracuje s výpisom z účtu vo formáte CSV, vždy za jeden mesiac.</p>
          {Object.entries(BANK_STATEMENT_HELP).map(([key, bank]) => (
            <div key={key}>
              <h3 className="subsection-title">{bank.label}</h3>
              <ol>{bank.steps.map(step => <li key={step}>{step}</li>)}</ol>
            </div>
          ))}
        </section>

        <section className="section">
          <h2 className="section-title">2. Nahraj výpis do mesiaca</h2>
          <p>V časti Mesiace vyber mesiac, potom banku a nahraj súbor. Ak nahráš ďalší výpis do toho istého mesiaca, rovnaké transakcie sa preskočia.</p>
        </section>

        <section className="section">
          <h2 className="section-title">3. Zatrieď výdavky</h2>
          <p>Každý výdavok sa ukáže ako karta. Príjmy sa zaradia samy.</p>
          <ul>
            <li>Potiahni kartu doprava = <strong style={{ color: CAT_MAP.needs.color }}>Needs</strong></li>
            <li>Doľava = <strong style={{ color: CAT_MAP.wants.color }}>Wants</strong></li>
            <li>Hore = <strong style={{ color: CAT_MAP.savings.color }}>Savings</strong></li>
            <li>Dole = Rozdeliť medzi viac kategórií (napr. nákup v Tescu: časť jedlo, časť zábava)</li>
          </ul>
        </section>

        <section className="section">
          <h2 className="section-title">Needs, Wants a Savings</h2>
          <ul>
            <li><strong style={{ color: CAT_MAP.needs.color }}>Needs</strong>: čo potrebuješ na život. Bývanie, jedlo, energie, doprava do práce.</li>
            <li><strong style={{ color: CAT_MAP.wants.color }}>Wants</strong>: čo ti robí radosť, ale dalo by sa bez toho. Reštaurácie, oblečenie navyše, zábava.</li>
            <li><strong style={{ color: CAT_MAP.savings.color }}>Savings</strong>: peniaze do budúcnosti. Sporenie, investície, aj investícia do seba, napríklad kurz.</li>
          </ul>
          <p>Známe pravidlo hovorí: približne 50 % príjmu na Needs, 30 % na Wants a 20 % na Savings.</p>
        </section>

        <section className="section">
          <h2 className="section-title">Ciele sporenia</h2>
          <p>V časti Sporenie si vytvor ciele, napríklad Dovolenka alebo Rezerva. Pri výdavku zaradenom do Savings potom ťukni na Priradiť k cieľu sporenia. Keď si peniaze zo sporenia vyberieš, pri príjme ťukni na Výber zo sporenia. Peniaze medzi cieľmi presunieš v detaile cieľa.</p>
        </section>

        <section className="section">
          <h2 className="section-title">Úpravy v mesiaci</h2>
          <ul>
            <li>Pridať: ručne doplníš transakciu, ktorá nie je vo výpise (napr. platba v hotovosti).</li>
            <li>Upraviť: zmeníš sumu, rozdelenie medzi kategórie alebo transakciu vymažeš.</li>
            <li>V režime Upraviť potiahni príjem na výdavok, ak ti niekto vrátil peniaze (napr. kamarát za večeru). Oba sa vyrovnajú a nebudú nafukovať príjmy ani výdavky.</li>
            <li>Podkategórie (Jedlo, Bývanie…) si upravíš v Nastaveniach a priradíš ich ťuknutím na + Podkategória pri transakcii.</li>
          </ul>
        </section>

        <section className="section">
          <h2 className="section-title">Bezpečnosť</h2>
          <p>Tvoje dáta vidíš len ty. Po hodine nečinnosti ťa appka odhlási. Ak ju používaš na mobile aj na počítači, zmeny sa medzi nimi prenesú samy.</p>
        </section>
      </div>
    </div>
  );
}
