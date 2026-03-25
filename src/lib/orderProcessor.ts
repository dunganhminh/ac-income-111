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

    if (ruleType === 'percentage') {
       const lineTotal = Number(item.total) || 0; // total price of this line item
       lineIncome = lineTotal * (percentage / 100);
       rate = qty > 0 ? (lineIncome / qty) : 0;
       
       if (nameStr.includes("pack 10")) hasPack10 = true; // Still trigger tag
    } else {
       // ruleType === 'fixed_pack'
       rate = 0; // Default if no rules match
       
       if (incomeRules && incomeRules.length > 0) {
         for (const rule of incomeRules) {
           if (rule.keyword && nameStr.includes(rule.keyword.toLowerCase())) {
             rate = Number(rule.price) || 0;
             break; // Match first rule
           }
         }
       }
       
       // Fallback thông minh: Nếu chưa có luật nào ăn khớp và tên sản phẩm có chứa "pack X", tự động lấy số X làm giá trị mồi
       if (rate === 0) {
         const matchPack = nameStr.match(/pack\s*(\d+)/i);
         if (matchPack && matchPack[1]) {
           rate = Number(matchPack[1]);
         } else {
           // Mặc định cho mọi thứ không nhặt được chữ "pack" nào đều có net income là 5$
           rate = 5;
         }
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

  // Block failed orders to prevent spam/scam customers from filling up the CRM
  if (finalStatus === 'failed') {
    return { success: true, message: 'Ignored failed order to prevent spam' };
  }

  // PayPal fee
  let paypalFee = 0;
  const ppFeeLine = fee_lines.find((fee: any) => fee.name && fee.name.toLowerCase().includes('paypal'));
  if (ppFeeLine) paypalFee = Math.abs(Number(ppFeeLine.total));

  // UTM Tracking extraction from order metadata
  const metaData = payload.meta_data || [];
  const getMeta = (key: string) => metaData.find((m: any) => m.key === key)?.value || null;
  const utmSource = getMeta('utm_source') || getMeta('_utm_source') || null;
  const utmMedium = getMeta('utm_medium') || getMeta('_utm_medium') || null;
  const utmCampaign = getMeta('utm_campaign') || getMeta('_utm_campaign') || null;

  // Process rules
  let { totalIncome, productsSummary, hasPack10 } = calculateIncomeAndQuantities(
    line_items, 
    projectSettings.income_rule_type, 
    projectSettings.income_percentage,
    projectSettings.income_rules
  );
  
  // Xử lý đơn Hoàn / Huỷ -> Net Income = 0
  if (['refunded', 'cancelled', 'failed', 'trash'].includes(finalStatus)) {
    totalIncome = 0;
  }
  
  const orderDate = date_created || new Date().toISOString();
  const orderTotalFormatted = Number(total);

  // CRM UPSERT & AUTO-TAGGING
  let customerId = null;
  let { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, lifetime_orders, lifetime_spent, tags')
    .eq('project_id', projectId)
    .eq('email', email)
    .single();

  if (existingCustomer) {
    const newLifetime = existingCustomer.lifetime_orders + 1;
    const newLifetimeSpent = Number(existingCustomer.lifetime_spent || 0) + orderTotalFormatted;
    let tags: string[] = existingCustomer.tags || [];
    
    // Auto-tagging Rules
    if (newLifetime >= 5 && !tags.includes('VIP')) tags.push('VIP');
    if (hasPack10 && !tags.includes('Pack 10 Lover')) tags.push('Pack 10 Lover');

    await supabase
      .from('customers')
      .update({ 
        lifetime_orders: newLifetime,
        lifetime_spent: newLifetimeSpent,
        last_order_date: orderDate,
        tags: tags
      })
      .eq('id', existingCustomer.id);
    
    customerId = existingCustomer.id;
  } else {
    let tags: string[] = ['Khách mới']; // Auto-tag new customer
    if (hasPack10) tags.push('Pack 10 Lover');

    const { data: newCustomer, error: insertCustomerError } = await supabase
      .from('customers')
      .insert([{
        project_id: projectId,
        email: email,
        phone: phone,
        full_name: customerName,
        lifetime_orders: 1,
        lifetime_spent: orderTotalFormatted,
        last_order_date: orderDate,
        tags: tags
      }])
      .select('id')
      .single();
      
    if (insertCustomerError) throw new Error("Customer Insert Error: " + insertCustomerError.message);
    customerId = newCustomer.id;
  }

  // ORDER UPSERT
  const orderData = {
    project_id: projectId,
    customer_id: customerId,
    order_number: String(wc_order_number || Date.now()),
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
