import { supabase } from '../supabaseClient';

// Uloženie odmietnuté, lebo dáta medzitým uložilo iné zariadenie alebo iná karta prehliadača.
export class DataConflictError extends Error {
  constructor() {
    super('Dáta sa medzitým zmenili na inom zariadení.');
    this.name = 'DataConflictError';
  }
}

// updatedAt = čas posledného uloženia. Slúži ako „verzia“ dát pri ďalšom ukladaní.
export async function loadUserData(userId) {
  const { data, error } = await supabase
    .from('user_data')
    .select('months_data, savings_goals, custom_categories, updated_at')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) {
    return { monthsData: {}, savingsGoals: [], customCategories: null, updatedAt: null };
  }
  const monthsData = Object.fromEntries(
    Object.entries(data.months_data || {}).map(([key, month]) => {
      const { openingBalance, ...monthWithoutBalance } = month;
      return [key, monthWithoutBalance];
    })
  );
  return {
    monthsData,
    savingsGoals: data.savings_goals || [],
    customCategories: data.custom_categories,
    updatedAt: data.updated_at ?? null,
  };
}

// Uloží dáta a vráti nový čas uloženia.
// expectedUpdatedAt = čas, ktorý appka naposledy videla v databáze. Ak sa medzitým zmenil
// (uložilo iné zariadenie), dáta sa neprepíšu a funkcia vyhodí DataConflictError.
export async function saveUserData(userId, monthsData, savingsGoals, customCategories, expectedUpdatedAt = null) {
  const row = {
    months_data: monthsData,
    savings_goals: savingsGoals,
    custom_categories: customCategories,
    updated_at: new Date().toISOString(),
  };

  // Nový používateľ: v databáze ešte nič nie je, takže nie je čo prepísať.
  if (expectedUpdatedAt == null) {
    const { data, error } = await supabase
      .from('user_data')
      .upsert({ user_id: userId, ...row }, { onConflict: 'user_id' })
      .select('updated_at')
      .single();
    if (error) throw error;
    return data.updated_at;
  }

  const { data, error } = await supabase
    .from('user_data')
    .update(row)
    .eq('user_id', userId)
    .eq('updated_at', expectedUpdatedAt)
    .select('updated_at');
  if (error) throw error;
  if (!data.length) throw new DataConflictError();
  return data[0].updated_at;
}
