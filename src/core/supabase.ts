import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

export const supabaseClient = createClient<Database>(
  'https://nymrtujjmzbhxcimjsci.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bXJ0dWpqbXpiaHhjaW1qc2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc1MzY2ODcsImV4cCI6MjA0MzExMjY4N30.lOq-8ebIFLKQ1bmbw9bU4FQlKGWi-TNxyq6YVUTcR6w',
);
