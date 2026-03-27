import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchAllSupabase(queryBuilder: any) {
  let allData: any[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await queryBuilder.range(from, from + size - 1);
    if (error) {
      console.error("Supabase fetchAll error:", error);
      return { data: null, error };
    }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < size) break;
    from += size;
  }
  return { data: allData, error: null };
}
