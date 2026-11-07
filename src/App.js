import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { generateMonths, getYearRange, shiftMonth } from './utils/finance';
import { DEFAULT_SUBCATEGORIES } from './constants';
import { loadUserData, saveUserData, DataConflictError } from './utils/db';
import AuthScreen from './components/AuthScreen';
import NewPasswordScreen from './components/NewPasswordScreen';
import YearlyScreen from './components/YearlyScreen';
import HomeScreen from './components/HomeScreen';
import MonthSwipeScreen from './components/MonthSwipeScreen';
import ResultsScreen from './components/ResultsScreen';
import SettingsScreen from './components/SettingsScreen';
import ProfileScreen from './components/ProfileScreen';
import CategoriesScreen from './components/CategoriesScreen';
import BottomNav from './components/BottomNav';

// Ktorá položka spodného menu svieti na ktorej obrazovke. Obrazovky bez položky menu nemajú.
const NAV_FOR_SCREEN = {
  yearly: 'prehled', savings: 'sporenie', months: 'mesiace', results: 'mesiace',
  settings: 'nastavenia', profile: 'nastavenia', categories: 'nastavenia',
};
const SCREEN_FOR_NAV = { prehled: 'yearly', sporenie: 'savings', mesiace: 'months', nastavenia: 'settings' };

// Odkaz z emailu (obnova hesla, potvrdenie registrácie) pridá informácie do adresy za znak #.
// Čítame ich hneď pri štarte, kým ich Supabase z adresy neodstráni.
const START_HASH = window.location.hash;
const OPENED_FROM_RECOVERY_LINK = START_HASH.includes('type=recovery');
const LINK_ERROR = START_HASH.includes('error_code=')
  ? 'Odkaz z emailu vypršal alebo už bol použitý. Požiadaj o nový.'
  : '';

function App() {
  const [user, setUser]                    = useState(undefined); // undefined = loading
  const [screen, setScreen]               = useState('yearly');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthsData, setMonthsData]       = useState({});
  const [savingsGoals, setSavingsGoals]   = useState([]);
  const [customCategories, setCustomCategories] = useState(DEFAULT_SUBCATEGORIES);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [dataLoadError, setDataLoadError] = useState(null);
  const [dataSaveError, setDataSaveError] = useState(null);
  const [settingNewPassword, setSettingNewPassword] = useState(OPENED_FROM_RECOVERY_LINK);
  const currentYear = new Date().getFullYear();
  const [year, setYear]                   = useState(currentYear);
  const months = useMemo(() => generateMonths(year), [year]);
  const yearRange = getYearRange(monthsData, currentYear);
  const [dataConflict, setDataConflict]   = useState(false);
  const dataLoadedForUser = useRef(false);
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
  latest.current = { monthsData, savingsGoals, customCategories, screen };

  const isSynced = data => !!lastSynced.current
    && data.monthsData === lastSynced.current.monthsData
    && data.savingsGoals === lastSynced.current.savingsGoals
    && data.customCategories === lastSynced.current.customCategories;

  const applyLoadedData = loaded => {
    const synced = {
      monthsData: loaded.monthsData,
      savingsGoals: loaded.savingsGoals,
      customCategories: loaded.customCategories ?? DEFAULT_SUBCATEGORIES,
    };
    serverUpdatedAt.current = loaded.updatedAt ?? null;
    lastSynced.current = synced;
    setMonthsData(synced.monthsData);
    setSavingsGoals(synced.savingsGoals);
    setCustomCategories(synced.customCategories);
  };

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setSettingNewPassword(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data after login
  useEffect(() => {
    if (!user) {
      dataLoadedForUser.current = false;
      return;
    }
    dataLoadedForUser.current = false;
    lastSynced.current = null;
    savingStopped.current = false;
    setDataLoadError(null);
    setDataSaveError(null);
    setDataConflict(false);
    let cancelled = false;

    loadUserData(user.id)
      .then(loaded => {
        if (cancelled) return;
        applyLoadedData(loaded);
        dataLoadedForUser.current = true;
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Nepodarilo sa načítať dáta:', error);
        setDataLoadError(error);
      });

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Automatické ukladanie 1 s po poslednej zmene. Uloží len vtedy, ak sa dáta v databáze
  // medzitým nezmenili. Inak ukáže hlášku a nič neprepíše.
  useEffect(() => {
    if (!user || !dataLoadedForUser.current || dataLoadError || dataSaveError || dataConflict) return;
    const snapshot = { monthsData, savingsGoals, customCategories };
    if (isSynced(snapshot)) return;
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        if (savingStopped.current) return; // po chybe už ďalej neukladáme
        try {
          const updatedAt = await saveUserData(user.id, monthsData, savingsGoals, customCategories, serverUpdatedAt.current);
          serverUpdatedAt.current = updatedAt ?? null;
          lastSynced.current = snapshot;
        } catch (error) {
          savingStopped.current = true;
          if (error instanceof DataConflictError) {
            setDataConflict(true);
          } else {
            console.error('Nepodarilo sa uložiť dáta:', error);
            setDataSaveError(error);
          }
        }
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [monthsData, savingsGoals, customCategories, user, dataLoadError, dataSaveError, dataConflict]); // eslint-disable-line react-hooks/exhaustive-deps

  // Po návrate do appky (prepnutie karty, odomknutie mobilu) načíta novšie dáta z iného zariadenia.
  // Neurobí to, ak je niečo neuložené alebo práve triediš výpis, aby sa nič nestratilo.
  useEffect(() => {
    if (!user) return;
    const canRefresh = () => document.visibilityState === 'visible'
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

  const handleReset = () => {
    setMonthsData(prev => { const { [selectedMonth.key]: _, ...rest } = prev; return rest; });
    setScreen('swipe');
  };

  const handleAddMore = () => setScreen('swipe');

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
      [selectedMonth.key]: { history, creditHistory },
    }));
    setScreen('results');
  };

  const handleUpdateHistory = newHistory => {
    setMonthsData(prev => ({ ...prev, [selectedMonth.key]: { ...prev[selectedMonth.key], history: newHistory } }));
  };

  const handleUpdateCreditHistory = newCreditHistory => {
    setMonthsData(prev => ({ ...prev, [selectedMonth.key]: { ...prev[selectedMonth.key], creditHistory: newCreditHistory } }));
  };

  if (user === undefined) {
    return <div className="auth-screen"><div className="auth-loading">Načítava...</div></div>;
  }

  if (!user) {
    return <AuthScreen initialError={LINK_ERROR} />;
  }

  if (settingNewPassword) {
    return <NewPasswordScreen onDone={() => setSettingNewPassword(false)} />;
  }

  if (dataLoadError || dataSaveError || dataConflict) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-loading">
            {dataConflict
              ? 'Dáta sa medzitým zmenili na inom zariadení. Obnov stránku, aby si videl najnovšiu verziu.'
              : 'Dáta sa nepodarilo synchronizovať. Obnov stránku a skontroluj pripojenie.'}
          </div>
          <div className="dialog-actions">
            <button className="dialog-cancel-btn" onClick={() => supabase.auth.signOut()}>Odhlásiť sa</button>
            <button className="primary-action-btn" onClick={() => window.location.reload()}>Obnoviť stránku</button>
          </div>
        </div>
      </div>
    );
  }

  const nav = NAV_FOR_SCREEN[screen];
  const withNav = content => (
    <>
      {content}
      <BottomNav active={nav} onNavigate={key => setScreen(SCREEN_FOR_NAV[key])} />
    </>
  );

  const yearSwitch = { year, minYear: yearRange.min, maxYear: yearRange.max, onChangeYear: setYear };

  if (screen === 'yearly' || screen === 'savings') {
    return withNav(<YearlyScreen tab={screen === 'savings' ? 'sporenie' : 'prehled'} {...yearSwitch} months={months} monthsData={monthsData} customCategories={customCategories} savingsGoals={savingsGoals} onAddGoal={handleAddGoal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal} onOpenMonths={() => setScreen('months')} onSelectMonth={handleSelect} user={user} onLogout={() => supabase.auth.signOut()} />);
  }

  if (screen === 'settings') {
    return withNav(<SettingsScreen onOpenProfile={() => setScreen('profile')} onOpenCategories={() => setScreen('categories')} />);
  }

  if (screen === 'profile') {
    return withNav(<ProfileScreen user={user} onBack={() => setScreen('settings')} onLogout={() => supabase.auth.signOut()} />);
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
      <MonthSwipeScreen
        month={selectedMonth}
        existingHistory={existingData?.history || []}
        existingCreditHistory={existingData?.creditHistory || []}
        onComplete={handleComplete}
        onBack={() => setScreen(hasExisting ? 'results' : 'months')}
      />
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
