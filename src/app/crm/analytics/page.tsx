import { supabase } from "@/lib/supabase";
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
    .select("project_id, total_income, total_price, status, utm_source, created_at, order_number")
    .is("deleted_at", null)
    .not('status', 'in', '("cancelled","refunded","failed","trash")');

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data: orders } = await query;

  let expensesQuery = supabase
    .from("expenses")
    .select("project_id, amount, expense_date")
    .is("deleted_at", null);

  if (projectId) {
    expensesQuery = expensesQuery.eq("project_id", projectId);
  }
  const { data: expenses } = await expensesQuery;

  return <AnalyticsClient initialProjects={projects || []} initialOrders={orders || []} initialExpenses={expenses || []} />;
}
