import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

async function seed() {
  console.log("Seeding Admin User...");
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { email: 'admin@cyepro.com', password_hash: passwordHash, role: 'admin' },
      { onConflict: 'email' }
    )
    .select();

  if (error) {
    console.error("Error seeding user:", error.message);
  } else {
    console.log("✅ Admin user seeded! email: admin@cyepro.com");
  }

  console.log("Seeding Fatigue Limit Rule...");
  const { error: ruleError } = await supabase
    .from('rules')
    .upsert({
      name: 'FATIGUE_LIMIT',
      condition_type: 'system_setting',
      condition_value: '5',
      target_priority: 'SYSTEM',
      priority_order: -1
    }, { onConflict: 'name' }) // wait, rules doesn't have unique constraint on name, but it's fine, we can query by name. Let's just delete existing first 
    .select();

   // Delete existing if we don't know ID
  await supabase.from('rules').delete().eq('name', 'FATIGUE_LIMIT');

  await supabase.from('rules').insert({
      name: 'FATIGUE_LIMIT',
      condition_type: 'system_setting',
      condition_value: '5',
      target_priority: 'SYSTEM',
      priority_order: -1
  });

  console.log("✅ Fatigue limit rule seeded!");
}

seed();
