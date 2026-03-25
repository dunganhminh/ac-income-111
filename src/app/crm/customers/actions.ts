"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_key_for_build";
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

export async function deleteCustomersAction(customerIds: string[]) {
  if (!customerIds || customerIds.length === 0) {
    return { success: false, error: "Không có khách hàng nào được chọn." };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Xóa trực tiếp khỏi bảng customers
  const { error } = await supabaseAdmin
    .from("customers")
    .delete()
    .in("id", customerIds);

  if (error) {
    console.error("Delete customer error:", error);
    return { success: false, error: "Có lỗi khi xóa khách hàng: " + error.message };
  }

  revalidatePath("/crm/customers");
  return { success: true };
}
