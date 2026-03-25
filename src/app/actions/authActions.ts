"use server";

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { cookies } from "next/headers";

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_key_for_build";
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

const SALT = "crm_salt_2024";

export async function hashPassword(password: string) {
  return crypto.scryptSync(password, SALT, 32).toString('hex');
}

export async function loginAction(formData: FormData) {
  const supabaseAdmin = getSupabaseAdmin();
  const username = formData.get("username")?.toString();
  const password = formData.get("password")?.toString();
  
  if (!username || !password) {
    return { success: false, error: "Vui lòng nhập Username và Password." };
  }

  const hash = await hashPassword(password);

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("username", username)
    .is("deleted_at", null) // Không cho đăng nhập tài khoản đã bị xoá
    .single();

  if (error) {
    console.error("Supabase Auth Error:", error);
    return { success: false, error: `Lỗi kết nối DB: ${error.message} (Kiểm tra lại SERVICE_ROLE_KEY)` };
  }
  
  if (!user) {
    return { success: false, error: "Tài khoản không tồn tại." };
  }

  if (user.password_hash !== hash) {
    return { success: false, error: "Mật khẩu không chính xác." };
  }

  const cookieStore = await cookies();
  cookieStore.set("crm_role", user.global_role, { path: "/", maxAge: 60 * 60 * 24 * 7 });
  cookieStore.set("crm_user_id", user.id, { path: "/", maxAge: 60 * 60 * 24 * 7 });
  cookieStore.set("crm_full_name", user.full_name || username, { path: "/", maxAge: 60 * 60 * 24 * 7 });

  return { success: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("crm_role");
  cookieStore.delete("crm_user_id");
  cookieStore.delete("crm_full_name");
  
  return { success: true };
}
