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
    const baseUrl = project.website_url.replace(/\/$/, ""); // remove trailing slash
    const url = `${baseUrl}/wp-json/wc/v3/orders?after=${startDate}T00:00:00Z&before=${endDate}T23:59:59Z&per_page=100&status=completed,processing,on-hold`;

    const authHeader = 'Basic ' + Buffer.from(`${project.woo_consumer_key}:${project.woo_consumer_secret}`).toString('base64');

    // 2. Fetch from WooCommerce
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

    const orders = await wpRes.json();
    if (!Array.isArray(orders)) {
      throw new Error("Invalid response format from WooCommerce");
    }

    // 3. Process each order
    let successCount = 0;
    let failCount = 0;

    for (const order of orders) {
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
      summary: { fetched: orders.length, success: successCount, failed: failCount }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Sync Orders route error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 });
  }
}
