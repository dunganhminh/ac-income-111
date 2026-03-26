import { supabase } from "@/lib/supabase";
import DashboardClient from "./DashboardClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const cookieStore = await cookies();
  const role = cookieStore.get("crm_role")?.value || "admin";
  const isAdmin = role === "admin";
  const params = await searchParams;
  const projectId = params.project;

  // Fetch overarching context data for all projects
  const { data: projects, error: pErr } = await supabase.from('projects').select('*').is('deleted_at', null);
  
  // Queries (Optimized for Maximum 100k rows with specific tiny columns to save Vercel RAM)
  let oQuery = supabase.from('orders')
    .select('id, project_id, status, total_price, shipping_fee, paypal_fee, total_income, manual_adjustment, created_at')
    .is('deleted_at', null)
    .not('status', 'in', '("cancelled","refunded","failed","trash")')
    .limit(100000);
    
  let cQuery = supabase.from('customers')
    .select('id, project_id, lifetime_orders, last_order_date')
    .is('deleted_at', null)
    .limit(100000);
    
  let exQuery = supabase.from('expenses')
    .select('id, project_id, amount_usd, expense_date, created_at')
    .is('deleted_at', null)
    .limit(100000);

  if (projectId) {
    oQuery = oQuery.eq('project_id', projectId);
    cQuery = cQuery.eq('project_id', projectId);
    exQuery = exQuery.eq('project_id', projectId);
  }

  const [ {data: orders, error: oErr}, {data: customers, error: cErr}, {data: expenses, error: exErr} ] = await Promise.all([oQuery, cQuery, exQuery]);

  const { data: ratesSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "currency_rates")
    .single();
  const initialRates = ratesSetting?.value || { vnd: 25500, aud: 1.5 };

  if (pErr) console.error("Projects Error:", pErr);
  if (oErr) console.error("Orders Error:", oErr);
  if (cErr) console.error("Customers Error:", cErr);
  if (exErr) console.error("Expenses Error:", exErr);

  const selectedProject = projectId ? projects?.find(p => p.id === projectId) : null;

  return <DashboardClient 
            projects={projects || []} 
            orders={orders || []} 
            customers={customers || []}
            expenses={expenses || []} 
            isAdmin={isAdmin}
            selectedProject={selectedProject}
            initialRates={initialRates}
          />;
}
