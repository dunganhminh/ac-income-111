import { supabase } from '@/lib/supabase';

// Dynamic Income Calculator
export function calculateIncomeAndQuantities(lineItems: any[], ruleType: string, percentage: number, incomeRules: any[] = []) {
  let totalIncome = 0;
  let totalQuantity = 0;
  let hasPack10 = false;
  
  const productsSummary = lineItems.map((item: any) => {
    const nameStr = item.name?.toLowerCase() || "";
    const qty = Number(item.quantity) || 1;
    let rate = 0;
    let lineIncome = 0;

    if (ruleType === 'zero') {
       rate = 0;
       lineIncome = 0;
       if (nameStr.includes("pack 10")) hasPack10 = true;
    } else if (ruleType === 'percentage') {
       const lineTotal = Number(item.total) || 0; // total price of this line item
       lineIncome = lineTotal * (percentage / 100);
       rate = qty > 0 ? (lineIncome / qty) : 0;
       
       if (nameStr.includes("pack 10")) hasPack10 = true; // Still trigger tag
    } else {
       // ruleType === 'fixed_pack'
       
       // Cơ chế tính cứng: Cứ thấy chữ "pack X" -> X * $5. Còn không thì mặc định là $5.
       const matchPack = nameStr.match(/pack[-_\s]*(\d+)/i);
       if (matchPack && matchPack[1]) {
         rate = Number(matchPack[1]) * 5;
       } else {
         rate = 5;
       }
       
       // Độc lập kiểm tra VIP Tag
       if (nameStr.includes("pack 10")) {
         hasPack10 = true;
       }
       
       lineIncome = rate * qty;
    }
    
    totalIncome += lineIncome;
    totalQuantity += qty;

    return { name: item.name, quantity: qty, rate: rate, line_income: lineIncome };
  });

  return { totalIncome, totalQuantity, productsSummary, hasPack10 };
}

// Main logic to process a WooCommerce JSON Order Payload
// Used by Webhooks and Batch Syncing
export async function processWooCommerceOrder(payload: any, projectId: string, projectSettings: any, suppressTelegram = false) {
  const { 
    id: wc_order_number,
    number: custom_order_number,
    status = 'pending',
    billing = {},
    line_items = [],
    total = 0,
    shipping_total = 0,
    fee_lines = [],
    date_created
  } = payload;

  const email = billing.email ? billing.email.toLowerCase() : `guest-${wc_order_number}@unknown.com`;
  const phone = billing.phone || null;
  const customerName = `${billing.first_name || 'Khách'} ${billing.last_name || ''}`.trim();
  
  // Status
  const validStatuses = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed', 'trash'];
  const finalStatus = validStatuses.includes(status) ? status : 'pending';

  // Block failed and pending orders to prevent spam/unpaid customers from filling up the CRM
  if (finalStatus === 'failed' || finalStatus === 'pending') {
    return { success: true, message: `Ignored ${finalStatus} order to prevent spam` };
  }

  // PayPal/Gateway fee calculation
  let paypalFee = 0;
  
  // 1. Try finding in `fee_lines` 
  const ppFeeLine = fee_lines.find((fee: any) => fee.name && fee.name.toLowerCase().includes('paypal'));
  if (ppFeeLine) {
    paypalFee = Math.abs(Number(ppFeeLine.total));
  } else if (payload.meta_data && Array.isArray(payload.meta_data)) {
    // 2. Try finding in `meta_data` (Most plugins store fees here like `_paypal_transaction_fee`, `_stripe_fee`)
    const feeMetaKeys = [
      '_paypal_transaction_fee', 
      'PayPal Transaction Fee', 
      '_ppcp_paypal_fee',
      '_paypal_fee', 
      'paypal_fee',
      '_stripe_fee',
      'stripe_fee'
    ];
    const metaFee = payload.meta_data.find((meta: any) => feeMetaKeys.includes(meta.key));
    if (metaFee && metaFee.value) {
      // metaFee.value can be string or number
      const parsedFee = parseFloat(String(metaFee.value).replace(/[^0-9.-]+/g,""));
      if (!isNaN(parsedFee)) {
        paypalFee = Math.abs(parsedFee);
      }
    }
  }

  // UTM Tracking extraction from order metadata
  const metaData = payload.meta_data || [];
  const getMeta = (key: string) => metaData.find((m: any) => m.key === key)?.value || null;
  const utmSource = getMeta('utm_source') || getMeta('_utm_source') || null;
  const utmMedium = getMeta('utm_medium') || getMeta('_utm_medium') || null;
  const utmCampaign = getMeta('utm_campaign') || getMeta('_utm_campaign') || null;

  // Process rules
  const calculated = calculateIncomeAndQuantities(
    line_items, 
    projectSettings.income_rule_type, 
    projectSettings.income_percentage,
    projectSettings.income_rules
  );
  let { totalIncome } = calculated;
  const { productsSummary, hasPack10 } = calculated;
  
  // Xử lý đơn Hoàn / Huỷ -> Net Income = 0
  if (['refunded', 'cancelled', 'failed', 'trash'].includes(finalStatus)) {
    totalIncome = 0;
  }
  
  // Use date_created_gmt for accurate UTC timing instead of site-specific date_created
  const orderDate = payload.date_created_gmt || new Date().toISOString();
  const orderTotalFormatted = Number(total);

  // CRM: FIND OR CREATE CUSTOMER
  let customerId = null;
  let existingCustomerTags: string[] = [];
  
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, tags')
    .eq('project_id', projectId)
    .eq('email', email)
    .single();

  if (existingCustomer) {
    customerId = existingCustomer.id;
    existingCustomerTags = existingCustomer.tags || [];
  } else {
    // Insert initial empty customer
    const initialTags: string[] = ['Khách mới']; 
    if (hasPack10) initialTags.push('Pack 10 Lover');

    const { data: newCustomer, error: insertCustomerError } = await supabase
      .from('customers')
      .insert([{
        project_id: projectId,
        email: email,
        phone: phone,
        full_name: customerName,
        lifetime_orders: 0,
        lifetime_spent: 0,
        tags: initialTags
      }])
      .select('id')
      .single();
      
    if (insertCustomerError) throw new Error("Customer Insert Error: " + insertCustomerError.message);
    customerId = newCustomer.id;
    existingCustomerTags = initialTags;
  }

  // ORDER UPSERT
  const orderData = {
    project_id: projectId,
    customer_id: customerId,
    order_number: String(custom_order_number || wc_order_number || Date.now()),
    status: finalStatus,
    total_price: orderTotalFormatted,
    shipping_fee: Number(shipping_total),
    paypal_fee: paypalFee,
    total_income: totalIncome,
    manual_adjustment: 0,
    products_summary: productsSummary,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    created_at: orderDate
  };

  const { error: orderError } = await supabase
    .from('orders')
    .upsert(orderData, { onConflict: 'project_id, order_number' });

  if (orderError) throw new Error("Order Insert Error: " + orderError.message);

  // CRM: RECALCULATE EXACT LIFETIME METRICS (Prevents Duplicates on Webhook Retries or Sync)
  const { data: customerOrders } = await supabase
    .from('orders')
    .select('total_price, status, created_at')
    .eq('customer_id', customerId)
    .is('deleted_at', null)
    .not('status', 'in', '("cancelled","refunded","failed","trash")');

  let recalculatedSpent = 0;
  let recalculatedOrders = 0;
  let latestOrderDate = orderDate;
  
  if (customerOrders && customerOrders.length > 0) {
    recalculatedOrders = customerOrders.length;
    recalculatedSpent = customerOrders.reduce((sum, o) => sum + Number(o.total_price), 0);
    
    // Find the latest valid order date
    const sortedDates = customerOrders.map(o => new Date(o.created_at).getTime()).sort((a, b) => b - a);
    if (sortedDates.length > 0) {
      latestOrderDate = new Date(sortedDates[0]).toISOString();
    }
  }

  // Update Customer Tags
  const tags: string[] = [...existingCustomerTags];
  if (recalculatedOrders >= 5 && !tags.includes('VIP')) tags.push('VIP');
  if (hasPack10 && !tags.includes('Pack 10 Lover')) tags.push('Pack 10 Lover');

  await supabase
    .from('customers')
    .update({ 
      lifetime_orders: recalculatedOrders,
      lifetime_spent: recalculatedSpent,
      last_order_date: latestOrderDate,
      tags: tags
    })
    .eq('id', customerId);

  // TELEGRAM ALERT
  if (!suppressTelegram && projectSettings.telegram_active && projectSettings.telegram_chat_id) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      const netRev = orderTotalFormatted - paypalFee - Number(shipping_total);
      const text = `🚀 *CÓ ĐƠN HÀNG MỚI* 🚀\n\n📌 *Dự án:* ${projectSettings.name}\n👤 *Khách:* ${customerName}\n💰 *Tổng tiền:* $${orderTotalFormatted}\n📉 *Net Rev:* $${netRev}\n💵 *Income:* $${totalIncome}`;
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: projectSettings.telegram_chat_id,
            text: text,
            parse_mode: 'Markdown'
          })
        });
      } catch(e) { console.error("Telegram error:", e); }
    }
  }

  return { success: true, orderId: orderData.order_number };
}
