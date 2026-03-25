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
  
  // Queries
  let oQuery = supabase.from('orders').select('*').is('deleted_at', null).not('status', 'in', '("cancelled","refunded","failed","trash")');
  let cQuery = supabase.from('customers').select('*').is('deleted_at', null);
  let exQuery = supabase.from('expenses').select('*').is('deleted_at', null);

  if (projectId) {
    oQuery = oQuery.eq('project_id', projectId);
    cQuery = cQuery.eq('project_id', projectId);
    exQuery = exQuery.eq('project_id', projectId);
  }

  const [ {data: orders, error: oErr}, {data: customers, error: cErr}, {data: expenses, error: exErr} ] = await Promise.all([oQuery, cQuery, exQuery]);

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
          />;
}
