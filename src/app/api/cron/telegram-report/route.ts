import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  // Security check to prevent unauthorized execution
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_key_for_build";
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch all active projects with telegram
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, name, telegram_active, telegram_chat_id')
      .eq('telegram_active', true)
      .is('deleted_at', null);

    if (!projects || projects.length === 0) {
      return NextResponse.json({ message: 'No active telegram projects' });
    }

    // 2. Calculate "Today" in Vietnam Timezone (UTC+7)
    const now = new Date();
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const startOfTodayVn = new Date(vnTime.getFullYear(), vnTime.getMonth(), vnTime.getDate(), 0, 0, 0);
    // Convert back to UTC ISO for Supabase query
    const startOfTodayIso = new Date(startOfTodayVn.getTime() - (7 * 60 * 60 * 1000)).toISOString();
    const dateLabel = vnTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // 3. Fetch today's ORDERS (exclude refunded/cancelled)
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('project_id, total_income, paypal_fee, total_price, status')
      .gte('created_at', startOfTodayIso)
      .is('deleted_at', null)
      .not('status', 'in', '("cancelled","refunded","failed","trash")');

    // 4. Fetch today's EXPENSES for Net Profit calculation
    const { data: expenses } = await supabaseAdmin
      .from('expenses')
      .select('project_id, amount_usd, amount, currency')
      .gte('expense_date', startOfTodayIso)
      .is('deleted_at', null);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) throw new Error("Missing TELEGRAM_BOT_TOKEN");

    const results = [];

    // 5. Process and send report per project
    for (const p of projects) {
      if (!p.telegram_chat_id) continue;

      const projectOrders = (orders || []).filter(o => o.project_id === p.id);
      const projectExpenses = (expenses || []).filter(e => e.project_id === p.id);

      const totalOrders = projectOrders.length;
      const totalIncome = projectOrders.reduce((sum, o) => sum + Number(o.total_income || 0), 0);
      const totalNetRev = projectOrders.reduce((sum, o) => sum + (Number(o.total_price || 0) - Number(o.paypal_fee || 0)), 0);
      
      // Expense in USD (use amount_usd if available, fallback to amount for USD currency)
      const totalExpensesUsd = projectExpenses.reduce((sum, e) => {
        if (e.amount_usd) return sum + Number(e.amount_usd);
        if (e.currency === 'USD') return sum + Number(e.amount || 0);
        return sum; // Other currencies ignored if no amount_usd
      }, 0);

      const netProfit = totalIncome - totalExpensesUsd;
      const netProfitSign = netProfit >= 0 ? '+' : '';
      const netProfitEmoji = netProfit >= 0 ? '🟢' : '🔴';

      const text = [
        `📊 *BÁO CÁO NGÀY ${dateLabel}*`,
        `📌 *Dự án:* ${p.name}`,
        ``,
        `📦 *Đơn hàng:* ${totalOrders} đơn`,
        `💰 *Tổng Income:* $${totalIncome.toFixed(2)}`,
        `💳 *Net Revenue:* $${totalNetRev.toFixed(2)}`,
        totalExpensesUsd > 0 ? `🧾 *Chi phí hôm nay:* -$${totalExpensesUsd.toFixed(2)}` : null,
        `${netProfitEmoji} *Net Lãi:* ${netProfitSign}$${netProfit.toFixed(2)}`,
        ``,
        `_Báo cáo lúc 21:00 — Hẹn mai bùng nổ!_ 🚀`,
      ].filter(Boolean).join('\n');

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: p.telegram_chat_id,
            text: text,
            parse_mode: 'Markdown'
          })
        });
        results.push({ project: p.name, sent: true, netProfit: netProfit.toFixed(2) });
      } catch(e) {
        results.push({ project: p.name, sent: false });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch(error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
