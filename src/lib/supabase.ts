import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nfkruisgrrpokhmiejas.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HqyN95xXjDKJNBswi885ww_2v1VnKzz';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
