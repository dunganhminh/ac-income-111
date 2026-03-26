"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { hashPassword } from "./authActions";
import { cookies } from "next/headers";

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_key_for_build";
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

export async function createUserAction(formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin();
  const username = formData.get("username")?.toString();
  const password = formData.get("password")?.toString();
  const full_name = formData.get("full_name")?.toString() || username;
  const role = formData.get("role")?.toString() || "staff";
  
  if (!username || !password) {
    return { success: false, error: "Thiếu Username hoặc Password" };
  }

  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (existingUser) {
    return { success: false, error: "Username này đã tồn tại!" };
  }

  const hash = await hashPassword(password);

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert([{
      username,
      password_hash: hash,
      full_name,
      global_role: role,
      email: `${username}@internal.com`
    }])
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/crm/settings");
  return { success: true, user: data };
}

export async function deleteUserAction(id: string) {
  const supabaseAdmin = getSupabaseAdmin();
  // Soft delete: update deleted_at instead of permanently deleting
  const { error } = await supabaseAdmin
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
    
  if (error) return { success: false, error: error.message };
  revalidatePath("/crm/settings");
  return { success: true };
}

export async function updateUserRoleAction(id: string, newRole: string) {
  const cookieStore = await cookies();
  const callerId = cookieStore.get("crm_user_id")?.value;
  if (!callerId) return { success: false, error: "Chưa đăng nhập!" };

  const supabaseAdmin = getSupabaseAdmin();

  // Xác thực chỉ Super Admin (vutieulong) mới được quyền
  const { data: caller } = await supabaseAdmin.from("users").select("username").eq("id", callerId).single();
  
  if (!caller || caller.username !== "vutieulong") {
    return { success: false, error: "Access Denied: Chỉ Super Admin 'vutieulong' mới có quyền thay đổi cấp độ tài khoản của người khác!" };
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update({ global_role: newRole })
    .eq("id", id);
    
  if (error) return { success: false, error: error.message };
  revalidatePath("/crm/settings");
  return { success: true };
}
