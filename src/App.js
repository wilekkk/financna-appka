import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { generateMonths } from './utils/finance';
import { DEFAULT_SUBCATEGORIES } from './constants';
import { loadUserData, saveUserData } from './utils/db';
import AuthScreen from './components/AuthScreen';
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
  const months = useMemo(() => generateMonths(), []);
  const isInitialLoad = useRef(true);
  const dataLoadedForUser = useRef(false);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data after login
  useEffect(() => {
    if (!user) {
      dataLoadedForUser.current = false;
      return;
    }
    isInitialLoad.current = true;
    dataLoadedForUser.current = false;
    setDataLoadError(null);
    setDataSaveError(null);
    let cancelled = false;

    loadUserData(user.id)
      .then(({ monthsData: md, savingsGoals: sg, customCategories: cc }) => {
        if (cancelled) return;
        setMonthsData(md);
        setSavingsGoals(sg);
        setCustomCategories(cc ?? DEFAULT_SUBCATEGORIES);
        dataLoadedForUser.current = true;
        isInitialLoad.current = false;
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Nepodarilo sa načítať dáta:', error);
        setDataLoadError(error);
      });

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave to Supabase (debounced 1 s)
  useEffect(() => {
    if (!user || isInitialLoad.current || !dataLoadedForUser.current || dataLoadError || dataSaveError) return;
    const timer = setTimeout(async () => {
      try {
        await saveUserData(user.id, monthsData, savingsGoals, customCategories);
      } catch (error) {
        console.error('Nepodarilo sa uložiť dáta:', error);
        setDataSaveError(error);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [monthsData, savingsGoals, customCategories, user, dataLoadError, dataSaveError]);

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
    return <AuthScreen />;
  }

  if (dataLoadError || dataSaveError) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-loading">Dáta sa nepodarilo synchronizovať. Obnov stránku a skontroluj pripojenie.</div>
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

  if (screen === 'yearly' || screen === 'savings') {
    return withNav(<YearlyScreen tab={screen === 'savings' ? 'sporenie' : 'prehled'} months={months} monthsData={monthsData} customCategories={customCategories} savingsGoals={savingsGoals} onAddGoal={handleAddGoal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal} onOpenMonths={() => setScreen('months')} onSelectMonth={handleSelect} user={user} onLogout={() => supabase.auth.signOut()} />);
  }

  if (screen === 'settings') {
    return withNav(<SettingsScreen onOpenProfile={() => setScreen('profile')} onOpenCategories={() => setScreen('categories')} />);
  }

  if (screen === 'profile') {
    return withNav(<ProfileScreen user={user} onBack={() => setScreen('settings')} />);
  }

  if (screen === 'categories') {
    return withNav(<CategoriesScreen customCategories={customCategories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} onBack={() => setScreen('settings')} />);
  }

  if (screen === 'months') {
    return withNav(<HomeScreen months={months} monthsData={monthsData} onSelect={handleSelect} />);
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
  const monthIndex = months.findIndex(m => m.key === selectedMonth.key);
  const prevMonth = months[monthIndex - 1];
  const nextMonth = months[monthIndex + 1];
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
      onPrevMonth={prevMonth && monthsData[prevMonth.key] ? () => handleSelect(prevMonth) : null}
      onNextMonth={nextMonth && monthsData[nextMonth.key] ? () => handleSelect(nextMonth) : null}
    />
  );
}

export default App;
