"use client";

import { useState, useMemo } from "react";
import { Search, Copy, CalendarClock, Download, Calendar, Trash2, Loader2, X } from "lucide-react";
import { isToday, isThisWeek, isThisMonth, isThisYear, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import * as ExcelJS from "exceljs";

export default function CustomersClient({ initialCustomers }: { initialCustomers: any[] }) {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Local Data State so we can remove instantly without full reload
  const [localCustomers, setLocalCustomers] = useState<any[]>(() => {
    return [...(initialCustomers || [])].sort((a, b) => Number(b.lifetime_spent || 0) - Number(a.lifetime_spent || 0));
  });

  // History Modal State
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<any | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const openHistory = async (c: any) => {
    setSelectedCustomerForHistory(c);
    setIsHistoryModalOpen(true);
    setHistoryOrders([]);
    setIsLoadingHistory(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, created_at, products_summary, total_price, status")
        .eq("customer_id", c.id)
        .order("created_at", { ascending: false });
      if (data) setHistoryOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return localCustomers.filter((c: any) => {
      // Basic search
      const term = appliedSearch.toLowerCase();
      const matchesSearch = 
        (c.full_name && c.full_name.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.tags && c.tags.some((t: string) => t.toLowerCase().includes(term)));

      // Date Filtering based on last_order_date or created_at
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const dOptions = c.last_order_date || c.created_at;
        if (!dOptions) {
          matchesDate = false;
        } else {
          const d = new Date(dOptions);
          if (dateFilter === 'today') matchesDate = isToday(d);
          else if (dateFilter === 'week') matchesDate = isThisWeek(d, { weekStartsOn: 1 });
          else if (dateFilter === 'month') matchesDate = isThisMonth(d);
          else if (dateFilter === 'year') matchesDate = isThisYear(d);
          else if (dateFilter === 'custom' && startDate && endDate) {
            matchesDate = isWithinInterval(d, { start: startOfDay(parseISO(startDate)), end: endOfDay(parseISO(endDate)) });
          }
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [localCustomers, appliedSearch, dateFilter, startDate, endDate]);

  // Checkbox Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCustomers.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectCustomer = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const isAllSelected = filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredCustomers.length;

  // EXCEL EXPORT
  const handleExportExcel = async () => {
    if (selectedIds.length === 0) {
      return alert("Vui lòng tick chọn ít nhất 1 khách hàng để xuất Excel.");
    }
    
    setIsExporting(true);
    try {
      const customersToExport = filteredCustomers.filter(c => selectedIds.includes(c.id));
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Customers");
      
      sheet.columns = [
        { header: "Customer ID", key: "id", width: 15 },
        { header: "Tên Khách Hàng", key: "full_name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Số Điện Thoại", key: "phone", width: 18 },
        { header: "Tags (VIP/Loại)", key: "tags", width: 25 },
        { header: "Lần Mua Cuối", key: "last_order_date", width: 22 },
        { header: "Tổng Số Đơn", key: "lifetime_orders", width: 15 },
        { header: "LTV ($ Mua Hàng)", key: "lifetime_spent", width: 18 }
      ];

      customersToExport.forEach(c => {
        sheet.addRow({
          id: c.id,
          full_name: c.full_name || "Guest User",
          email: c.email || "-",
          phone: c.phone || "-",
          tags: (c.tags || []).join(", "),
          last_order_date: c.last_order_date ? new Date(c.last_order_date).toLocaleString() : "Chưa từng mua",
          lifetime_orders: Number(c.lifetime_orders || 0),
          lifetime_spent: Number(c.lifetime_spent || 0)
        });
      });

      // Style header
      sheet.getRow(1).font = { bold: true };
      
      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Customers_Export_${new Date().getTime()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Lỗi khi xuất tệp: " + err);
    } finally {
      setIsExporting(false);
    }
  };

  // DELETE CUSTOMERS
  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn ${ids.length} khách hàng không? Hành động này không thể hoàn tác!`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { deleteCustomersAction } = await import("./actions");
      const res = await deleteCustomersAction(ids);
      if (res.success) {
        setLocalCustomers(prev => prev.filter(c => !ids.includes(c.id)));
        setSelectedIds([]);
      } else {
        alert(res.error);
      }
    } catch (err: any) {
      alert("Lỗi kết nối khi xóa: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDaysSince = (dateString: string) => {
    if (!dateString) return "Chưa từng mua";
    const lastOrder = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastOrder.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hôm nay";
    if (diffDays === 1) return "Hôm qua";
    return `${diffDays} ngày trước`;
  };

  const getDaysBadgeColor = (dateString: string) => {
    if (!dateString) return "text-slate-400 bg-slate-50";
    const lastOrder = new Date(dateString);
    const diffTime = Math.abs(new Date().getTime() - lastOrder.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return "text-green-700 bg-green-50 border border-green-100";
    if (diffDays <= 30) return "text-yellow-700 bg-yellow-50 border border-yellow-100";
    return "text-red-700 bg-red-50 border border-red-100 font-bold";
  };

  const renderTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return <span className="text-xs text-slate-400 italic">No tags</span>;
    return (
      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
        {tags.map((tag, i) => {
          let color = "bg-slate-100 text-slate-600 border-slate-200";
          if (tag.toLowerCase().includes("vip")) color = "bg-purple-100 text-purple-700 border-purple-200 font-bold mix-blend-multiply";
          if (tag.toLowerCase().includes("pack 10")) color = "bg-orange-100 text-orange-700 border-orange-200 mix-blend-multiply";
          if (tag.toLowerCase().includes("mới")) color = "bg-blue-100 text-blue-700 border-blue-200 mix-blend-multiply";
          
          return (
            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border ${color}`}>
              {tag}
            </span>
          );
        })}
      </div>
    );
  };

  const copyInfo = (c: any) => {
    const text = `Tên: ${c.full_name || "Guest"}\nEmail: ${c.email}\nSĐT: ${c.phone || "Không có"}`;
    navigator.clipboard.writeText(text);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 pt-16 md:p-8 md:pt-8 h-full flex flex-col">
      {/* Header & Main Date Filter */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 shrink-0 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Hồ Sơ Khách Hàng</h1>
          <p className="text-sm text-slate-500 mt-1">{filteredCustomers.length} khách hàng trong bộ lọc này</p>
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
                className={`px-3 py-1.5 flex items-center justify-center text-xs font-bold rounded-md transition-all ${dateFilter === f.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button 
                onClick={() => handleDelete(selectedIds)}
                disabled={isDeleting}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Xóa ({selectedIds.length})
              </button>
            )}
            
            <button 
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search Sub-row */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg w-80 text-sm border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm tên, email, SDT, hoặc tên Tag..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setAppliedSearch(search);
            }}
            className="bg-transparent border-none outline-none flex-1 text-slate-700 placeholder:text-slate-400" 
          />
          <button 
            onClick={() => setAppliedSearch(search)}
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-xs font-bold transition-colors shadow-sm ml-1"
          >
            Tìm
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm relative">
        <table className="w-full text-left min-w-[900px] whitespace-nowrap">
          <thead className="bg-[#F8FAFC] border-b text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10 shadow-sm">
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
              <th className="px-5 py-4">Khách hàng</th>
              <th className="px-5 py-4">Tags (Phân Lớp)</th>
              <th className="px-5 py-4">Lần Mua Cuối</th>
              <th className="px-5 py-4 text-center">Số Đơn</th>
              <th className="px-5 py-4 text-right text-indigo-600">LTV (Lifetime Spent)</th>
              <th className="px-5 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredCustomers.length > 0 ? filteredCustomers.map((c) => {
              const isSelected = selectedIds.includes(c.id);
              return (
                <tr key={c.id} className={`transition-colors py-1 ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                  <td className="px-5 py-4 text-center">
                     <input 
                       type="checkbox" 
                       checked={isSelected}
                       onChange={() => toggleSelectCustomer(c.id)}
                       className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                     />
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => openHistory(c)} className="font-bold text-slate-800 text-base hover:text-blue-600 hover:underline text-left text-wrap decoration-blue-300 underline-offset-4 line-clamp-2">
                       {c.full_name || "Guest User"}
                    </button>
                    <div className="text-[12px] text-slate-500 mt-1 flex flex-col gap-0.5 items-start">
                      <span className="truncate max-w-[200px]" title={c.email}>{c.email}</span>
                      {c.phone && <span>{c.phone}</span>}
                      {c.project?.name && (
                        <span className="inline-flex max-w-max items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 mt-0.5">
                          [{c.project.name}]
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {renderTags(c.tags)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${getDaysBadgeColor(c.last_order_date)}`}>
                      <CalendarClock className="w-3.5 h-3.5" />
                      {getDaysSince(c.last_order_date)}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1.5 ml-1">
                      {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : ""}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="font-black text-slate-700 text-lg">{c.lifetime_orders}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="font-black text-indigo-600 text-lg">{Number(c.lifetime_spent).toFixed(2)} AUD</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => copyInfo(c)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Copy thông tin (Tên, SĐT, Email)"
                      >
                        {copiedId === c.id ? <span className="text-xs font-bold text-green-600 px-1">Copied!</span> : <Copy className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => handleDelete([c.id])}
                        disabled={isDeleting}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Xóa vĩnh viễn khách hàng này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-500 font-medium">
                  Không tìm thấy khách hàng nào khớp với tìm kiếm hoặc bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* HISTORY MODAL */}
      {isHistoryModalOpen && selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">Hồ Sơ Của: <span className="text-blue-600">{selectedCustomerForHistory.full_name || "Guest User"}</span></h3>
                <p className="text-sm text-slate-500 mt-1">{selectedCustomerForHistory.email}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#F8FAFC] border-b text-xs uppercase font-semibold text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-5 py-3">Ngày Mua</th>
                    <th className="px-5 py-3">Mã Đơn</th>
                    <th className="px-5 py-3">Sản Phẩm</th>
                    <th className="px-5 py-3">Thành Tiền</th>
                    <th className="px-5 py-3 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                        <Loader2 className="w-5 h-5 animate-spin mr-2 inline-block text-slate-400" />
                        Đang lấy lịch sử mua hàng...
                      </td>
                    </tr>
                  ) : historyOrders.length > 0 ? (
                    historyOrders.sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((order: any) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-3 font-semibold text-slate-700">{order.order_number}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            {(order.products_summary || []).map((p:any, i:number) => (
                              <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 w-max">{p.quantity}x {p.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 font-bold text-emerald-600">
                          {Number(order.total_price).toFixed(2)} {order.currency || 'AUD'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${
                            order.status === 'completed' || order.status === 'processing' ? 'bg-green-100 text-green-700' :
                            order.status === 'cancelled' || order.status === 'failed' || order.status === 'trash' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500 font-medium italic">
                        Chưa có dữ liệu đơn hàng (Khách hàng này có thể mới đăng ký hoặc bị ẩn).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 text-right">
              <div className="text-xs text-slate-500 font-medium tracking-wide">
                <span>Tổng số đơn đã mua:</span> <span className="font-bold text-slate-800 text-sm ml-1 mr-4">{historyOrders.length}</span> 
                <span>Tổng chi tiêu LTV:</span> <span className="font-bold text-indigo-600 text-sm ml-1">{Number(selectedCustomerForHistory.lifetime_spent).toFixed(2)} AUD</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
