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

// Ako stiahnuť CSV výpis z banky. Zobrazuje sa v návode aj pri nahrávaní výpisu.
// TODO: zatiaľ všeobecné kroky. Presný postup pre každú banku doplní autor appky.
export const BANK_STATEMENT_HELP = {
  tatra: {
    label: 'Tatra banka',
    from: 'z Tatra banky',
    steps: [
      'V internet bankingu Tatra banky otvor pohyby na účte.',
      'Vyber obdobie jedného mesiaca.',
      'Stiahni pohyby ako súbor CSV.',
    ],
  },
  revolut: {
    label: 'Revolut',
    from: 'z Revolutu',
    steps: [
      'V appke Revolut otvor výpis (Statement) eurového účtu.',
      'Vyber formát Excel (CSV), jazyk English a obdobie jedného mesiaca.',
      'Stiahnutý súbor nahraj do appky.',
    ],
  },
  vub: {
    label: 'VÚB',
    from: 'z VÚB',
    steps: [
      'V internet bankingu VÚB otvor pohyby na účte za jeden mesiac a exportuj ich do Excelu (.xls).',
      'Ak platíš kreditnou kartou, otvor aj transakcie karty za ten istý mesiac a tiež ich exportuj.',
      'Oba súbory nahraj do toho istého mesiaca, každý zvlášť. Splátky kreditnej karty z výpisu účtu appka vynechá, aby sa výdavky nerátali dvakrát.',
    ],
  },
};

export const CAT_MAP    = Object.fromEntries(CATS.map(c => [c.key, c]));
export const SPLIT_INFO = { key: 'split', label: 'Rozdeliť', color: '#4C7DFF' };
export const THRESHOLD  = 80;

// Zásady ochrany súkromia: kto appku prevádzkuje a kam mu písať.
// TODO pred spustením pre verejnosť: doplniť meno prevádzkovateľa a kontaktný email.
export const PRIVACY_CONTACT = { operator: null, email: null, validFrom: '24.\u00a011.\u00a02026' };
