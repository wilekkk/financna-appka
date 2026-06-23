import { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { generateMonths, computeOpeningBalance, isFirstInChain } from './utils/finance';
import { loadUserData, saveUserData } from './utils/db';
import AuthScreen from './components/AuthScreen';
import YearlyScreen from './components/YearlyScreen';
import HomeScreen from './components/HomeScreen';
import MonthSwipeScreen from './components/MonthSwipeScreen';
import ResultsScreen from './components/ResultsScreen';

function App() {
  const [user, setUser]                    = useState(undefined); // undefined = loading
  const [screen, setScreen]               = useState('yearly');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthsData, setMonthsData]       = useState({});
  const [savingsGoals, setSavingsGoals]   = useState([]);
  const months = useMemo(() => generateMonths(), []);
  const isInitialLoad = useRef(true);

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
    if (!user) return;
    isInitialLoad.current = true;
    loadUserData(user.id).then(({ monthsData: md, savingsGoals: sg }) => {
      setMonthsData(md);
      setSavingsGoals(sg);
      isInitialLoad.current = false;
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave to Supabase (debounced 1 s)
  useEffect(() => {
    if (!user || isInitialLoad.current) return;
    const timer = setTimeout(() => saveUserData(user.id, monthsData, savingsGoals), 1000);
    return () => clearTimeout(timer);
  }, [monthsData, savingsGoals, user]);

  const handleReset = () => {
    setMonthsData(prev => { const { [selectedMonth.key]: _, ...rest } = prev; return rest; });
    setScreen('swipe');
  };

  const handleAddMore = () => setScreen('swipe');

  const handleAddGoal    = data => setSavingsGoals(prev => [...prev, { ...data, id: Date.now() }]);
  const handleUpdateGoal = (id, data) => setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
  const handleDeleteGoal = id => setSavingsGoals(prev => prev.filter(g => g.id !== id));

  const handleSelect = month => {
    setSelectedMonth(month);
    setScreen(monthsData[month.key] ? 'results' : 'swipe');
  };

  const handleComplete = (history, creditHistory) => {
    setMonthsData(prev => ({
      ...prev,
      [selectedMonth.key]: { history, creditHistory, openingBalance: prev[selectedMonth.key]?.openingBalance ?? 0 },
    }));
    setScreen('results');
  };

  const handleUpdateOpeningBalance = value => {
    setMonthsData(prev => ({ ...prev, [selectedMonth.key]: { ...prev[selectedMonth.key], openingBalance: value } }));
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

  if (screen === 'yearly') {
    return <YearlyScreen months={months} monthsData={monthsData} savingsGoals={savingsGoals} onAddGoal={handleAddGoal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal} onOpenMonths={() => setScreen('months')} onSelectMonth={handleSelect} user={user} onLogout={() => supabase.auth.signOut()} />;
  }

  if (screen === 'months') {
    return <HomeScreen months={months} monthsData={monthsData} onSelect={handleSelect} onBack={() => setScreen('yearly')} />;
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
  const computedOpening = computeOpeningBalance(selectedMonth.key, months, monthsData);
  const isFirst = isFirstInChain(selectedMonth.key, months, monthsData);
  return (
    <ResultsScreen
      month={selectedMonth}
      history={data.history}
      creditHistory={data.creditHistory}
      openingBalance={computedOpening}
      isFirstInChain={isFirst}
      savingsGoals={savingsGoals}
      onUpdateOpeningBalance={handleUpdateOpeningBalance}
      onUpdateHistory={handleUpdateHistory}
      onUpdateCreditHistory={handleUpdateCreditHistory}
      onUpdateGoal={handleUpdateGoal}
      onAddGoal={handleAddGoal}
      onAddMore={handleAddMore}
      onReset={handleReset}
      onBack={() => setScreen('months')}
    />
  );
}

export default App;
