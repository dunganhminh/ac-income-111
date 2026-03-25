import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processWooCommerceOrder } from '@/lib/orderProcessor';

export async function POST(request: Request, props: { params: Promise<{ projectId: string }> }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_key_for_build";
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { projectId } = await props.params;
    
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const action = request.headers.get('x-wc-webhook-topic') || '';
    
    // Xử lý Xóa vĩnh viễn trên WooCommerce (ném vào thùng rác Soft Delete)
    if (action === 'order.deleted') {
      const wooOrderId = String(body.id || '');
      if (wooOrderId) {
        await supabaseAdmin
          .from('orders')
          .update({ deleted_at: new Date().toISOString() })
          .eq('project_id', projectId)
          .eq('order_number', wooOrderId);
        return NextResponse.json({ success: true, message: 'Order marked as deleted via Webhook' });
      }
    }

    // Xử lý Tạo Mới hoặc Cập Nhật (Upsert)
    // processWooCommerceOrder đã lo toàn bộ Customer, Order Upsert, UTM, Tags, Telegram
    // Nếu action là order.updated, suppressTelegram = true (không buzz telegram để tránh bão tin nhắn)
    const isUpdate = action === 'order.updated';
    const suppressTelegram = isUpdate; 

    if (body.id) {
       await processWooCommerceOrder(body, projectId, project, suppressTelegram);
       return NextResponse.json({ success: true, order_id: body.id });
    }

    return NextResponse.json({ success: false, message: 'Unknown webhook payload' });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
