import { useState } from 'react';
import { supabase } from '../supabaseClient';

// Zobrazí sa po kliknutí na odkaz z emailu „Zabudnuté heslo“. Používateľ je už prihlásený, len si nastaví nové heslo.
export default function NewPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Heslo musí mať aspoň 6 znakov.'); return; }
    if (password !== repeat) { setError('Heslá sa nezhodujú.'); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      console.error('Nepodarilo sa uložiť nové heslo:', error);
      setError('Heslo sa nepodarilo uložiť. Skús iné heslo alebo to skús znova o chvíľu.');
      return;
    }
    onDone();
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div>
          <h1 className="auth-title">Nastav nové heslo</h1>
          <p className="auth-tagline">Potom budeš pokračovať rovno do appky.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="new-password">Nové heslo</label>
          <input id="new-password" className="auth-input" type="password" placeholder="Minimálne 6 znakov"
            value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" autoFocus />

          <label className="auth-label" htmlFor="new-password-repeat">Zopakuj heslo</label>
          <input id="new-password-repeat" className="auth-input" type="password"
            value={repeat} onChange={e => setRepeat(e.target.value)} required autoComplete="new-password" />

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? 'Ukladá sa…' : 'Uložiť heslo'}
          </button>
        </form>

        <button type="button" className="text-btn auth-link" onClick={() => supabase.auth.signOut()}>Odhlásiť sa</button>
      </div>
    </div>
  );
}
