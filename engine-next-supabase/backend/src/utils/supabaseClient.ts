import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Programmatic fix for common .com vs .co typo in Supabase URLs
if (supabaseUrl.endsWith('.supabase.com')) {
  supabaseUrl = supabaseUrl.replace('.supabase.com', '.supabase.co');
}

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key missing in environment.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
