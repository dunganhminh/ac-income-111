require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { data: p } = await supabase.from('projects').select('id, name');
  console.log('Total Orders:', count);
  console.log('Projects:', p);
  
  if (p) {
    for (const proj of p) {
      const { count: c } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('project_id', proj.id);
      console.log(proj.name, 'Orders:', c);
    }
  }
}
check();
