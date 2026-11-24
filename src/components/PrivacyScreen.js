import { ChevronLeft } from 'lucide-react';
import { PRIVACY_CONTACT } from '../constants';

// Zásady ochrany súkromia (GDPR). Len text, nič nečíta ani neukladá.
// Dostupné pred prihlásením (z prihlasovacej obrazovky) aj po ňom (Nastavenia).
export default function PrivacyScreen({ onBack }) {
  const operator = PRIVACY_CONTACT.operator || 'doplníme';
  const email = PRIVACY_CONTACT.email;
  return (
    <div className="yearly-screen detail-screen">
      <header className="detail-header">
        <button className="icon-btn icon-btn--start" onClick={onBack} aria-label="Späť"><ChevronLeft size={22} strokeWidth={1.75} /></button>
        <h1 className="screen-title">Ochrana súkromia</h1>
        <span />
      </header>

      <div className="guide">
        <section className="section">
          <p>Tu sa dozvieš, aké údaje appka o tebe ukladá, prečo, kde a ako dlho, a aké máš práva. Platí od {PRIVACY_CONTACT.validFrom}.</p>
        </section>

        <section className="section">
          <h2 className="section-title">Kto spracúva tvoje údaje</h2>
          <p>Prevádzkovateľ: <strong>{operator}</strong></p>
          <p>Kontakt: {email ? <a href={`mailto:${email}`}>{email}</a> : <strong>doplníme</strong>}</p>
        </section>

        <section className="section">
          <h2 className="section-title">Aké údaje ukladáme</h2>
          <ul>
            <li><strong>Účet:</strong> email a heslo. Heslo je uložené zašifrované a nikto ho nevidí.</li>
            <li><strong>Meno a priezvisko,</strong> ak ich vyplníš (nie sú povinné).</li>
            <li><strong>Finančné údaje:</strong> transakcie z výpisov, ktoré nahráš (dátum, suma, názov obchodu alebo popis), ich kategórie, tvoje podkategórie a ciele sporenia.</li>
          </ul>
          <p>Výpis z banky sa spracuje priamo v tvojom prehliadači. Neukladá sa celý súbor, len údaje o transakciách vyššie. Popis transakcie je taký, ako ho uvádza banka, takže môže obsahovať napríklad meno alebo účet príjemcu. Prihlasovacie údaje do banky appka nikdy nežiada.</p>
        </section>

        <section className="section">
          <h2 className="section-title">Prečo</h2>
          <p>Len preto, aby appka fungovala: aby si sa mohol prihlásiť a videl svoje príjmy, výdavky a sporenie na každom zariadení. Právnym základom je plnenie zmluvy, teda poskytovanie appky (čl. 6 ods. 1 písm. b GDPR).</p>
          <p>Tvoje údaje nepredávame, nepoužívame na reklamu ani na analýzu správania a nikomu ich neposkytujeme okrem služieb nižšie, ktoré appku technicky prevádzkujú.</p>
        </section>

        <section className="section">
          <h2 className="section-title">Kde sú uložené</h2>
          <ul>
            <li><strong>Supabase</strong> (databáza a prihlasovanie): údaje sú uložené na serveroch v EÚ, v Írsku.</li>
            <li><strong>Vercel</strong> (hosting stránky): doručuje samotnú appku. Tvoje finančné údaje neukladá, pri návšteve však spracuje technické údaje, napríklad IP adresu. Vercel je americká spoločnosť; prenos údajov chránia štandardné zmluvné doložky EÚ.</li>
          </ul>
        </section>

        <section className="section">
          <h2 className="section-title">Ako dlho</h2>
          <p>Kým máš účet. Keď ho zmažeš, údaje sa hneď vymažú z databázy. Krátko môžu ešte zostať v technických zálohách poskytovateľa databázy, kým sa automaticky neprepíšu.</p>
        </section>

        <section className="section">
          <h2 className="section-title">Čo sa ukladá v tvojom prehliadači</h2>
          <p>Appka nepoužíva cookies, analytiku ani reklamy. V prehliadači si pamätá len tvoje prihlásenie a čas poslednej aktivity, aby ťa po hodine nečinnosti mohla odhlásiť.</p>
        </section>

        <section className="section">
          <h2 className="section-title">Tvoje práva</h2>
          <ul>
            <li><strong>Prístup a prenos:</strong> všetky svoje údaje si stiahneš v Profile cez „Stiahnuť moje dáta“.</li>
            <li><strong>Oprava:</strong> údaje môžeš kedykoľvek upraviť priamo v appke.</li>
            <li><strong>Vymazanie:</strong> účet aj všetky údaje zmažeš v Profile cez „Zmazať účet“.</li>
            <li><strong>Námietka a obmedzenie spracúvania:</strong> napíš na kontakt vyššie.</li>
            <li><strong>Sťažnosť:</strong> môžeš podať na Úrad na ochranu osobných údajov SR (dataprotection.gov.sk).</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
