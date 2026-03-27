import { supabase, fetchAllSupabase } from "@/lib/supabase";
import ExpensesClient from "./ExpensesClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const projectId = params.project;

  const cookieStore = await cookies();
  const role = cookieStore.get("crm_role")?.value || "admin";
  if (role !== "admin") {
    redirect("/crm/orders");
  }
  const { data: projects, error: pErr } = await supabase.from("projects").select("*").is("deleted_at", null);
  
  const filters = projectId 
    ? (q: any) => q.eq("project_id", projectId).is("deleted_at", null) 
    : (q: any) => q.is("deleted_at", null);

  const { data: expenses, error: eErr } = await fetchAllSupabase(
    "expenses",
    `id, project_id, amount_usd, reason, expense_date, created_at, amount, currency, projects(name)`,
    filters,
    { column: "expense_date", options: { ascending: false } }
  );

  const { data: ratesSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "currency_rates")
    .single();

  const initialRates = ratesSetting?.value || { vnd: 25500, aud: 1.5 };

  if (pErr) console.error("Projects Error: ", pErr);
  if (eErr) console.error("Expenses Error: ", eErr);

  return <ExpensesClient initialProjects={projects || []} initialExpenses={expenses || []} initialRates={initialRates} />;
}
