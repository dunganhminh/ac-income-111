import { supabase, fetchAllSupabase } from "@/lib/supabase";
import CustomersClient from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const projectId = params.project;

  let query = supabase
    .from("customers")
    .select(`id, full_name, email, phone, tags, last_order_date, lifetime_orders, lifetime_spent, project:project_id(name)`)
    .is("deleted_at", null);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data: customers, error } = await fetchAllSupabase(query);

  if (error) {
    console.error("Error fetching customers:", error);
  }

  return <CustomersClient initialCustomers={customers || []} />;
}
