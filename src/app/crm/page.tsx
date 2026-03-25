import { supabase } from "@/lib/supabase";
import DashboardClient from "./DashboardClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("crm_role")?.value || "admin";
  const isAdmin = role === "admin";

  // Fetch overarching context data for all projects
  const { data: projects, error: pErr } = await supabase.from('projects').select('*').is('deleted_at', null);
  
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('*')
    .is('deleted_at', null)
    .not('status', 'in', '("cancelled","refunded","failed","trash")');
    
  const { data: customers, error: cErr } = await supabase.from('customers').select('*').is('deleted_at', null);

  const { data: expenses, error: exErr } = await supabase.from('expenses').select('*').is('deleted_at', null);

  if (pErr) console.error("Projects Error:", pErr);
  if (oErr) console.error("Orders Error:", oErr);
  if (cErr) console.error("Customers Error:", cErr);
  if (exErr) console.error("Expenses Error (Vui lòng chạy SQL tạo bảng Expenses trên Supabase):", exErr);

  return <DashboardClient 
            projects={projects || []} 
            orders={orders || []} 
            customers={customers || []}
            expenses={expenses || []} 
            isAdmin={isAdmin}
          />;
}
