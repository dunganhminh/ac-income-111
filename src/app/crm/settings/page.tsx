import { supabase } from "@/lib/supabase";
import SettingsClient from "./SettingsClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("crm_role")?.value || "admin";
  const currentUserId = cookieStore.get("crm_user_id")?.value;

  if (role !== "admin") {
    redirect("/crm/orders");
  }
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const { data: ratesSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "currency_rates")
    .single();

  const initialRates = ratesSetting?.value || { vnd: 25500, aud: 1.5 };

  if (pErr) console.error("Projects Error:", pErr);
  if (uErr) console.error("Users Error:", uErr);

  return <SettingsClient initialProjects={projects || []} initialUsers={users || []} initialRates={initialRates} currentUserId={currentUserId} />;
}
