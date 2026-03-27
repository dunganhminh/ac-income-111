import { supabase, fetchAllSupabase } from "@/lib/supabase";
import CustomersClient from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const projectId = params.project;

  const filters = projectId 
    ? (q: any) => q.eq("project_id", projectId).is("deleted_at", null) 
    : (q: any) => q.is("deleted_at", null);

  const { data: customers, error } = await fetchAllSupabase(
    "customers",
    "id, full_name, email, phone, tags, last_order_date, lifetime_orders, lifetime_spent, project:project_id(name)",
    filters
  );

  if (error) {
    console.error("Error fetching customers:", error);
  }

  return <CustomersClient initialCustomers={customers || []} />;
}
