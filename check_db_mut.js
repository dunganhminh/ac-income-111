require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const query = supabase.from('orders').select('id');
  const res1 = await query.range(0, 999);
  console.log('Res1 len:', res1.data.length);
  
  // Try to use the same query builder for the next range:
  // Is it possible or does it throw/return empty?
  try {
     const res2 = await query.range(1000, 1999);
     console.log('Res2 len:', res2.data ? res2.data.length : res2.error);
  } catch(e) {
     console.log('Error reusing query:', e.message);
  }
}
check();
