require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    const { data: audits, error: e1 } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('--- RECENT AUDIT LOGS ---');
    console.log(JSON.stringify(audits, null, 2));

    const { data: events, error: e2 } = await supabase.from('notification_events').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('\n--- RECENT EVENTS ---');
    console.log(JSON.stringify(events, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
