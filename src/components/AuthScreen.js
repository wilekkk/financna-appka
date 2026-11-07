import { useState } from 'react';
import { supabase } from '../supabaseClient';

const RESET_SENT = 'Ak k tomuto emailu existuje účet, poslali sme naň odkaz na nastavenie nového hesla. Skontroluj aj spam.';

// initialError: chyba z odkazu v emaili (napr. vypršaný odkaz), ktorú appka našla v adrese stránky.
export default function AuthScreen({ initialError = '' }) {
  const [mode, setMode]       = useState('login'); // login | register | reset
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(initialError);
  const [info, setInfo]       = useState('');

  const switchMode = next => { setMode(next); setError(''); setInfo(''); };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    if (mode === 'reset') {
      // Po kliknutí na odkaz sa používateľ vráti na túto stránku (localhost aj Vercel).
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) {
        console.error('Nepodarilo sa poslať odkaz na obnovu hesla:', error);
        setError('Odkaz sa nepodarilo poslať. Skús to znova o minútu.');
      } else {
        setInfo(RESET_SENT);
      }
    } else if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
      });
      if (error) setError(error.message);
      else setInfo('Skontroluj email a potvrď registráciu.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div>
          <h1 className="auth-title">Finančná appka</h1>
          <p className="auth-tagline">Príjmy, výdavky a sporenie na jednom mieste.</p>
        </div>
        {mode === 'reset' ? (
          <p className="auth-tagline">Zadaj email k účtu. Pošleme ti odkaz, cez ktorý si nastavíš nové heslo.</p>
        ) : (
          <div className="auth-tabs">
            <button className={`auth-tab${mode === 'login' ? ' auth-tab--active' : ''}`} onClick={() => switchMode('login')}>Prihlásiť sa</button>
            <button className={`auth-tab${mode === 'register' ? ' auth-tab--active' : ''}`} onClick={() => switchMode('register')}>Registrácia</button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label className="auth-label" htmlFor="auth-first-name">Meno (voliteľné)</label>
              <input
                id="auth-first-name"
                className="auth-input"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
              />

              <label className="auth-label" htmlFor="auth-last-name">Priezvisko (voliteľné)</label>
              <input
                id="auth-last-name"
                className="auth-input"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </>
          )}

          <label className="auth-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            className="auth-input"
            type="email"
            placeholder="tvoj@email.sk"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          {mode !== 'reset' && <>
            <label className="auth-label" htmlFor="auth-password">Heslo</label>
            <input
              id="auth-password"
              className="auth-input"
              type="password"
              placeholder="Minimálne 6 znakov"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </>}
          {mode === 'login' && (
            <button type="button" className="text-btn auth-link" onClick={() => switchMode('reset')}>Zabudnuté heslo?</button>
          )}

          {error && <div className="auth-error">{error}</div>}
          {info  && <div className="auth-info">{info}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Načítava…' : mode === 'login' ? 'Prihlásiť sa' : mode === 'register' ? 'Zaregistrovať sa' : 'Poslať odkaz'}
          </button>
        </form>
        {mode === 'reset' && (
          <button type="button" className="text-btn auth-link" onClick={() => switchMode('login')}>Späť na prihlásenie</button>
        )}
      </div>
    </div>
  );
}
