export const MONTH_NAMES = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];

// "v januári", "vo februári" … pre texty typu "+120,00 € v októbri"
export const MONTH_NAMES_IN = ['v januári','vo februári','v marci','v apríli','v máji','v júni','v júli','v auguste','v septembri','v októbri','v novembri','v decembri'];

export const CATS = [
  { key: 'needs',   label: 'Needs',   color: '#E8C547' },
  { key: 'wants',   label: 'Wants',   color: '#9D7CF2' },
  { key: 'savings', label: 'Savings', color: '#4FA3E8' },
  { key: 'prijem',  label: 'Príjem',  color: '#2FBF7F' },
];

export const DEFAULT_SUBCATEGORIES = [
  { id: 'default-income-main', name: 'Hlavný príjem', type: 'income' },
  { id: 'default-income-secondary', name: 'Vedľajší príjem', type: 'income' },
  { id: 'default-expense-food', name: 'Jedlo', type: 'expense' },
  { id: 'default-expense-housing', name: 'Bývanie', type: 'expense' },
  { id: 'default-expense-entertainment', name: 'Zábava', type: 'expense' },
];

export const CAT_MAP    = Object.fromEntries(CATS.map(c => [c.key, c]));
export const SPLIT_INFO = { key: 'split', label: 'Rozdeliť', color: '#4C7DFF' };
export const THRESHOLD  = 80;
