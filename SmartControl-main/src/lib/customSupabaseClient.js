// src/lib/customSupabaseClient.js
import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = "https://ldjdqbucmnfxuifieqhp.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_sFkYqoZQmYvoV3iuvtaLzA_oRvXRR_q";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    storageKey: 'smartcontrol.auth.session',
  },
  global: {
    headers: {
      'x-client-info': 'smartcontrol-web',
    },
  },
});
