require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAll() {
  let allData = [];
  let from = 0;
  const size = 1000;
  
  while (true) {
    const { data, error } = await supabase.from('orders').select('id').range(from, from + size - 1);
    if (error) { console.error(error); break; }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < size) break;
    from += size;
  }
  console.log('Total Fetched manually looping:', allData.length);
}
fetchAll();
