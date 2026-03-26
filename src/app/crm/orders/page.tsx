import { supabase } from "@/lib/supabase";
import OrdersClient from "./OrdersClient";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const projectId = params.project;

  let query = supabase
    .from("orders")
    .select("*, customer:customer_id (full_name, email, phone)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100000);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data: orders, error: oErr } = await query;

  if (oErr) {
    return <div className="p-8 text-red-500 font-bold">Lỗi tải dữ liệu Đơn hàng: {oErr.message}</div>;
  }

  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("id, name")
    .is("deleted_at", null);

  if (pErr) {
    console.error("Error fetching projects:", pErr);
  }

  const cookieStore = await cookies();
  const role = cookieStore.get("crm_role")?.value || "admin";

  return <OrdersClient initialOrders={orders || []} initialProjects={projects || []} role={role} />;
}
