import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://epukovlbidbybaqreqze.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FwaJPmUOy50FbldI7qPhCA_6ifdnula';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
