"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function deleteLead(id: string) {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) {
    console.error("Error deleting lead:", error);
    return { success: false, error: error.message };
  }
  revalidatePath("/crm/leads");
  return { success: true };
}

export async function updateLeadStatus(id: string, newStatus: string) {
  const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);
  if (error) {
    console.error("Error updating lead status:", error);
    return { success: false, error: error.message };
  }
  revalidatePath("/crm/leads");
  return { success: true };
}

export async function addLead(data: any) {
  const { error } = await supabase.from("leads").insert([data]);
  if (error) {
    console.error("Error adding lead:", error);
    return { success: false, error: error.message };
  }
  revalidatePath("/crm/leads");
  return { success: true };
}
