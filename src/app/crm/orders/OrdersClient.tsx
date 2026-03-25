"use client";

import { useState } from "react";
import { Download, Filter, Search, Eye, EyeOff, CheckCircle2, Clock, XCircle, MoreVertical, Calendar, ShoppingCart, Plus } from "lucide-react";
import { isToday, isThisWeek, isThisMonth, isThisYear, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import * as ExcelJS from "exceljs";

export default function OrdersClient({ initialOrders, initialProjects = [], role = 'admin' }: { initialOrders: any[], initialProjects?: any[], role?: string }) {
  const isAdmin = role === 'admin';
  const [focusMode, setFocusMode] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Array Filtering
  const filteredOrders = initialOrders.filter((o) => {
    // Basic search
    const term = search.toLowerCase();
    const customer = o.customers || {};
    const matchesSearch = 
      o.order_number.toLowerCase().includes(term) ||
      (customer.full_name && customer.full_name.toLowerCase().includes(term)) ||
      (customer.email && customer.email.toLowerCase().includes(term));

    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    
    // Date Filtering
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const od = new Date(o.created_at);
      if (dateFilter === 'today') matchesDate = isToday(od);
      else if (dateFilter === 'week') matchesDate = isThisWeek(od, { weekStartsOn: 1 });
      else if (dateFilter === 'month') matchesDate = isThisMonth(od);
      else if (dateFilter === 'year') matchesDate = isThisYear(od);
      else if (dateFilter === 'custom' && startDate && endDate) {
        matchesDate = isWithinInterval(od, { start: startOfDay(parseISO(startDate)), end: endOfDay(parseISO(endDate)) });
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate Summary
  const validOrders = filteredOrders.filter(o => !['cancelled', 'refunded', 'failed', 'trash'].includes(o.status));
  const totalGross = validOrders.reduce((sum, o) => sum + Number(o.total_price), 0);
  const totalFees = validOrders.reduce((sum, o) => sum + Number(o.paypal_fee), 0);
  const totalNet = totalGross - totalFees;
  const totalIncome = validOrders.reduce((sum, o) => sum + Number(o.total_income) + Number(o.manual_adjustment), 0);
  
  let totalQty = 0;
  validOrders.forEach(o => {
    const prods = o.products_summary || [];
    prods.forEach((p: any) => totalQty += Number(p.quantity || 1));
  });

  // Checkbox Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOrder = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const isAllSelected = filteredOrders.length > 0 && selectedIds.length === filteredOrders.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredOrders.length;

  // EXCEL EXPORT
  const handleExportExcel = async () => {
    if (selectedIds.length === 0) {
      return alert("Vui lòng tick chọn ít nhất 1 đơn hàng để xuất Excel.");
    }
    
    setIsExporting(true);
    try {
      const ordersToExport = filteredOrders.filter(o => selectedIds.includes(o.id));
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Orders");
      
      const columns = [
        { header: "Order ID", key: "order_number", width: 15 },
        { header: "Date", key: "date", width: 20 },
        { header: "Customer Name", key: "customer_name", width: 25 },
        { header: "Customer Email", key: "customer_email", width: 25 },
        { header: "Products", key: "products", width: 40 },
        { header: "Status", key: "status", width: 15 },
        { header: "Total Price ($)", key: "total_price", width: 15 },
        { header: "PayPal Fee ($)", key: "paypal_fee", width: 15 }
      ];

      if (isAdmin) {
        columns.push({ header: "Net Rev ($)", key: "net_rev", width: 15 });
        columns.push({ header: "Income ($)", key: "income", width: 15 });
      }

      sheet.columns = columns;

      ordersToExport.forEach(o => {
        const customer = o.customers || {};
        const productsStr = (o.products_summary || []).map((p:any) => `${p.quantity}x ${p.name}`).join(", ");
        const net = Number(o.total_price) - Number(o.paypal_fee);
        
        const rowData: any = {
          order_number: o.order_number,
          date: new Date(o.created_at).toLocaleString(),
          customer_name: customer.full_name || "Guest",
          customer_email: customer.email || "-",
          products: productsStr,
          status: o.status,
          total_price: Number(o.total_price),
          paypal_fee: Number(o.paypal_fee)
        };

        if (isAdmin) {
          rowData.net_rev = net;
          rowData.income = Number(o.total_income) + Number(o.manual_adjustment);
        }

        sheet.addRow(rowData);
      });

      // Style header
      sheet.getRow(1).font = { bold: true };
      
      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Orders_Export_${new Date().getTime()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Lỗi khi xuất tệp: " + err);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed': return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-semibold border border-green-100"><CheckCircle2 className="w-3.5 h-3.5"/> Completed</span>;
      case 'processing': return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100"><Clock className="w-3.5 h-3.5"/> Processing</span>;
      case 'pending': return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 text-xs font-semibold border border-yellow-100"><Clock className="w-3.5 h-3.5"/> Pending</span>;
      case 'cancelled':
      case 'failed':
      case 'refunded': return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-semibold border border-slate-200"><XCircle className="w-3.5 h-3.5"/> {status}</span>;
      default: return <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-600 text-xs font-semibold border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col font-sans">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 shrink-0 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" /> Quản Lý Đơn Hàng
          </h1>
          <p className="text-sm text-slate-500 mt-1">Tra cứu, xem trạng thái đóng gói và lịch sử khách mua.</p>
        </div>
      </div>

      {/* Date Filters & Export */}
      <div className="flex flex-col xl:flex-row justify-end items-start xl:items-center mb-6 shrink-0 gap-4">

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
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm">
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

          <button 
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50 w-full md:w-auto"
          >
            {isExporting ? <Clock className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Xuất Excel ({selectedIds.length})
          </button>
        </div>
      </div>

      {/* 🌟 Search & Secondary Filters 🌟 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 gap-4 w-full">
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg w-full md:w-80 text-sm border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm mã đơn, tên, email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 text-slate-700 placeholder:text-slate-400" 
          />
        </div>
        
        <div className="flex gap-3 items-center w-full md:w-auto flex-wrap">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm outline-none cursor-pointer font-medium"
          >
            <option value="all">Tất cả Trạng thái</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button 
            onClick={() => setFocusMode(!focusMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm border ${
              focusMode ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
            }`}
          >
            {focusMode ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
            {focusMode ? "Chế độ: Đang Chạm Ẩn" : "Bật Ẩn Doanh Thu"}
          </button>
        </div>
      </div>

      {/* 🌟 Data Table 🌟 */}
      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm relative w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal min-w-[1000px]">
          <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-5 py-4 w-[50px] text-center">
                 <input 
                   type="checkbox" 
                   checked={isAllSelected}
                   ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                   onChange={(e) => handleSelectAll(e.target.checked)}
                   className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 />
              </th>
              <th className="px-5 py-4 min-w-[120px]">Order #</th>
              <th className="px-5 py-4 min-w-[200px]">Customer</th>
              <th className="px-5 py-4 min-w-[250px]">Products Summary</th>
              <th className="px-5 py-4">Status</th>
              {!focusMode && (
                <>
                  <th className="px-5 py-4 text-right">Total Price</th>
                  <th className="px-5 py-4 text-right">PayPal Fee</th>
                  {isAdmin && (
                    <>
                      <th className="px-5 py-4 text-right">Net Rev</th>
                      <th className="px-5 py-4 text-right text-blue-600">INCOME</th>
                    </>
                  )}
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredOrders.length > 0 ? filteredOrders.map((order) => {
              const customer = order.customers || {};
              const products = order.products_summary || [];
              const net = Number(order.total_price) - Number(order.paypal_fee);
              const isInvalid = ['cancelled', 'refunded', 'failed', 'trash'].includes(order.status);
              const isSelected = selectedIds.includes(order.id);
              
              return (
                <tr key={order.id} className={`transition-colors py-1 ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'} ${isInvalid ? 'bg-slate-50/50 grayscale-[0.5] opacity-80' : ''}`}>
                  <td className="px-5 py-3 text-center">
                     <input 
                       type="checkbox" 
                       checked={isSelected}
                       onChange={() => toggleSelectOrder(order.id)}
                       className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                     />
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-bold text-slate-800">#{order.order_number}</span>
                    <div className="text-[11px] text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-800">{customer.full_name || "Guest"}</div>
                    <div className="text-[12px] text-slate-500 truncate mt-0.5 max-w-[180px]" title={customer.email}>{customer.email || "-"}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1 max-w-[250px]">
                      {products.map((p: any, i: number) => (
                        <div key={i} className="text-[12px] text-slate-700 leading-tight">
                          <span className="font-semibold">{p.quantity}x</span> {p.name || "Unknown Product"} 
                          {!focusMode && <span className="text-slate-400 ml-1">(${p.line_income})</span>}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {getStatusBadge(order.status)}
                    {order.utm_source && (
                       <div className="mt-1.5 text-[10px] uppercase font-bold text-slate-400 border border-slate-200 bg-slate-100 rounded px-1.5 py-0.5 inline-block">
                         {order.utm_source}
                       </div>
                    )}
                  </td>
                  
                  {!focusMode && (
                    <>
                      <td className="px-5 py-3 text-right font-medium text-slate-700">${Number(order.total_price).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-medium text-red-500">-${Number(order.paypal_fee).toFixed(2)}</td>
                      {isAdmin && (
                         <>
                           <td className="px-5 py-3 text-right font-bold text-slate-800">${net.toFixed(2)}</td>
                           <td className="px-5 py-3 text-right">
                             <span className="inline-block bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-bold border border-blue-100">
                               ${(Number(order.total_income) + Number(order.manual_adjustment)).toFixed(2)}
                             </span>
                           </td>
                         </>
                      )}
                    </>
                  )}
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={focusMode ? 5 : 9} className="py-20 text-center text-slate-500 font-medium">
                  Không tìm thấy đơn hàng nào khớp với tìm kiếm.
                </td>
              </tr>
            )}
          </tbody>
          
          {/* Summary Row */}
          <tfoot className="bg-slate-800 text-white sticky bottom-0 z-10 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.1)]">
            <tr>
              <td className="px-5 py-4 font-bold rounded-bl-xl border-t border-slate-700"></td>
              <td className="px-5 py-4 font-bold border-t border-slate-700" colSpan={2}>
                <span className="uppercase text-[11px] tracking-wider text-slate-400 block mb-0.5">Summary Filter</span>
                Tổng cộng {validOrders.length} Đơn chạy Ads
              </td>
              <td className="px-5 py-4 font-bold border-t border-slate-700">{totalQty} Món</td>
              <td className="px-5 py-4 border-t border-slate-700"></td> {/* Status blank */}
              
              {!focusMode && (
                <>
                  <td className="px-5 py-4 text-right font-bold border-t border-slate-700">${totalGross.toFixed(2)}</td>
                  <td className="px-5 py-4 text-right font-bold text-red-300 border-t border-slate-700">-${totalFees.toFixed(2)}</td>
                  {isAdmin && (
                     <>
                        <td className="px-5 py-4 text-right font-bold text-green-300 border-t border-slate-700">${totalNet.toFixed(2)}</td>
                        <td className="px-5 py-4 text-right text-lg font-black text-blue-300 rounded-br-xl border-t border-slate-700">${totalIncome.toFixed(2)}</td>
                     </>
                  )}
                  {!isAdmin && <td className="rounded-br-xl border-t border-slate-700"></td>}
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
