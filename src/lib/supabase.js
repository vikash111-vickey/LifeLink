import { createClient } from '@supabase/supabase-js';

function env(key) {
  const raw = import.meta.env[key];
  if (raw == null || raw === '') return '';
  return String(raw).replace(/^["']|["']$/g, '');
}

const url = env('VITE_SUPABASE_URL');
const anonKey = env('VITE_SUPABASE_ANON_KEY');

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey)
  : null;
