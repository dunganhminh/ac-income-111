"use client";

import { useState } from "react";
import { Activity, TrendingUp, DollarSign, Package, Calendar, Share2, Wallet, Users, Flame, ShieldAlert, BarChart3, Trophy, ArrowRight } from "lucide-react";
import { isToday, isThisWeek, isThisMonth, isThisYear, isWithinInterval, startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, differenceInDays } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toVNTime } from "@/lib/time";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function AnalyticsClient({ 
  initialProjects, 
  initialOrders, 
  initialExpenses = [], 
  initialCustomers = [], 
  initialRates 
}: { 
  initialProjects: any[]; 
  initialOrders: any[]; 
  initialExpenses?: any[]; 
  initialCustomers?: any[]; 
  initialRates?: any; 
}) {
  
  // Date Filter State
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 1. Filter Orders and Define Previous Periods
  const getPeriods = () => {
    let currentStart = toVNTime();
    let currentEnd = toVNTime();
    let prevStart = toVNTime();
    let prevEnd = toVNTime();
    const now = toVNTime();

    if (dateFilter === 'today') {
      currentStart = startOfDay(now);
      currentEnd = endOfDay(now);
      prevStart = startOfDay(subDays(currentStart, 1));
      prevEnd = endOfDay(subDays(currentEnd, 1));
    } else if (dateFilter === 'week') {
      currentStart = startOfWeek(now, { weekStartsOn: 1 });
      currentEnd = endOfWeek(now, { weekStartsOn: 1 });
      prevStart = subWeeks(currentStart, 1);
      prevEnd = subWeeks(currentEnd, 1);
    } else if (dateFilter === 'month') {
      currentStart = startOfMonth(now);
      currentEnd = endOfMonth(now);
      prevStart = subMonths(currentStart, 1);
      prevEnd = endOfMonth(prevStart);
    } else if (dateFilter === 'year') {
      currentStart = startOfYear(now);
      currentEnd = endOfYear(now);
      prevStart = subYears(currentStart, 1);
      prevEnd = endOfYear(prevStart);
    } else if (dateFilter === 'custom' && startDate && endDate) {
      currentStart = startOfDay(parseISO(startDate));
      currentEnd = endOfDay(parseISO(endDate));
      const diff = differenceInDays(currentEnd, currentStart) + 1;
      prevStart = subDays(currentStart, diff);
      prevEnd = subDays(currentEnd, diff);
    } else {
      return null;
    }
    return { currentStart, currentEnd, prevStart, prevEnd };
  };

  const rates = initialRates || { aud: 1.5, vnd: 25500 };
  const periods = getPeriods();
  const filteredOrders: any[] = [];
  const prevOrders: any[] = [];
  const filteredExpenses: any[] = [];

  if (periods) {
    initialOrders.forEach(o => {
      const d = toVNTime(o.created_at);
      if (d >= periods.currentStart && d <= periods.currentEnd) filteredOrders.push(o);
      else if (d >= periods.prevStart && d <= periods.prevEnd) prevOrders.push(o);
    });
    initialExpenses.forEach(e => {
      const d = toVNTime(e.expense_date || e.created_at || e.date || new Date());
      if (d >= periods.currentStart && d <= periods.currentEnd) filteredExpenses.push(e);
    });
  } else {
    filteredOrders.push(...initialOrders);
    filteredExpenses.push(...initialExpenses);
  }

  // Calculate Valid Orders (Not Cancelled/Refunded) for standard revenue metrics
  const cancelStatuses = ['cancelled', 'refunded', 'failed', 'trash'];
  const validFilteredOrders = filteredOrders.filter(o => !cancelStatuses.includes(o.status));
  const validPrevOrders = prevOrders.filter(o => !cancelStatuses.includes(o.status));

  // 1.b Comparison Data Prep
  const projectComparison: Record<string, { name: string, curOrders: number, prevOrders: number, curProducts: number, prevProducts: number }> = {};
  initialProjects.forEach(p => {
    projectComparison[p.id] = { name: p.name, curOrders: 0, prevOrders: 0, curProducts: 0, prevProducts: 0 };
  });

  validFilteredOrders.forEach(o => {
    if (projectComparison[o.project_id]) {
      projectComparison[o.project_id].curOrders += 1;
      const prods = o.products_summary || [];
      const qty = prods.reduce((sum: number, p: any) => sum + Number(p.quantity || 1), 0);
      projectComparison[o.project_id].curProducts += qty;
    }
  });

  validPrevOrders.forEach(o => {
    if (projectComparison[o.project_id]) {
      projectComparison[o.project_id].prevOrders += 1;
      const prods = o.products_summary || [];
      const qty = prods.reduce((sum: number, p: any) => sum + Number(p.quantity || 1), 0);
      projectComparison[o.project_id].prevProducts += qty;
    }
  });

  // Aggregate data by month
  const monthlyData: Record<string, { income: number, netRev: number }> = {};
  
  // Aggregate products
  const productData: Record<string, { qty: number, income: number }> = {};

  // Aggregate project breakdown
  const projectIncome: Record<string, number> = {};

  // Aggregate UTM
  const utmData: Record<string, { qty: number, income: number }> = {};

  validFilteredOrders.forEach(o => {
    // Trend Data Logic (Day or Month depending on filter)
    const d = toVNTime(o.created_at);
    
    // Nếu lọc theo 'today', 'week', 'custom' (ngắn), hiển thị theo Ngày
    // Nếu 'month', 'year', 'all', hiển thị theo Tháng
    const isDaily = ['today', 'week', 'custom'].includes(dateFilter);
    const dateKey = isDaily 
      ? d.toISOString().split('T')[0] 
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
    const incomeToAdd = (Number(o.total_income) || 0) + (Number(o.manual_adjustment) || 0);
    
    if (!monthlyData[dateKey]) monthlyData[dateKey] = { income: 0, netRev: 0 };
    monthlyData[dateKey].income += incomeToAdd;
    monthlyData[dateKey].netRev += (Number(o.total_price) - Number(o.paypal_fee) - Number(o.shipping_fee || 0));

    // UTM tracking
    const utmSrc = o.utm_source || "N/A (Organic/Direct)";
    if (!utmData[utmSrc]) utmData[utmSrc] = { qty: 0, income: 0 };
    utmData[utmSrc].qty += 1;
    utmData[utmSrc].income += incomeToAdd;

    // Project aggregation
    if (!projectIncome[o.project_id]) projectIncome[o.project_id] = 0;
    projectIncome[o.project_id] += incomeToAdd;

    // Product aggregation
    const prods = o.products_summary || [];
    prods.forEach((p: any) => {
      const name = p.name || "Unknown";
      if (!productData[name]) productData[name] = { qty: 0, income: 0 };
      productData[name].qty += Number(p.quantity || 1);
      productData[name].income += Number(p.line_income || 0);
    });
  });

  // Calculate total expenses for the period
  const totalFilteredExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Sort trend data sequentially
  const lineChartData = Object.keys(monthlyData).sort().map(key => ({
    name: key,
    income: monthlyData[key].income
  }));

  // Sort top products
  const topProducts = Object.entries(productData)
    .sort((a, b) => b[1].income - a[1].income)
    .slice(0, 5);
    
  // Sort UTM
  const topUtmSources = Object.entries(utmData)
    .sort((a, b) => b[1].income - a[1].income);
  
  const totalGlobalIncome = Object.values(projectIncome).reduce((a, b) => a + b, 0);

  // ----------------------------------------------------
  // 5 ADVANCED METRICS (Data Prep)
  // ----------------------------------------------------

  // 1. Funnel / Lost Revenue
  let totalLostRevenue = 0;
  let totalSuccessfulRevenue = 0;
  let cancelledCount = 0;
  let successCount = 0;

  filteredOrders.forEach(o => {
    const isCancelled = cancelStatuses.includes(o.status);
    const incomeObj = (Number(o.total_income) || 0) + (Number(o.manual_adjustment) || 0);

    if (isCancelled) {
      cancelledCount++;
      totalLostRevenue += incomeObj;
    } else {
      successCount++;
      totalSuccessfulRevenue += incomeObj;
    }
  });

  const totalOrdersCount = cancelledCount + successCount;
  const cancelRate = totalOrdersCount > 0 ? (cancelledCount / totalOrdersCount) * 100 : 0;

  // 2. Retention (Khách cũ vs mới)
  let returningIncome = 0;
  let newIncome = 0;
  let returningCount = 0;
  let newCount = 0;

  validFilteredOrders.forEach(o => {
    const cust = initialCustomers.find(c => c.id === o.customer_id);
    const isNew = cust && periods && toVNTime(cust.created_at) >= periods.currentStart;
    const incomeToAdd = (Number(o.total_income) || 0) + (Number(o.manual_adjustment) || 0);
    if (!isNew) { 
      returningIncome += incomeToAdd;
      returningCount++;
    } else {
      newIncome += incomeToAdd;
      newCount++;
    }
  });
  const retentionRate = (returningCount + newCount) > 0 ? (returningCount / (returningCount + newCount)) * 100 : 0;

  // 3. Golden Hours Heatmap
  const heatmapData: Record<string, number> = {};
  const heatmapDays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const heatmapHours = Array.from({ length: 24 }, (_, i) => i);
  
  validFilteredOrders.forEach(o => {
    const d = toVNTime(o.created_at);
    const key = `${d.getDay()}-${d.getHours()}`;
    heatmapData[key] = (heatmapData[key] || 0) + 1;
  });

  const maxHeatmap = Object.values(heatmapData).length > 0 ? Math.max(...Object.values(heatmapData)) : 1;

  // 4. Project P&L
  const projectPnL: Record<string, { name: string, income: number, expense: number }> = {};
  initialProjects.forEach(p => {
    projectPnL[p.id] = { name: p.name, income: 0, expense: 0 };
  });

  validFilteredOrders.forEach(o => {
    if (projectPnL[o.project_id]) {
      projectPnL[o.project_id].income += (Number(o.total_income) || 0) + (Number(o.manual_adjustment) || 0);
    }
  });

  filteredExpenses.forEach(e => {
    if (projectPnL[e.project_id]) {
      projectPnL[e.project_id].expense += Number(e.amount_usd || 0) * Number(rates.aud);
    }
  });

  // 5. VIP Leaderboard
  const customerLtv: Record<string, { id: string, name: string, email: string, income: number, orders: number }> = {};
  validFilteredOrders.forEach(o => {
    if (!customerLtv[o.customer_id]) {
      const cust = initialCustomers.find(c => c.id === o.customer_id);
      customerLtv[o.customer_id] = { 
        id: o.customer_id,
        name: cust?.full_name || 'Khách Vô Danh', 
        email: cust?.email || 'N/A', 
        income: 0, 
        orders: 0 
      };
    }
    customerLtv[o.customer_id].income += (Number(o.total_income) || 0) + (Number(o.manual_adjustment) || 0);
    customerLtv[o.customer_id].orders += 1;
  });

  const topVIPs = Object.values(customerLtv).sort((a, b) => b.income - a.income).slice(0, 5);

  return (
    <div className="p-4 pt-16 md:p-8 md:pt-8 h-full flex flex-col overflow-y-auto">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Analytics & Báo Cáo Đo Lường</h1>
          <p className="text-sm text-slate-500 mt-1">Phân tích sâu biểu đồ tăng trưởng, Nguồn kéo Traffic và cơ cấu dòng tiền</p>
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

          {/* Date Range Buttons */}
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
                className={`px-3 py-1.5 flex items-center justify-center text-xs font-bold rounded-md transition-all ${dateFilter === f.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        
        {/* Main Chart (Trend) & Net Profit */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Top Cards (Gross vs Net Profit) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl p-5 shadow-sm text-white relative overflow-hidden">
               <div className="text-indigo-100 text-sm font-bold mb-1">TOTAL INCOME</div>
               <div className="text-3xl font-black">${totalGlobalIncome.toFixed(2)}</div>
               <Activity className="absolute right-4 bottom-4 w-12 h-12 text-white/10" />
            </div>
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden text-slate-800">
               <div className="text-slate-500 text-sm font-bold mb-1">CHI PHÍ (EXPENSES)</div>
               <div className="text-3xl font-black text-rose-500">-${totalFilteredExpenses.toFixed(2)}</div>
               <TrendingUp className="absolute right-4 bottom-4 w-12 h-12 text-slate-100" />
            </div>
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl p-5 shadow-sm text-white relative overflow-hidden">
               <div className="text-fuchsia-100 text-sm font-bold mb-1">NET PROFIT (LỢI NHUẬN RÒNG)</div>
               <div className="text-3xl font-black">${(totalGlobalIncome - totalFilteredExpenses).toFixed(2)}</div>
               <Wallet className="absolute right-4 bottom-4 w-12 h-12 text-white/10" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Biểu đồ Tăng trưởng Income (Line Chart)
              </h2>
            </div>

            <div className="h-64 w-full mt-6">
              {lineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <Line type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="5 5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => `$${val}`} />
                    <RechartsTooltip 
                       contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                       formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Income']}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu đồ thị cho mốc thời gian này</div>
              )}
            </div>
          </div>
          
          {/* UTM Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Share2 className="w-5 h-5 text-purple-600" />
              Nguồn Khách Hàng (UTM Source / Traffic)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {topUtmSources.length > 0 ? topUtmSources.map(([source, data], idx) => {
                 const pct = totalGlobalIncome > 0 ? ((data.income / totalGlobalIncome) * 100) : 0;
                 return (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-700 truncate pr-4">{source}</span>
                      <span className="font-bold text-slate-900">${data.income.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full" 
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                       <span className="text-[10px] text-slate-400 font-bold">{pct.toFixed(1)}% Income</span>
                       <span className="text-[10px] text-slate-500 font-medium">{data.qty} Đơn hàng</span>
                    </div>
                  </div>
                 );
              }) : (
                <div className="text-slate-400 text-sm py-4">Chưa có dữ liệu UTM trong thời gian này</div>
              )}
            </div>
          </div>
        </div>

        {/* Third Column: Top Products & Projects */}
        <div className="flex flex-col gap-8">
          {/* Top Products */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Package className="w-5 h-5 text-orange-500" />
              Top Sản phẩm Sinh Lời
            </h2>
            <div className="space-y-4">
              {topProducts.length > 0 ? topProducts.map(([name, data], idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-700 truncate pr-4">{name}</span>
                    <span className="font-bold text-slate-900">${data.income.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-400 rounded-full" 
                      style={{ width: `${Math.min((data.income / totalGlobalIncome) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right font-medium">{data.qty} sold</div>
                </div>
              )) : (
                <div className="text-slate-400 text-sm text-center py-4">Chưa có dữ liệu sản phẩm trong thời gian này</div>
              )}
            </div>
          </div>

          {/* Project Breakdown Pie Chart */}
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 p-6 rounded-xl border border-blue-100 shadow-sm flex-1">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Tỷ trọng Website (Pie Chart)
            </h2>
            
            <div className="h-48 w-full">
              {initialProjects.length > 0 && totalGlobalIncome > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={initialProjects.map(p => ({ name: p.name, value: projectIncome[p.id] || 0 })).filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {initialProjects.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                       formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Income']}
                       contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Chưa phân bổ</div>
              )}
            </div>

            <div className="space-y-3 mt-2">
              {initialProjects.length > 0 ? initialProjects.map((p, idx) => {
                const income = projectIncome[p.id] || 0;
                if (income === 0) return null;
                const pct = totalGlobalIncome > 0 ? ((income / totalGlobalIncome) * 100).toFixed(1) : 0;
                const color = COLORS[idx % COLORS.length];
                return (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                      <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-800">${income.toFixed(2)}</div>
                      <div className="text-[10px] font-bold text-slate-500">{pct}%</div>
                    </div>
                  </div>
                );
              }) : (
                 <div className="text-slate-400 text-sm text-center py-4">Chưa có dự án nào</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-0 mb-10 p-6">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Báo Cáo Tăng Trưởng (Kỳ Hiện Tại vs Kỳ Trước Đó)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Website / Dự Án</th>
                <th className="px-5 py-3 text-center border-l border-slate-200">Đơn Hàng (K.Trước)</th>
                <th className="px-5 py-3 text-center">Đơn Hàng (K.Này)</th>
                <th className="px-5 py-3 text-center bg-slate-50/80 text-emerald-600">± Tăng trưởng Đơn</th>
                <th className="px-5 py-3 text-center border-l border-slate-200">Sản Phẩm (K.Trước)</th>
                <th className="px-5 py-3 text-center">Sản Phẩm (K.Này)</th>
                <th className="px-5 py-3 text-center bg-slate-50/80 text-emerald-600">± Tăng trưởng SP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialProjects.map(p => {
                const comp = projectComparison[p.id];
                if (!comp) return null;
                if (comp.curOrders === 0 && comp.prevOrders === 0) return null; // Hide totally inactive projects
                
                const renderGrowth = (cur: number, prev: number) => {
                  if (prev === 0 && cur === 0) return <span className="text-slate-400 font-medium">-</span>;
                  if (prev === 0 && cur > 0) return <span className="text-emerald-500 font-bold">+100.0% ↗</span>;
                  const pct = ((cur - prev) / prev) * 100;
                  if (pct > 0) return <span className="text-emerald-500 font-bold">+{pct.toFixed(1)}% ↗</span>;
                  if (pct < 0) return <span className="text-rose-500 font-bold">{pct.toFixed(1)}% ↘</span>;
                  return <span className="text-slate-400 font-medium">0%</span>;
                };

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800">{comp.name}</td>
                    <td className="px-5 py-3 text-center text-slate-500 border-l border-slate-50">{comp.prevOrders}</td>
                    <td className="px-5 py-3 text-center font-bold text-slate-800">{comp.curOrders}</td>
                    <td className="px-5 py-3 text-center bg-slate-50/50">{renderGrowth(comp.curOrders, comp.prevOrders)}</td>
                    <td className="px-5 py-3 text-center text-slate-500 border-l border-slate-50">{comp.prevProducts}</td>
                    <td className="px-5 py-3 text-center font-bold text-indigo-700">{comp.curProducts}</td>
                    <td className="px-5 py-3 text-center bg-slate-50/50">{renderGrowth(comp.curProducts, comp.prevProducts)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {Object.values(projectComparison).every(c => c.curOrders === 0 && c.prevOrders === 0) && (
            <div className="text-center py-8 text-slate-400 text-sm">Chưa có phát sinh lượng đơn nào ở cả 2 kỳ để so sánh.</div>
          )}
        </div>
      </div>

      {/* ADVANCED METRICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        
        {/* Retention Rate */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-indigo-600" />
            Khách Cũ vs Khách Mới (Retention)
          </h2>
          <div className="flex justify-between items-end mb-4">
            <div>
              <div className="text-3xl font-black text-slate-800">{retentionRate.toFixed(1)}%</div>
              <div className="text-sm font-semibold text-slate-500">Tỷ lệ khách hàng quay lại</div>
            </div>
            <div className="text-sm font-bold text-slate-600">{returningCount + newCount} Khách Tổng</div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex mb-6">
            <div className="bg-indigo-500 h-full" style={{ width: `${retentionRate}%` }}></div>
            <div className="bg-emerald-400 h-full" style={{ width: `${100 - retentionRate}%` }}></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Khách Quay Lại</span>
              </div>
              <div className="text-xl font-black text-slate-800">{returningCount} <span className="text-xs font-semibold text-slate-500">Người</span></div>
              <div className="text-sm font-bold text-indigo-600 mt-0.5">${returningIncome.toFixed(2)}</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Khách Mới Mua</span>
              </div>
              <div className="text-xl font-black text-slate-800">{newCount} <span className="text-xs font-semibold text-slate-500">Người</span></div>
              <div className="text-sm font-bold text-emerald-600 mt-0.5">${newIncome.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* VIP Leaderboard */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-amber-500" />
            Bảng Vàng Khách VIP
          </h2>
          <div className="space-y-3 mt-auto">
            {topVIPs.length > 0 ? topVIPs.map((vip, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 truncate max-w-[120px]" title={vip.name}>{vip.name}</div>
                    <div className="text-[10px] font-semibold text-slate-500">{vip.orders} đơn hàng</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-slate-800">${vip.income.toFixed(2)}</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-sm text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl bg-slate-50">Chưa có dữ liệu khách hàng VIP trong kỳ này.</div>
            )}
          </div>
        </div>

        {/* Cancellation Funnel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-6">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            Kiểm Soát Nhận / Hoàn Huỷ Phễu
          </h2>
          
          <div className="flex gap-4 items-center justify-between mb-6 mt-auto">
            <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex-1 relative overflow-hidden">
              <div className="text-[11px] font-black text-emerald-600 mb-1 tracking-widest uppercase">Đơn Thành Công</div>
              <div className="text-3xl font-black text-emerald-700">{successCount}</div>
              <div className="text-sm font-bold text-emerald-600 mt-1">${totalSuccessfulRevenue.toFixed(2)}</div>
            </div>
            <ArrowRight className="w-6 h-6 text-slate-300 shrink-0" />
            <div className="text-center p-4 bg-rose-50 rounded-xl border border-rose-100 flex-1 relative overflow-hidden">
              <div className="text-[11px] font-black text-rose-600 mb-1 tracking-widest uppercase">Thất bại / Bùng</div>
              <div className="text-3xl font-black text-rose-700">{cancelledCount}</div>
              <div className="text-sm font-bold text-rose-600 mt-1">-${totalLostRevenue.toFixed(2)}</div>
            </div>
          </div>

          <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center mt-2">
             <div>
               <div className="text-xs font-bold text-slate-500 mb-0.5">Tỷ Lệ Bùng Cắp (Cancel Rate)</div>
               <div className="text-2xl font-black text-slate-800">{cancelRate.toFixed(1)}%</div>
             </div>
             <div className="text-right flex flex-col items-end">
               <div className="text-xs font-bold text-slate-500 mb-0.5">Doanh Thu Thất Thoát</div>
               <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-lg font-black border border-rose-200">
                 -${totalLostRevenue.toFixed(2)}
               </div>
             </div>
          </div>
        </div>

        {/* Project P&L */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Lợi Nhuận Ròng (P&L) Chi Tiết
          </h2>
          <div className="overflow-x-auto mt-auto border border-slate-100 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-wider">Website</th>
                  <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wider">Gross Income</th>
                  <th className="px-4 py-3 text-right text-rose-600 text-[11px] uppercase tracking-wider">Tiền Ads & Chi phí</th>
                  <th className="px-4 py-3 text-right text-emerald-600 text-[11px] uppercase tracking-wider">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 relative">
                {Object.values(projectPnL).map((pnl, idx) => {
                  const net = pnl.income - (pnl.expense);
                  const isProfit = net >= 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-800">{pnl.name}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-600">${pnl.income.toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-right font-black text-rose-500">-${pnl.expense.toFixed(2)}</td>
                      <td className={`px-4 py-3.5 text-right font-black ${isProfit ? 'text-emerald-500' : 'text-rose-600'}`}>
                        ${net.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {Object.keys(projectPnL).length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400 text-sm font-medium">Chưa có dự án kinh doanh nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Golden Hours Heatmap */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-6">
            <Flame className="w-5 h-5 text-orange-500" />
            Lưới Nhiệt Khung Giờ Vàng (Golden Hours Heatmap)
          </h2>
          <p className="text-xs font-semibold text-slate-500 mb-6">
            Trực quan hóa mức độ mua hàng (Múi Giờ). Đồ thị màu càng rực đỏ chứng tỏ số lượng Đơn càng lớn để tối ưu chi tiền Ads.
          </p>
          <div className="overflow-x-auto pb-4 mt-auto">
            <div className="min-w-[800px] flex gap-2">
              <div className="w-16 shrink-0 flex flex-col gap-1.5 mt-6">
                {heatmapDays.map((day, i) => (
                  <div key={i} className="h-7 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end pr-2">{day}</div>
                ))}
              </div>
              <div className="flex-1">
                <div className="flex gap-1.5 mb-2">
                  {heatmapHours.map((hour) => (
                    <div key={hour} className="flex-1 text-center text-[10px] font-black text-slate-300">{hour}h</div>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  {heatmapDays.map((day, dayIdx) => (
                    <div key={dayIdx} className="flex gap-1.5">
                      {heatmapHours.map((hour) => {
                        const count = heatmapData[`${dayIdx}-${hour}`] || 0;
                        const intensity = count > 0 ? Math.max(0.1, count / maxHeatmap) : 0;
                        return (
                          <div 
                            key={hour} 
                            className="flex-1 h-7 rounded-md relative group cursor-pointer transition-all hover:scale-[1.15] hover:z-10 shadow-sm"
                            style={{ 
                              backgroundColor: count > 0 ? `rgba(249, 115, 22, ${intensity})` : '#f8fafc',
                              border: count === 0 ? '1px solid #f1f5f9' : 'none'
                            }}
                          >
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-900 border border-slate-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap z-50 shadow-xl">
                              <span className="text-orange-400 text-sm font-black mr-1">{count}</span> Giao dịch
                              <div className="text-slate-400 font-medium text-[9px] mt-0.5">{hour}h00 {day}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
