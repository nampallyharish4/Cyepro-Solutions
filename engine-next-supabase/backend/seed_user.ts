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
    .eq('email', 'admin@npe.com')
    .single();

  if (existingUser) {
    await supabase
      .from('users')
      .update({ password_hash: passwordHash, role: 'admin' })
      .eq('email', 'admin@npe.com');
    console.log('✅ Admin user updated! email: admin@npe.com');
  } else {
    const { error } = await supabase.from('users').insert({
      email: 'admin@npe.com',
      password_hash: passwordHash,
      role: 'admin',
    });
    if (error) {
      console.error('Error seeding user:', error.message);
    } else {
      console.log('✅ Admin user created! email: admin@npe.com');
    }
  }

  // Seed operator user
  const opHash = await bcrypt.hash('operator123', 10);
  const { data: existingOp } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'operator@npe.com')
    .single();

  if (existingOp) {
    await supabase
      .from('users')
      .update({ password_hash: opHash, role: 'operator' })
      .eq('email', 'operator@npe.com');
    console.log('✅ Operator user updated! email: operator@npe.com');
  } else {
    await supabase.from('users').insert({
      email: 'operator@npe.com',
      password_hash: opHash,
      role: 'operator',
    });
    console.log('✅ Operator user created! email: operator@npe.com');
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

  // Seed default system_settings
  console.log('Seeding System Settings...');
  const defaultSettings = [
    {
      key: 'AI_MODEL',
      value: 'llama-3.3-70b-versatile',
      description: 'Primary cognitive model for classification.',
    },
    {
      key: 'DEDUPE_THRESHOLD',
      value: '0.8',
      description: 'Sensitivity for fuzzy duplicate detection (0.0-1.0).',
    },
    {
      key: 'LATER_DELAY_MIN',
      value: '30',
      description: 'Default deferral period in minutes.',
    },
    {
      key: 'FATIGUE_LIMIT',
      value: '5',
      description: 'Max high-priority alerts / hour / user.',
    },
  ];

  for (const setting of defaultSettings) {
    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .eq('key', setting.key)
      .single();

    if (!existing) {
      await supabase.from('system_settings').insert(setting);
      console.log(`✅ Setting "${setting.key}" created.`);
    } else {
      console.log(`⏭️  Setting "${setting.key}" already exists.`);
    }
  }
}

seed();
