// src/lib/customSupabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ldjdqbucmnfxuifieqhp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sFkYqoZQmYvoV3iuvtaLzA_oRvXRR_q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
