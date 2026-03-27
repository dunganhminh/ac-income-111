import { supabase, fetchAllSupabase } from "@/lib/supabase";
import OrdersClient from "./OrdersClient";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const params = await searchParams;
  const projectId = params.project;

  const filters = projectId 
    ? (q: any) => q.eq("project_id", projectId).is("deleted_at", null) 
    : (q: any) => q.is("deleted_at", null);

  const { data: orders, error: oErr } = await fetchAllSupabase(
    "orders",
    "id, project_id, order_number, created_at, status, total_price, shipping_fee, paypal_fee, total_income, manual_adjustment, products_summary, utm_source, customer:customer_id(full_name, email, phone)",
    filters,
    { column: "created_at", options: { ascending: false } }
  );

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
