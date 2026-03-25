"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function saveRatesAction(rates: { vnd: number, aud: number }) {
  try {
    const { error } = await supabase
      .from("system_settings")
      .upsert({ key: "currency_rates", value: rates }, { onConflict: 'key' });
      
    if (error) throw error;
    
    revalidatePath("/crm");
    revalidatePath("/crm/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
