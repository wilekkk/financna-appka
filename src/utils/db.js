import { supabase } from '../supabaseClient';

export async function loadUserData(userId) {
  const { data, error } = await supabase
    .from('user_data')
    .select('months_data, savings_goals, custom_categories')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) {
    return { monthsData: {}, savingsGoals: [], customCategories: null };
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
  };
}

export async function saveUserData(userId, monthsData, savingsGoals, customCategories) {
  const { error } = await supabase.from('user_data').upsert(
    {
      user_id: userId,
      months_data: monthsData,
      savings_goals: savingsGoals,
      custom_categories: customCategories,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}
