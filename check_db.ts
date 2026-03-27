import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('expenses').select('*').limit(1);
  if (error) console.error("Error", error);
  else console.log("Expense schema preview:", JSON.stringify(data[0], null, 2));
}

main();
