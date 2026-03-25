"use client";

import { DollarSign, ShoppingCart, Users, TrendingUp, TrendingDown, Wallet, AlertCircle, LayoutDashboard, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { isToday, isThisWeek, isThisMonth, isThisYear, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";

export default function DashboardClient({ projects, orders, customers, expenses = [], isAdmin = true, selectedProject, initialRates }: { projects: any[], orders: any[], customers: any[], expenses?: any[], isAdmin?: boolean, selectedProject?: any, initialRates?: any }) {
  const [currency, setCurrency] = useState("AUD");
  const [rates, setRates] = useState(initialRates || { vnd: 25500, aud: 1.5 });

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');


  const formatCurrency = (amountAUD: number) => {
    if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountAUD * (rates.vnd / rates.aud)).replace('₫', 'VNĐ');
    if (currency === 'USD') return `${(amountAUD / rates.aud).toFixed(2)} USD`;
    return `${amountAUD.toFixed(2)} AUD`; // Mặc định hiển thị định dạng AUD ở hậu tố
  };

  // --- FILTER CORE DATA BY DATE ---
  const filteredOrders = orders.filter(o => {
    if (dateFilter === 'all') return true;
    const od = new Date(o.created_at);
    if (dateFilter === 'today') return isToday(od);
    if (dateFilter === 'week') return isThisWeek(od, { weekStartsOn: 1 });
    if (dateFilter === 'month') return isThisMonth(od);
    if (dateFilter === 'year') return isThisYear(od);
    if (dateFilter === 'custom' && startDate && endDate) {
      return isWithinInterval(od, { start: startOfDay(parseISO(startDate)), end: endOfDay(parseISO(endDate)) });
    }
    return true;
  });

  const filteredExpenses = expenses.filter(e => {
    if (dateFilter === 'all') return true;
    const ed = new Date(e.expense_date || e.created_at || new Date());
    if (dateFilter === 'today') return isToday(ed);
    if (dateFilter === 'week') return isThisWeek(ed, { weekStartsOn: 1 });
    if (dateFilter === 'month') return isThisMonth(ed);
    if (dateFilter === 'year') return isThisYear(ed);
    if (dateFilter === 'custom' && startDate && endDate) {
      return isWithinInterval(ed, { start: startOfDay(parseISO(startDate)), end: endOfDay(parseISO(endDate)) });
    }
    return true;
  });
  
  // 1. Calculate Top Metrics
  const totalIncome = filteredOrders.reduce((sum, o) => sum + Number(o.total_income) + Number(o.manual_adjustment), 0);
  const totalNetRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total_price) - Number(o.paypal_fee) - Number(o.shipping_fee || 0)), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount_usd) * rates.aud), 0); // Convert USD expense to AUD to match Income baseline
  const netProfit = totalIncome - totalExpenses;
  const totalOrders = filteredOrders.length;
  
  const returningCustomers = customers.filter(c => Number(c.lifetime_orders) > 1).length;
  const retentionRate = customers.length > 0 ? ((returningCustomers / customers.length) * 100).toFixed(1) : "0.0";

  // 2. Identify Sleepy Customers (60 days no order)
  const today = new Date();
  const sleepyCustomers = customers.filter(c => {
    if (!c.last_order_date) return false;
    const lastOrder = new Date(c.last_order_date);
    const diffTime = Math.abs(today.getTime() - lastOrder.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 60;
  });

  // 3. Calculate Top Projects by Income
  const projectIncomeMap: Record<string, number> = {};
  filteredOrders.forEach(o => {
    if (!projectIncomeMap[o.project_id]) projectIncomeMap[o.project_id] = 0;
    projectIncomeMap[o.project_id] += Number(o.total_income);
  });

  const topProjects = isAdmin ? projects
    .map(p => ({
      ...p,
      total_income: projectIncomeMap[p.id] || 0,
      order_count: filteredOrders.filter(o => o.project_id === p.id).length
    }))
    .sort((a, b) => b.total_income - a.total_income)
    : projects.map(p => ({...p, total_income: 0, order_count: 0}));

  // Limit rendering to Left Column cards
  const renderingTopProjects = topProjects.slice(0, 4);

  return (
    <div className="p-8 h-full flex flex-col overflow-y-auto">
      
      {/* 🌟 HEADER BOARD 🌟 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            {selectedProject ? (
              <>
                <LayoutDashboard className="w-6 h-6 text-blue-600" />
                Dashboard: <span className="text-blue-600">{selectedProject.name}</span>
              </>
            ) : isAdmin ? "Trang Chủ (Global Dashboard)" : "Website Projects"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedProject ? `Quản trị dòng tiền chi tiết của dự án ${selectedProject.name}` : isAdmin ? "Tổng quan dòng tiền từ tất cả Hệ thống Website WooCommerce" : "Chọn Dự án bên dưới để bắt đầu làm việc"}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Date Range Picker */}
          {dateFilter === 'custom' && (
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 gap-1 animate-in fade-in slide-in-from-right-4">
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={e => setStartDate(e.target.value)}
                 className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none" 
               />
               <span className="text-slate-400 self-center">-</span>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={e => setEndDate(e.target.value)}
                 className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none" 
               />
            </div>
          )}

          {/* Range Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm">
            {[
              { id: 'today', label: 'Hôm nay' },
              { id: 'week', label: 'Tuần này' },
              { id: 'month', label: 'Tháng' },
              { id: 'year', label: 'Năm' },
              { id: 'custom', label: <Calendar className="w-3.5 h-3.5"/> },
              { id: 'all', label: 'All Time' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-3 py-1.5 flex items-center justify-center text-xs font-bold rounded-md transition-all ${dateFilter === f.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Currency Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm">
            {['USD', 'AUD', 'VND'].map(cur => (
              <button
                key={cur}
                onClick={() => setCurrency(cur)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${currency === cur ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {cur}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🌟 METRICS ROW 🌟 */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
          <MetricCard 
            title={`Tổng Income - ${currency}`} 
            value={formatCurrency(totalIncome)} 
            subValue={`Từ ${formatCurrency(totalNetRevenue)} Net Rev (${totalOrders} Đơn)`}
            icon={<DollarSign className="w-5 h-5 text-blue-600" />} 
            bg="bg-blue-100" 
          />
          <MetricCard 
            title={`Lợi Nhuận Ròng (Net) - ${currency}`} 
            value={formatCurrency(netProfit)} 
            subValue="Đã trừ sạch chi phí vận hành" 
            icon={<Wallet className="w-5 h-5 text-emerald-600" />} 
            bg="bg-emerald-100 border-emerald-200 shadow-md" 
          />
          <MetricCard 
            title={`Chi Phí (Expenses) - ${currency}`} 
            value={`-${formatCurrency(totalExpenses)}`} 
            subValue="Tiền Ads, Entity, Server..." 
            icon={<TrendingDown className="w-5 h-5 text-red-600" />} 
            bg="bg-red-100" 
          />
          <MetricCard 
            title="Khách Hàng Toàn Hệ Thống" 
            value={customers.length.toString()} 
            subValue={`Tỉ lệ LTV (quay lại): ${retentionRate}%`} 
            icon={<Users className="w-5 h-5 text-purple-600" />} 
            bg="bg-purple-100" 
          />
        </div>
      )}

      {/* 🌟 BOTTOM CHARTS / LISTS 🌟 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3) - Top Projects */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-slate-400" />
              {selectedProject ? "Công Cụ Dự Án" : isAdmin ? "Danh Sách Dự Án" : "Truy cập Dự Án"}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedProject ? (
                 <Link href={`/crm/orders?project=${selectedProject.id}`} className="cursor-pointer block">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all group h-full">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full flex items-center justify-center font-black bg-blue-600 text-white">
                           <ShoppingCart className="w-5 h-5" />
                         </div>
                         <div>
                           <div className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors leading-tight mb-0.5">Quản Lý Đơn Hàng</div>
                           <span className="text-[10px] text-blue-500 font-medium tracking-wider">XEM CHI TIẾT TỪNG ĐƠN</span>
                         </div>
                       </div>
                       <div className="text-blue-600 pr-2">
                         <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                       </div>
                    </div>
                 </Link>
              ) : renderingTopProjects.length > 0 ? renderingTopProjects.map((p, idx) => (
                <Link href={`/crm?project=${p.id}`} key={p.id} className="cursor-pointer block">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all group h-full">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                        {isAdmin ? `#${idx + 1}` : p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors leading-tight mb-0.5">{p.name || "Web Không Tên"}</div>
                        <span className="text-[10px] text-blue-500 font-medium uppercase tracking-wider">{p.website_url ? new URL(p.website_url).hostname : "Chưa gắn Link"}</span>
                      </div>
                    </div>
                    {isAdmin ? (
                      <div className="text-right">
                        <div className="font-black text-lg text-slate-800">{formatCurrency(p.total_income)}</div>
                        <div className="text-[11px] font-bold text-slate-400">{p.order_count} Đơn hàng</div>
                      </div>
                    ) : (
                      <div className="text-blue-600 pr-2">
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>
                </Link>
              )) : (
                <div className="col-span-2 text-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-xl">Chưa có dự án nào có Lợi nhuận trong thời gian này.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3) - Smart Reminders */}
        <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 shadow-sm p-6 h-full relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500 opacity-5 rounded-full blur-2xl"></div>
            
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
              <AlertCircle className="w-5 h-5 text-indigo-500" />
              Nhiệm Vụ Trong Tuần
            </h2>
            
            <div className="space-y-4 relative z-10">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                    Khách VIP sắp ngủ đông
                  </div>
                  <span className="bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded text-xs">{sleepyCustomers.length}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  Có {sleepyCustomers.length} khách chưa quay lại mua hàng sau 60 ngày. Nhấn nút dưới để xuất danh sách chăm sóc lại (Gửi Email/SMS giảm giá).
                </p>
                <Link href="/crm/customers" className="text-[11px] uppercase tracking-wide font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded inline-flex items-center gap-1 transition-colors">
                  Trang Khách Hàng <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 opacity-70">
                <div className="font-bold text-slate-700 mb-1 text-sm">Kiểm tra Refund</div>
                <p className="text-[11px] text-slate-500 leading-snug">Toàn bộ đơn cancelled tuần này đã được cấn trừ khỏi cột Income tự động. Bạn không cần làm gì thêm.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subValue, icon, bg }: { title: string, value: string, subValue: string, icon: any, bg: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
      <div className="flex justify-between items-start">
        <div className="z-10 relative">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 shadow-sm opacity-80">{title}</p>
          <div className="text-3xl font-black text-slate-800 tracking-tight">{value}</div>
          <div className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            {subValue}
          </div>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} shrink-0 relative z-10 shadow-sm`}>
          {icon}
        </div>
      </div>
      {/* Background decoration */}
      <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full ${bg} opacity-[0.15] group-hover:scale-110 transition-transform`}></div>
    </div>
  );
}
