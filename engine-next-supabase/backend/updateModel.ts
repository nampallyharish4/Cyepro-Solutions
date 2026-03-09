import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function updateDb() {
  const { data, error } = await supabase
    .from('system_settings')
    .update({ value: 'llama-3.1-8b-instant' })
    .eq('key', 'AI_MODEL');
    
  console.log('Result:', error || 'Success');
}
updateDb();
