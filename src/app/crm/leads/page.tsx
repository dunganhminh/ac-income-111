import { supabase } from "@/lib/supabase";
import LeadsClient from "./LeadsClient";

// Set dynamic to bypass caching
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching leads:", error);
  }

  const leadsData = leads || [];

  return (
    <LeadsClient initialLeads={leadsData} />
  );
}
