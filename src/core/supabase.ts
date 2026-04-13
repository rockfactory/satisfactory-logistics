import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabaseClient = createClient<Database>(
  'https://nymrtujjmzbhxcimjsci.supabase.co',
  'sb_publishable_b2ytleL3Uz9w5NKkd1v7hg_FPiAl888',
);
