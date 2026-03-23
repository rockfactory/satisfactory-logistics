import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabaseClient = createClient<Database>(
  'https://tsiqtavbmponisvhfgxa.supabase.co',
  'sb_publishable_UU5rxflsuZb78B9yEJwBvg_Y6p7SZC5',
);
