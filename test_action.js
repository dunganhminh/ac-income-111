const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const projectId = '3bb51d97-d6cb-49fe-80b4-1e302727782e'; // Gấu Bông Premium
  console.log("Attempting to delete project:", projectId);
  
  const { data, error } = await supabaseAdmin
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", projectId)
    .select();
    
  console.log("Error:", error);
  console.log("Data:", data);
}
main();
