import { supabase } from "@/lib/supabase";
import CustomersClient from "./CustomersClient";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const projectId = params.project;

  let query = supabase
    .from("customers")
    .select(`*`)
    .is("deleted_at", null)
    .order("lifetime_spent", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data: customers, error } = await query;

  if (error) {
    console.error("Error fetching customers:", error);
  }

  return <CustomersClient initialCustomers={customers || []} />;
}
