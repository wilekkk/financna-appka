export const MONTH_NAMES = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];

export const CATS = [
  { key: 'needs',   label: 'Needs',   color: '#f97316', emoji: '✅' },
  { key: 'wants',   label: 'Wants',   color: '#ef4444', emoji: '🛍️' },
  { key: 'savings', label: 'Savings', color: '#3b82f6', emoji: '💰' },
  { key: 'prijem',  label: 'Príjem',  color: '#22c55e', emoji: '💵' },
];

export const DEFAULT_SUBCATEGORIES = [
  { id: 'default-income-main', name: 'Hlavný príjem', type: 'income' },
  { id: 'default-income-secondary', name: 'Vedľajší príjem', type: 'income' },
  { id: 'default-expense-food', name: 'Jedlo', type: 'expense' },
  { id: 'default-expense-housing', name: 'Bývanie', type: 'expense' },
  { id: 'default-expense-entertainment', name: 'Zábava', type: 'expense' },
];

export const CAT_MAP    = Object.fromEntries(CATS.map(c => [c.key, c]));
export const SPLIT_INFO = { key: 'split', label: 'Rozdeliť', color: '#8b5cf6' };
export const THRESHOLD  = 80;
