import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to fetch all rows using parallel requests
export async function fetchAllSupabase(
  table: string,
  selectQuery: string,
  filters?: (q: any) => any,
  order?: { column: string; options?: { ascending?: boolean; nullsFirst?: boolean } }
) {
  // First, get exactly how many rows exist (count)
  let baseQuery = supabase.from(table).select(selectQuery, { head: true, count: "exact" });
  if (filters) baseQuery = filters(baseQuery);
  const { count, error: countErr } = await baseQuery;

  if (countErr || count === null) {
    console.error("Count Error:", countErr);
    return { data: null, error: countErr };
  }

  const size = 1000;
  const totalPages = Math.ceil(count / size);
  const promises = [];

  // Generate parallel queries
  for (let i = 0; i < totalPages; i++) {
    const from = i * size;
    const to = from + size - 1;
    
    let pageQuery = supabase.from(table).select(selectQuery);
    if (filters) pageQuery = filters(pageQuery);
    if (order) pageQuery = pageQuery.order(order.column, order.options);
    
    promises.push(pageQuery.range(from, to).then(res => res.data || []));
  }

  // Await all pages to download concurrently
  const pagesData = await Promise.all(promises);
  
  // Flatten array
  const allData = pagesData.flat();
  return { data: allData, error: null };
}
