import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthScreen() {
  const [mode, setMode]       = useState('login');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setInfo('Skontroluj email a potvrď registráciu.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">💰 Finančná Appka</h1>
        <div className="auth-tabs">
          <button className={`auth-tab${mode === 'login' ? ' auth-tab--active' : ''}`} onClick={() => { setMode('login'); setError(''); setInfo(''); }}>Prihlásiť sa</button>
          <button className={`auth-tab${mode === 'register' ? ' auth-tab--active' : ''}`} onClick={() => { setMode('register'); setError(''); setInfo(''); }}>Registrácia</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="tvoj@email.sk"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className="auth-label">Heslo</label>
          <input
            className="auth-input"
            type="password"
            placeholder="Minimálne 6 znakov"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && <div className="auth-error">{error}</div>}
          {info  && <div className="auth-info">{info}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Načítava...' : mode === 'login' ? 'Prihlásiť sa' : 'Zaregistrovať sa'}
          </button>
        </form>
      </div>
    </div>
  );
}
