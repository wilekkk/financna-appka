import { useState, useRef } from 'react';
import { parseCSV } from '../utils/csv';

export default function UploadZone({ onLoad }) {
  const inputRef              = useRef();
  const [dropping, setDropping] = useState(false);
  const [error, setError]       = useState('');

  const handleFile = (file) => {
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const txs = parseCSV(e.target.result);
        if (!txs.length) throw new Error('Nenašli sa žiadne transakcie. Skontroluj formát CSV.');
        onLoad(txs);
      } catch (err) { setError(err.message); }
    };
    reader.readAsText(file, 'windows-1250');
  };

  return (
    <div className="upload-area">
      <div
        className={`upload-zone${dropping ? ' upload-zone--active' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDropping(true); }}
        onDragLeave={() => setDropping(false)}
        onDrop={e => { e.preventDefault(); setDropping(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <div className="upload-icon">📂</div>
        <p className="upload-label">Nahraj CSV výpis z Tatra banky</p>
        <p className="upload-sub">Klikni alebo pretiahni súbor sem</p>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
               onChange={e => handleFile(e.target.files[0])} />
      </div>
      {error && <p className="upload-error">{error}</p>}
    </div>
  );
}
