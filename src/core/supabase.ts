import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const SUPABASE_URL = 'https://nymrtujjmzbhxcimjsci.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_b2ytleL3Uz9w5NKkd1v7hg_FPiAl888';

export const supabaseClient = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);
