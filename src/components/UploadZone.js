import { FileUp } from 'lucide-react';
import { useState, useRef } from 'react';
import { parseCSV, parseRevolutCSV } from '../utils/csv';

// Každá banka má vlastný formát výpisu aj kódovanie súboru.
const BANKS = {
  tatra:   { label: 'Tatra banka', from: 'z Tatra banky', parse: parseCSV,        encoding: 'windows-1250' },
  revolut: { label: 'Revolut',     from: 'z Revolutu',    parse: parseRevolutCSV, encoding: 'utf-8' },
};

export default function UploadZone({ onLoad }) {
  const inputRef              = useRef();
  const [bank, setBank]         = useState('tatra');
  const [dropping, setDropping] = useState(false);
  const [error, setError]       = useState('');

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    const { parse, encoding, from } = BANKS[bank];
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const txs = parse(e.target.result);
        if (!txs.length) throw new Error(`Nenašli sa žiadne transakcie. Skontroluj, či je to CSV výpis ${from}.`);
        onLoad(txs);
      } catch (err) { setError(err.message); }
    };
    reader.readAsText(file, encoding);
  };

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
      {error && <p className="upload-error">{error}</p>}
    </div>
  );
}
