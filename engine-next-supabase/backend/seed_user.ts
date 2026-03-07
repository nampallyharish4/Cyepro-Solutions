import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
);

async function seed() {
  console.log('Seeding Admin User...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // Upsert admin user — creates or updates without hard deleting
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'admin@cyepro.com')
    .single();

  if (existingUser) {
    await supabase
      .from('users')
      .update({ password_hash: passwordHash, role: 'admin' })
      .eq('email', 'admin@cyepro.com');
    console.log('✅ Admin user updated! email: admin@cyepro.com');
  } else {
    const { error } = await supabase
      .from('users')
      .insert({
        email: 'admin@cyepro.com',
        password_hash: passwordHash,
        role: 'admin',
      });
    if (error) {
      console.error('Error seeding user:', error.message);
    } else {
      console.log('✅ Admin user created! email: admin@cyepro.com');
    }
  }

  // Seed operator user
  const { data: existingOp } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'operator@cyepro.com')
    .single();

  if (!existingOp) {
    const opHash = await bcrypt.hash('operator123', 10);
    await supabase
      .from('users')
      .insert({
        email: 'operator@cyepro.com',
        password_hash: opHash,
        role: 'operator',
      });
    console.log('✅ Operator user created! email: operator@cyepro.com');
  }

  console.log('Seeding Fatigue Limit Rule...');
  // Soft-upsert: deactivate old ones, insert fresh — never hard delete
  const { data: existingFatigue } = await supabase
    .from('rules')
    .select('id')
    .eq('name', 'FATIGUE_LIMIT')
    .eq('is_active', true)
    .single();

  if (existingFatigue) {
    await supabase
      .from('rules')
      .update({ condition_value: '5' })
      .eq('id', existingFatigue.id);
    console.log('✅ Fatigue limit rule updated!');
  } else {
    await supabase.from('rules').insert({
      name: 'FATIGUE_LIMIT',
      condition_type: 'system_setting',
      condition_value: '5',
      target_priority: 'SYSTEM',
      priority_order: -1,
    });
    console.log('✅ Fatigue limit rule created!');
  }
}

seed();
