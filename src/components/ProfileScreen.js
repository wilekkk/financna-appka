import { ChevronLeft, LogOut, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ProfileScreen({ user, onBack, onLogout, onExportData, onDeleteAccount }) {
  const [firstName, setFirstName] = useState(user.user_metadata?.first_name ?? '');
  const [lastName, setLastName]   = useState(user.user_metadata?.last_name ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [info, setInfo]           = useState('');
  // Zmazanie účtu: okno s potvrdením, napísané slovo, priebeh a chyba
  const [showDelete, setShowDelete]   = useState(false);
  const [deleteWord, setDeleteWord]   = useState('');
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteConfirmed = ['zmazať', 'zmazat'].includes(deleteWord.trim().toLowerCase());

  const closeDelete = () => { setShowDelete(false); setDeleteWord(''); setDeleteError(''); };
  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await onDeleteAccount();
    } catch (error) {
      console.error('Nepodarilo sa zmazať účet:', error);
      setDeleteError('Účet sa nepodarilo zmazať. Skontroluj pripojenie a skús to znova.');
      setDeleting(false);
    }
  };

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
        <div className="section-head">
          <h2 className="section-title">Tvoje dáta</h2>
        </div>
        <p className="profile-data-hint">Stiahni si všetky svoje transakcie, ciele a kategórie do jedného súboru (JSON).</p>
        <button className="profile-action-row" onClick={onExportData}><Download size={18} strokeWidth={1.75} />Stiahnuť moje dáta</button>
        <button className="profile-action-row profile-action-row--danger" onClick={() => setShowDelete(true)}><Trash2 size={18} strokeWidth={1.75} />Zmazať účet</button>
      </section>

      {showDelete && (
        <div className="confirm-overlay" onClick={deleting ? undefined : closeDelete}>
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-modal-title" id="delete-account-title">Zmazať účet natrvalo?</h3>
            <p className="confirm-modal-text">Vymažú sa všetky tvoje transakcie, ciele sporenia a kategórie aj samotný účet. Nedá sa to vrátiť.</p>
            <p className="confirm-modal-text">Ak si chceš dáta ponechať, najprv si ich stiahni cez „Stiahnuť moje dáta“.</p>
            <label className="dialog-label" htmlFor="delete-account-word">Pre potvrdenie napíš ZMAZAŤ</label>
            <input id="delete-account-word" className="dialog-input" value={deleteWord} onChange={e => setDeleteWord(e.target.value)} autoComplete="off" disabled={deleting} />
            {deleteError && <div className="auth-error">{deleteError}</div>}
            <div className="confirm-modal-actions">
              <button className="confirm-modal-cancel" onClick={closeDelete} disabled={deleting}>Zrušiť</button>
              <button className="confirm-modal-ok" style={{ background: 'var(--negative)' }} onClick={handleDelete} disabled={!deleteConfirmed || deleting}>
                {deleting ? 'Mažem…' : 'Zmazať natrvalo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section">
        <button className="logout-row" onClick={onLogout}><LogOut size={18} strokeWidth={1.75} />Odhlásiť sa</button>
      </section>
    </div>
  );
}
