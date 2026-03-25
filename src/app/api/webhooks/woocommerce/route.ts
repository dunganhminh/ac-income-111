import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processWooCommerceOrder } from '@/lib/orderProcessor';

// Helper to fetch Project Settings
async function getProjectSettings(projectId: string) {
  const { data } = await supabase.from('projects').select('name, income_rule_type, income_percentage, telegram_active, telegram_chat_id').eq('id', projectId).single();
  return data || { name: 'Unknown', income_rule_type: 'fixed_pack', income_percentage: 10, telegram_active: false, telegram_chat_id: null };
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    
    if (!projectId) {
      return NextResponse.json({ success: false, error: "Missing projectId parameter" }, { status: 400 });
    }

    // Fetch dynamic project rule
    const projectSettings = await getProjectSettings(projectId);
    
    // Process the order via the new shared library (Webhook never suppresses Telegram)
    await processWooCommerceOrder(payload, projectId, projectSettings, false);

    return NextResponse.json({ success: true, message: "Order processed via Central Processor" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook processing error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message || "Invalid payload" }, { status: 400 });
  }
}
