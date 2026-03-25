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

export async function saveProjectAction(formData: any, editingId: string | null = null) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const payload = {
      name: formData.name,
      website_url: formData.website_url,
      woo_consumer_key: formData.woo_consumer_key,
      woo_consumer_secret: formData.woo_consumer_secret,
      income_rule_type: formData.income_rule_type,
      income_percentage: formData.income_percentage,
      telegram_active: formData.telegram_active,
      telegram_chat_id: formData.telegram_chat_id,
      income_rules: formData.income_rules || []
    };

    if (editingId) {
      const { data, error } = await supabaseAdmin
        .from("projects")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
        
      if (error) throw error;
      revalidatePath("/crm/settings");
      return { success: true, data };
    } else {
      const { data, error } = await supabaseAdmin
        .from("projects")
        .insert([payload])
        .select()
        .single();
        
      if (error) throw error;
      revalidatePath("/crm/settings");
      return { success: true, data };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProjectAction(projectId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", projectId)
      .select();
      
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(`Xoá thất bại: Không tìm thấy Project có ID ${projectId} (hoặc bị chặn DB)`);
    }
    revalidatePath("/crm/settings");
    return { success: true, count: data.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
