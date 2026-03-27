import { supabase, fetchAllSupabase } from "@/lib/supabase";
import AnalyticsClient from "./AnalyticsClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const projectId = params.project;

  const cookieStore = await cookies();
  const role = cookieStore.get("crm_role")?.value || "admin";
  if (role !== "admin") {
    redirect("/crm/orders");
  }
  const { data: projects } = await supabase.from("projects").select("*");

  let query = supabase
    .from("orders")
    .select("*")
    .is("deleted_at", null);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }
  const { data: orders } = await fetchAllSupabase(query);

  let expensesQuery = supabase
    .from("expenses")
    .select("*")
    .is("deleted_at", null);

  if (projectId) {
    expensesQuery = expensesQuery.eq("project_id", projectId);
  }
  const { data: expenses } = await fetchAllSupabase(expensesQuery);

  let custQuery = supabase.from("customers").select("*");
  if (projectId) custQuery = custQuery.eq("project_id", projectId);
  const { data: customers } = await fetchAllSupabase(custQuery);

  const { data: ratesSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "currency_rates")
    .single();
  const rates = ratesSetting?.value || { vnd: 25500, aud: 1.5 };

  return <AnalyticsClient 
     initialProjects={projects || []} 
     initialOrders={orders || []} 
     initialExpenses={expenses || []} 
     initialCustomers={customers || []} 
     initialRates={rates} 
  />;
}
