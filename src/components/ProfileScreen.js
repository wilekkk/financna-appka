import { ChevronLeft, LogOut } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ProfileScreen({ user, onBack, onLogout }) {
  const [firstName, setFirstName] = useState(user.user_metadata?.first_name ?? '');
  const [lastName, setLastName]   = useState(user.user_metadata?.last_name ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [info, setInfo]           = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { first_name: firstName.trim(), last_name: lastName.trim() },
    });
    if (error) setError(error.message);
    else setInfo('Uložené');
    setSaving(false);
  };

  return (
    <div className="yearly-screen detail-screen">
      <header className="detail-header">
        <button className="icon-btn icon-btn--start" onClick={onBack} aria-label="Späť na nastavenia"><ChevronLeft size={22} strokeWidth={1.75} /></button>
        <h1 className="screen-title">Profil</h1>
        <span />
      </header>

      <div className="auth-card profile-form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="profile-first-name">Meno</label>
          <input
            id="profile-first-name"
            className="auth-input"
            value={firstName}
            onChange={e => { setFirstName(e.target.value); setInfo(''); }}
            autoComplete="given-name"
          />

          <label className="auth-label" htmlFor="profile-last-name">Priezvisko</label>
          <input
            id="profile-last-name"
            className="auth-input"
            value={lastName}
            onChange={e => { setLastName(e.target.value); setInfo(''); }}
            autoComplete="family-name"
          />

          <label className="auth-label" htmlFor="profile-email">Email</label>
          <input id="profile-email" className="auth-input" value={user.email ?? ''} disabled />

          {error && <div className="auth-error">{error}</div>}
          {info  && <div className="auth-info">{info}</div>}

          <button className="auth-submit" type="submit" disabled={saving}>
            {saving ? 'Ukladá sa…' : 'Uložiť'}
          </button>
        </form>
      </div>

      <section className="section">
        <button className="logout-row" onClick={onLogout}><LogOut size={18} strokeWidth={1.75} />Odhlásiť sa</button>
      </section>
    </div>
  );
}
