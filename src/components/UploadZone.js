import { FileUp, TriangleAlert } from 'lucide-react';
import { useState, useRef } from 'react';
import { parseCSV, parseRevolutCSV, describeSkipped, CsvFormatError } from '../utils/csv';
import { BANK_STATEMENT_HELP } from '../constants';

// Každá banka má vlastný formát výpisu aj kódovanie súboru. Ak sa výpis v prvom kódovaní
// nedá prečítať (chýba stĺpec), skúsi sa ďalšie.
const BANKS = {
  tatra:   { label: 'Tatra banka', from: 'z Tatra banky', parse: parseCSV,        encodings: ['windows-1250', 'utf-8'] },
  revolut: { label: 'Revolut',     from: 'z Revolutu',    parse: parseRevolutCSV, encodings: ['utf-8'] },
};

const readText = (file, encoding) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = () => reject(new Error('Súbor sa nepodarilo prečítať.'));
  reader.readAsText(file, encoding);
});

// Prečíta výpis. Chyba formátu v poslednom kódovaní sa pošle ďalej, inak sa skúsi ďalšie kódovanie.
async function parseFile(file, { parse, encodings }) {
  for (let i = 0; i < encodings.length; i++) {
    try {
      return parse(await readText(file, encodings[i]));
    } catch (err) {
      if (!(err instanceof CsvFormatError) || i === encodings.length - 1) throw err;
    }
  }
}

export default function UploadZone({ onLoad }) {
  const inputRef              = useRef();
  const [bank, setBank]         = useState('tatra');
  const [dropping, setDropping] = useState(false);
  const [error, setError]       = useState('');
  const [review, setReview]     = useState(null); // { transactions, notes }: niečo sa vynechalo, čaká na potvrdenie

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setReview(null);
    const { from } = BANKS[bank];
    try {
      const { transactions, skipped } = await parseFile(file, BANKS[bank]);
      if (!transactions.length) throw new Error('Nenašli sa žiadne transakcie.');
      const notes = describeSkipped(skipped);
      if (notes.length) setReview({ transactions, notes });
      else onLoad(transactions);
    } catch (err) {
      setError(`${err.message} Skontroluj, či je to CSV výpis ${from}.`);
    }
  };

  if (review) {
    const count = review.transactions.length;
    return (
      <div className="upload-area">
        <div className="upload-review" role="status">
          <p className="upload-review-title">Našli sme {count} {count === 1 ? 'transakciu' : count < 5 ? 'transakcie' : 'transakcií'}.</p>
          <p className="upload-review-text"><TriangleAlert size={14} className="inline-icon" />Niektoré riadky výpisu sme vynechali a nezapočítajú sa:</p>
          <ul>{review.notes.map(note => <li key={note}>{note}</li>)}</ul>
          <div className="dialog-actions">
            <button type="button" className="dialog-cancel-btn" onClick={() => setReview(null)}>Zrušiť</button>
            <button type="button" className="primary-action-btn" onClick={() => onLoad(review.transactions)}>Pokračovať</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-area">
      <div className="upload-bank" role="group" aria-label="Banka">
        {Object.entries(BANKS).map(([key, { label }]) => (
          <button key={key} type="button"
                  className={`category-type-btn${bank === key ? ' category-type-btn--active' : ''}`}
                  aria-pressed={bank === key}
                  onClick={() => { setBank(key); setError(''); }}>
            {label}
          </button>
        ))}
      </div>
      <div
        className={`upload-zone${dropping ? ' upload-zone--active' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDropping(true); }}
        onDragLeave={() => setDropping(false)}
        onDrop={e => { e.preventDefault(); setDropping(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <div className="upload-icon"><FileUp size={36} strokeWidth={1.5} /></div>
        <p className="upload-label">Nahraj CSV výpis {BANKS[bank].from}</p>
        <p className="upload-sub">Klikni alebo pretiahni súbor sem</p>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
               onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
      </div>
      <details className="upload-help">
        <summary>Ako stiahnuť výpis {BANKS[bank].from}?</summary>
        <ol>{BANK_STATEMENT_HELP[bank].steps.map(step => <li key={step}>{step}</li>)}</ol>
      </details>
      {error && <p className="upload-error">{error}</p>}
    </div>
  );
}
