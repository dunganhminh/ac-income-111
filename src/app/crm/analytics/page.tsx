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

  // orders
  const ordersFilters = projectId 
    ? (q: any) => q.eq("project_id", projectId).is("deleted_at", null) 
    : (q: any) => q.is("deleted_at", null);
  const { data: orders } = await fetchAllSupabase("orders", "*", ordersFilters, { column: 'created_at', options: { ascending: false } });

  // expenses
  const expFilters = projectId 
    ? (q: any) => q.eq("project_id", projectId).is("deleted_at", null) 
    : (q: any) => q.is("deleted_at", null);
  const { data: expenses } = await fetchAllSupabase("expenses", "*", expFilters, { column: 'created_at', options: { ascending: false } });

  // customers
  const custFilters = projectId 
    ? (q: any) => q.eq("project_id", projectId).is("deleted_at", null)
    : (q: any) => q.is("deleted_at", null);
  const { data: customers } = await fetchAllSupabase("customers", "*", custFilters, { column: 'created_at', options: { ascending: false } });

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
