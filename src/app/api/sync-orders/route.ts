import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { processWooCommerceOrder } from '@/lib/orderProcessor';

export async function POST(req: Request) {
  try {
    const { projectId, startDate, endDate } = await req.json();

    if (!projectId || !startDate || !endDate) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch Project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    if (!project.website_url || !project.woo_consumer_key || !project.woo_consumer_secret) {
      return NextResponse.json({ success: false, error: "Website URL or WooCommerce API Keys are missing in project settings" }, { status: 400 });
    }

    // Prepare API Url and Auth
    const authHeader = 'Basic ' + Buffer.from(`${project.woo_consumer_key}:${project.woo_consumer_secret}`).toString('base64');
    const baseUrl = project.website_url.replace(/\/$/, "");

    // 2. Delete existing orders in the current sync range to PREVENT DUPLICATES!
    // Since we changed from wc_order_id to custom_order_number, old orders were sticking around and creating dupes
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('project_id', projectId)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`);

    if (deleteError) {
      console.error("Warning: Failed to delete old orders before sync:", deleteError);
    }

    let allOrders: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Remove status filter so we fetch ALL statuses (cancelled, refunded, failed, etc.)
      const url = `${baseUrl}/wp-json/wc/v3/orders?after=${startDate}T00:00:00Z&before=${endDate}T23:59:59Z&per_page=100&page=${page}`;
      
      const wpRes = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!wpRes.ok) {
        const errText = await wpRes.text();
        throw new Error(`WooCommerce API Error (${wpRes.status}): ${errText}`);
      }

      const pageOrders = await wpRes.json();
      
      if (!Array.isArray(pageOrders)) {
        throw new Error("Invalid response format from WooCommerce");
      }

      if (pageOrders.length === 0) {
        hasMore = false;
      } else {
        allOrders = allOrders.concat(pageOrders);
        page++;
      }
    }

    // 3. Process each order
    let successCount = 0;
    let failCount = 0;

    for (const order of allOrders) {
      try {
         // suppressTelegram = true to avoid spamming the user's phone with 100 historical alerts
         await processWooCommerceOrder(order, projectId, project, true);
         successCount++;
      } catch (err) {
         console.error("Failed to sync order", order.id, err);
         failCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sync completed!`,
      summary: { fetched: allOrders.length, success: successCount, failed: failCount }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Sync Orders route error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 });
  }
}
