import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { generateMonths, getYearRange, shiftMonth } from './utils/finance';
import { DEFAULT_SUBCATEGORIES } from './constants';
import { loadUserData, saveUserData, deleteOwnAccount, DataConflictError } from './utils/db';
import { markActivity, clearActivity, isInactiveTooLong } from './utils/inactivity';
import { withUids, migrateGoalLinks, removeGoalEntriesFor } from './utils/goalLinks';
import { buildExport, exportFileName, downloadJson } from './utils/exportData';
import AuthScreen from './components/AuthScreen';
import NewPasswordScreen from './components/NewPasswordScreen';
import YearlyScreen from './components/YearlyScreen';
import HomeScreen from './components/HomeScreen';
import MonthSwipeScreen from './components/MonthSwipeScreen';
import ResultsScreen from './components/ResultsScreen';
import SettingsScreen from './components/SettingsScreen';
import ProfileScreen from './components/ProfileScreen';
import CategoriesScreen from './components/CategoriesScreen';
import GuideScreen from './components/GuideScreen';
import BottomNav from './components/BottomNav';

// Ktorá položka spodného menu svieti na ktorej obrazovke. Obrazovky bez položky menu nemajú.
const NAV_FOR_SCREEN = {
  yearly: 'prehled', savings: 'sporenie', months: 'mesiace', results: 'mesiace',
  settings: 'nastavenia', profile: 'nastavenia', categories: 'nastavenia', guide: 'nastavenia',
};
const SCREEN_FOR_NAV = { prehled: 'yearly', sporenie: 'savings', mesiace: 'months', nastavenia: 'settings' };

// Odkaz z emailu (obnova hesla, potvrdenie registrácie) pridá informácie do adresy za znak #.
// Čítame ich hneď pri štarte, kým ich Supabase z adresy neodstráni.
const START_HASH = window.location.hash;
const OPENED_FROM_RECOVERY_LINK = START_HASH.includes('type=recovery');
const LINK_ERROR = START_HASH.includes('error_code=')
  ? 'Odkaz z emailu vypršal alebo už bol použitý. Požiadaj o nový.'
  : '';
// Kliknutie na odkaz z emailu je čerstvá aktivita, takže kvôli nečinnosti ťa hneď neodhlási.
if (START_HASH.includes('access_token')) markActivity();

function App() {
  const [user, setUser]                    = useState(undefined); // undefined = loading
  const [screen, setScreen]               = useState('yearly');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthsData, setMonthsData]       = useState({});
  const [savingsGoals, setSavingsGoals]   = useState([]);
  const [customCategories, setCustomCategories] = useState(DEFAULT_SUBCATEGORIES);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [dataLoadError, setDataLoadError] = useState(null);
  const [saveFailedAt, setSaveFailedAt]   = useState(null); // čas posledného neúspešného uloženia (null = všetko v poriadku)
  const [confirmUnsavedLogout, setConfirmUnsavedLogout] = useState(false);
  const [settingNewPassword, setSettingNewPassword] = useState(OPENED_FROM_RECOVERY_LINK);
  const currentYear = new Date().getFullYear();
  const [year, setYear]                   = useState(currentYear);
  const months = useMemo(() => generateMonths(year), [year]);
  const yearRange = getYearRange(monthsData, currentYear);
  const [dataConflict, setDataConflict]   = useState(false);
  const [logoutInfo, setLogoutInfo]       = useState(''); // hláška na prihlasovacej obrazovke po odhlásení
  const [guideReturnScreen, setGuideReturnScreen] = useState('settings'); // kam sa vrátiť z návodu
  const dataLoadedForUser = useRef(false);
  const [loadedUserId, setLoadedUserId]   = useState(null); // účet, ktorého dáta sú práve načítané
  // Synchronizácia s databázou:
  // serverUpdatedAt = čas posledného uloženia, ktorý appka pozná (verzia dát v databáze),
  // lastSynced = dáta, ktoré sú práve také isté ako v databáze (nič neuložené),
  // latest = aktuálne dáta a obrazovka pre udalosti mimo Reactu (návrat do appky),
  // saveQueue = ukladania idú jedno po druhom, nikdy nie naraz.
  const serverUpdatedAt = useRef(null);
  const lastSynced = useRef(null);
  const latest = useRef(null);
  const saveQueue = useRef(Promise.resolve());
  const savingStopped = useRef(false);
  const loggingOut = useRef(false);
  latest.current = { user, monthsData, savingsGoals, customCategories, screen };

  const isSynced = data => !!lastSynced.current
    && data.monthsData === lastSynced.current.monthsData
    && data.savingsGoals === lastSynced.current.savingsGoals
    && data.customCategories === lastSynced.current.customCategories;

  const applyLoadedData = loaded => {
    // Starším dátam doplní čísla transakcií a prepojí ciele s transakciami. Výsledok je pri
    // každom načítaní rovnaký, takže sa uloží až spolu s ďalšou zmenou.
    const migrated = migrateGoalLinks(loaded.monthsData, loaded.savingsGoals);
    const synced = {
      monthsData: migrated.monthsData,
      savingsGoals: migrated.savingsGoals,
      customCategories: loaded.customCategories ?? DEFAULT_SUBCATEGORIES,
    };
    serverUpdatedAt.current = loaded.updatedAt ?? null;
    lastSynced.current = synced;
    setMonthsData(synced.monthsData);
    setSavingsGoals(synced.savingsGoals);
    setCustomCategories(synced.customCategories);
  };

  // Hneď uloží aktuálne dáta (nečaká na 1 s). Vráti 'saved', 'conflict' alebo 'error'.
  const flushNow = () => {
    const { user: currentUser, monthsData: md, savingsGoals: sg, customCategories: cc } = latest.current;
    if (!currentUser || !dataLoadedForUser.current) return Promise.resolve('saved');
    return queueSave(currentUser.id, { monthsData: md, savingsGoals: sg, customCategories: cc });
  };

  // Odhlásenie tlačidlom. Najprv uloží poslednú zmenu. Ak sa to nepodarí (napr. bez internetu),
  // opýta sa, či sa má odhlásiť aj tak, lebo neuložené zmeny by sa stratili.
  const logout = async ({ force = false } = {}) => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      setConfirmUnsavedLogout(false);
      if (!force && (await flushNow()) === 'error') {
        setConfirmUnsavedLogout(true);
        return;
      }
      clearActivity();
      await supabase.auth.signOut();
    } finally {
      loggingOut.current = false;
    }
  };

  // Odhlásenie po hodine nečinnosti. Ak sa posledné zmeny nepodarilo uložiť, zatiaľ neodhlási,
  // aby sa nestratili. Skúsi to znova pri ďalšej kontrole (raz za minútu), keď už budú uložené.
  const logoutForInactivity = async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      if ((await flushNow()) === 'error') return;
      clearActivity();
      setLogoutInfo('Odhlásili sme ťa po hodine nečinnosti. Prihlás sa znova.');
      await supabase.auth.signOut();
    } finally {
      loggingOut.current = false;
    }
  };

  // Zmazanie účtu. Najprv zastaví ukladanie a počká na rozbehnuté uloženie, aby sa zmazané dáta
  // neuložili späť. Ak sa zmazanie nepodarí, ukladanie znova zapne a chybu pošle ďalej (ukáže ju Profil).
  const deleteAccount = async () => {
    savingStopped.current = true;
    await saveQueue.current;
    try {
      await deleteOwnAccount();
    } catch (error) {
      savingStopped.current = false;
      throw error;
    }
    clearActivity();
    setLogoutInfo('Tvoj účet a všetky dáta boli zmazané.');
    await supabase.auth.signOut({ scope: 'local' });
  };

  // Prihlásenie zo Supabase. Session uloženú z minula prijmeme len vtedy, ak od poslednej
  // aktivity neuplynula viac ako hodina.
  useEffect(() => {
    const acceptSession = session => {
      if (session && isInactiveTooLong()) {
        setTimeout(logoutForInactivity, 0); // Supabase neodporúča volať ho priamo v tejto udalosti
        return;
      }
      if (session) {
        markActivity();
        setLogoutInfo('');
      }
      setUser(session?.user ?? null);
    };
    supabase.auth.getSession().then(({ data: { session } }) => acceptSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      acceptSession(session);
      if (event === 'PASSWORD_RECOVERY') setSettingNewPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Po odhlásení alebo zmene účtu zahodí dáta z pamäte, aby ich ďalší účet na tomto zariadení
  // nevidel, a začne od Prehľadu. Kým sa nenačítajú dáta nového účtu, ukazuje sa „Načítava...“.
  const clearDataFromMemory = () => {
    dataLoadedForUser.current = false;
    lastSynced.current = null;
    serverUpdatedAt.current = null;
    setLoadedUserId(null);
    setMonthsData({});
    setSavingsGoals([]);
    setCustomCategories(DEFAULT_SUBCATEGORIES);
    setSelectedMonth(null);
    setSelectedSubcategory(null);
    setScreen('yearly');
    setYear(currentYear);
  };

  // Load data after login
  useEffect(() => {
    if (!user) {
      if (dataLoadedForUser.current || loadedUserId) clearDataFromMemory();
      return;
    }
    clearDataFromMemory();
    savingStopped.current = false;
    setDataLoadError(null);
    setSaveFailedAt(null);
    setConfirmUnsavedLogout(false);
    setDataConflict(false);
    let cancelled = false;

    loadUserData(user.id)
      .then(loaded => {
        if (cancelled) return;
        applyLoadedData(loaded);
        dataLoadedForUser.current = true;
        setLoadedUserId(user.id);
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Nepodarilo sa načítať dáta:', error);
        setDataLoadError(error);
      });

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pridá uloženie do radu a vráti promise s výsledkom: 'saved', 'conflict' alebo 'error'.
  // Uloží len vtedy, ak sa dáta v databáze medzitým nezmenili. Inak ukáže hlášku a nič neprepíše.
  // Pri inej chybe (napr. bez internetu) appka funguje ďalej a uloženie sa skúsi znova.
  const queueSave = (userId, snapshot) => {
    saveQueue.current = saveQueue.current.then(async () => {
      if (savingStopped.current) return 'conflict'; // po konflikte už neukladáme
      if (isSynced(snapshot)) return 'saved';      // uložené netreba znova
      try {
        const updatedAt = await saveUserData(userId, snapshot.monthsData, snapshot.savingsGoals, snapshot.customCategories, serverUpdatedAt.current);
        serverUpdatedAt.current = updatedAt ?? null;
        lastSynced.current = snapshot;
        setSaveFailedAt(null);
        return 'saved';
      } catch (error) {
        if (error instanceof DataConflictError) {
          savingStopped.current = true;
          setDataConflict(true);
          return 'conflict';
        }
        console.error('Nepodarilo sa uložiť dáta:', error);
        setSaveFailedAt(Date.now());
        return 'error';
      }
    });
    return saveQueue.current;
  };

  // Automatické ukladanie 1 s po poslednej zmene. Po neúspešnom uložení to skúša znova každých 10 s.
  useEffect(() => {
    if (!user || !dataLoadedForUser.current || dataLoadError || dataConflict) return;
    const snapshot = { monthsData, savingsGoals, customCategories };
    if (isSynced(snapshot)) return;
    const timer = setTimeout(() => queueSave(user.id, snapshot), saveFailedAt ? 10_000 : 1000);
    return () => clearTimeout(timer);
  }, [monthsData, savingsGoals, customCategories, user, dataLoadError, saveFailedAt, dataConflict]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pred odchodom z appky (zamknutie mobilu, prepnutie alebo zatvorenie karty) uloží hneď,
  // aby sa nestratila zmena z poslednej sekundy. Po návrate internetu uloží, čo čaká.
  // Ak by sa zatvorením karty stratili neuložené zmeny, prehliadač sa najprv opýta.
  useEffect(() => {
    if (!user) return;
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushNow(); };
    const onBeforeUnload = event => {
      flushNow();
      if (dataLoadedForUser.current && !savingStopped.current && !isSynced(latest.current)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushNow);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('online', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushNow);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('online', flushNow);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Odhlásenie po hodine nečinnosti. Kontroluje sa pri návrate do appky, raz za minútu
  // a pri ťuknutí sa zapíše čas aktivity. Neuložená zmena sa pred odhlásením ešte uloží.
  useEffect(() => {
    if (!user) return;
    let lastMarked = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastMarked < 15_000) return; // stačí zapisovať raz za 15 s
      lastMarked = now;
      markActivity(now);
    };
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      if (isInactiveTooLong()) logoutForInactivity();
      else markActivity();
    };
    const interval = setInterval(() => { if (isInactiveTooLong()) logoutForInactivity(); }, 60_000);
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      document.removeEventListener('visibilitychange', check);
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Po návrate do appky (prepnutie karty, odomknutie mobilu) načíta novšie dáta z iného zariadenia.
  // Neurobí to, ak je niečo neuložené alebo práve triediš výpis, aby sa nič nestratilo.
  useEffect(() => {
    if (!user) return;
    const canRefresh = () => document.visibilityState === 'visible'
      && !isInactiveTooLong() // vtedy sa odhlasuje
      && dataLoadedForUser.current
      && latest.current.screen !== 'swipe'
      && isSynced(latest.current);
    const refresh = async () => {
      if (!canRefresh()) return;
      const syncedBefore = lastSynced.current;
      try {
        const loaded = await loadUserData(user.id);
        // Ak sa počas čakania niečo uložilo, odpoveď je už stará, takže ju zahodíme.
        const savedMeanwhile = lastSynced.current !== syncedBefore;
        if (!savedMeanwhile && (loaded.updatedAt ?? null) !== serverUpdatedAt.current && canRefresh()) applyLoadedData(loaded);
      } catch (error) {
        console.error('Nepodarilo sa skontrolovať novšie dáta:', error);
      }
    };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset mesiaca vymaže jeho transakcie aj ich priradenia k cieľom sporenia.
  const handleReset = () => {
    const month = monthsData[selectedMonth.key];
    if (month) setSavingsGoals(prev => removeGoalEntriesFor(prev, [...(month.history || []), ...(month.creditHistory || [])]));
    setMonthsData(prev => { const { [selectedMonth.key]: _, ...rest } = prev; return rest; });
    setScreen('swipe');
  };

  const handleAddMore = () => setScreen('swipe');

  const handleOpenGuide = () => {
    setGuideReturnScreen(screen);
    setScreen('guide');
  };

  const handleAddGoal    = data => setSavingsGoals(prev => [...prev, { ...data, id: Date.now() }]);
  const handleUpdateGoal = (id, data) => setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
  const handleDeleteGoal = id => setSavingsGoals(prev => prev.filter(g => g.id !== id));
  const handleAddCategory = category => setCustomCategories(prev => [...prev, category]);
  const handleDeleteCategory = id => setCustomCategories(prev => prev.filter(category => category.id !== id));

  const handleSelect = month => {
    setSelectedMonth(month);
    setYear(Number(month.key.slice(0, 4)));
    setSelectedSubcategory(null);
    setScreen(monthsData[month.key] ? 'results' : 'swipe');
  };

  const handleSelectCurrentSubcategory = subcategory => {
    setSelectedSubcategory(subcategory);
  };

  const handleComplete = (history, creditHistory) => {
    setMonthsData(prev => ({
      ...prev,
      [selectedMonth.key]: { history: withUids(history), creditHistory: withUids(creditHistory) },
    }));
    setScreen('results');
  };

  // Nové transakcie (napr. pridané ručne) dostanú jedinečné číslo.
  const handleUpdateHistory = newHistory => {
    setMonthsData(prev => ({ ...prev, [selectedMonth.key]: { ...prev[selectedMonth.key], history: withUids(newHistory) } }));
  };

  const handleUpdateCreditHistory = newCreditHistory => {
    setMonthsData(prev => ({ ...prev, [selectedMonth.key]: { ...prev[selectedMonth.key], creditHistory: withUids(newCreditHistory) } }));
  };

  if (user === undefined) {
    return <div className="auth-screen"><div className="auth-loading">Načítava...</div></div>;
  }

  if (!user) {
    return <AuthScreen initialError={LINK_ERROR} initialInfo={logoutInfo} />;
  }

  if (settingNewPassword) {
    return <NewPasswordScreen onDone={() => setSettingNewPassword(false)} />;
  }

  if (dataLoadError || dataConflict) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-loading">
            {dataConflict
              ? 'Dáta sa medzitým zmenili na inom zariadení. Obnov stránku, aby si videl najnovšiu verziu.'
              : 'Dáta sa nepodarilo načítať. Skontroluj pripojenie a obnov stránku.'}
          </div>
          <div className="dialog-actions">
            <button className="dialog-cancel-btn" onClick={() => supabase.auth.signOut()}>Odhlásiť sa</button>
            <button className="primary-action-btn" onClick={() => window.location.reload()}>Obnoviť stránku</button>
          </div>
        </div>
      </div>
    );
  }

  if (loadedUserId !== user.id) {
    return <div className="auth-screen"><div className="auth-loading">Načítava...</div></div>;
  }

  // Pruh hore, keď sa zmeny nepodarilo uložiť, a otázka pred odhlásením s neuloženými zmenami.
  const saveNotices = (
    <>
      {saveFailedAt && (
        <div className="save-error-banner" role="alert">
          <span>Zmeny sa nepodarilo uložiť. Skontroluj internet, skúšam to znova.</span>
          <button type="button" onClick={flushNow}>Skúsiť teraz</button>
        </div>
      )}
      {confirmUnsavedLogout && (
        <div className="confirm-overlay" onClick={() => setConfirmUnsavedLogout(false)}>
          <div className="confirm-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-modal-title">Zmeny nie sú uložené</h3>
            <p className="confirm-modal-text">Posledné zmeny sa nepodarilo uložiť. Ak sa teraz odhlásiš, stratia sa.</p>
            <div className="confirm-modal-actions">
              <button className="confirm-modal-cancel" onClick={() => setConfirmUnsavedLogout(false)}>Zostať</button>
              <button className="confirm-modal-ok" style={{ background: 'var(--negative)' }} onClick={() => logout({ force: true })}>Odhlásiť aj tak</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const nav = NAV_FOR_SCREEN[screen];
  const withNav = content => (
    <>
      {saveNotices}
      {content}
      <BottomNav active={nav} onNavigate={key => setScreen(SCREEN_FOR_NAV[key])} />
    </>
  );

  const yearSwitch = { year, minYear: yearRange.min, maxYear: yearRange.max, onChangeYear: setYear };

  if (screen === 'yearly' || screen === 'savings') {
    return withNav(<YearlyScreen tab={screen === 'savings' ? 'sporenie' : 'prehled'} {...yearSwitch} months={months} monthsData={monthsData} customCategories={customCategories} savingsGoals={savingsGoals} onAddGoal={handleAddGoal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal} onOpenMonths={() => setScreen('months')} onOpenGuide={handleOpenGuide} isNewUser={dataLoadedForUser.current && Object.keys(monthsData).length === 0} onSelectMonth={handleSelect} user={user} onLogout={() => logout()} />);
  }

  if (screen === 'settings') {
    return withNav(<SettingsScreen onOpenProfile={() => setScreen('profile')} onOpenCategories={() => setScreen('categories')} onOpenGuide={handleOpenGuide} />);
  }

  if (screen === 'guide') {
    return withNav(<GuideScreen onBack={() => setScreen(guideReturnScreen)} />);
  }

  if (screen === 'profile') {
    const handleExportData = () => downloadJson(exportFileName(), buildExport({ email: user.email, monthsData, savingsGoals, customCategories }));
    return withNav(<ProfileScreen user={user} onBack={() => setScreen('settings')} onLogout={() => logout()} onExportData={handleExportData} onDeleteAccount={deleteAccount} />);
  }

  if (screen === 'categories') {
    return withNav(<CategoriesScreen customCategories={customCategories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} onBack={() => setScreen('settings')} />);
  }

  // Mesiac mohol medzitým zmiznúť (napr. vymazaný na inom zariadení), vtedy ukáž zoznam mesiacov.
  if (screen === 'months' || (screen === 'results' && !monthsData[selectedMonth?.key])) {
    return withNav(<HomeScreen {...yearSwitch} months={months} monthsData={monthsData} onSelect={handleSelect} />);
  }

  if (screen === 'swipe') {
    const existingData = monthsData[selectedMonth?.key];
    const hasExisting  = existingData && (existingData.history?.length > 0 || existingData.creditHistory?.length > 0);
    return (
      <>
      {saveNotices}
      <MonthSwipeScreen
        month={selectedMonth}
        existingHistory={existingData?.history || []}
        existingCreditHistory={existingData?.creditHistory || []}
        onComplete={handleComplete}
        onBack={() => setScreen(hasExisting ? 'results' : 'months')}
      />
      </>
    );
  }

  const data = monthsData[selectedMonth.key];
  // Susedné mesiace, aj cez hranicu roka (december → január)
  const prevMonth = shiftMonth(selectedMonth.key, -1);
  const nextMonth = shiftMonth(selectedMonth.key, 1);
  return withNav(
    <ResultsScreen
      key={selectedMonth.key}
      month={selectedMonth}
      history={data.history}
      creditHistory={data.creditHistory}
      savingsGoals={savingsGoals}
      customCategories={customCategories}
      selectedSubcategory={selectedSubcategory}
      onSelectSubcategory={handleSelectCurrentSubcategory}
      onClearSubcategory={() => setSelectedSubcategory(null)}
      onUpdateHistory={handleUpdateHistory}
      onUpdateCreditHistory={handleUpdateCreditHistory}
      onUpdateGoal={handleUpdateGoal}
      onAddGoal={handleAddGoal}
      onAddMore={handleAddMore}
      onReset={handleReset}
      onBack={() => setScreen('months')}
      onPrevMonth={monthsData[prevMonth.key] ? () => handleSelect(prevMonth) : null}
      onNextMonth={monthsData[nextMonth.key] ? () => handleSelect(nextMonth) : null}
    />
  );
}

export default App;
