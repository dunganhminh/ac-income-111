"use client";

import { useState, useMemo, useRef } from "react";
import { Plus, Trash2, TrendingDown, Calendar, Search, Download } from "lucide-react";
import { addExpenseAction, deleteExpenseAction } from "./actions";
import { isSameDay, isSameWeek, isSameMonth, isSameYear, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import * as ExcelJS from "exceljs";
import { toVNTime } from "@/lib/time";

export default function ExpensesClient({ initialProjects, initialExpenses, initialRates }: { initialProjects: any[], initialExpenses: any[], initialRates: any }) {
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [appliedSearch, setAppliedSearch] = useState("");

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const filteredExpenses = useMemo(() => initialExpenses.filter((e: any) => {
    const term = appliedSearch.toLowerCase();
    const matchesSearch = 
      e.reason.toLowerCase().includes(term) || 
      (e.projects?.name || "").toLowerCase().includes(term);

    let matchesDate = true;
    if (dateFilter !== 'all') {
      const dOptions = e.expense_date || e.created_at;
      if (!dOptions) {
        matchesDate = false;
      } else {
        const d = toVNTime(dOptions);
        const vnNow = toVNTime();
        if (dateFilter === 'today') matchesDate = isSameDay(d, vnNow);
        else if (dateFilter === 'week') matchesDate = isSameWeek(d, vnNow, { weekStartsOn: 1 });
        else if (dateFilter === 'month') matchesDate = isSameMonth(d, vnNow);
        else if (dateFilter === 'year') matchesDate = isSameYear(d, vnNow);
        else if (dateFilter === 'custom' && startDate && endDate) {
          matchesDate = isWithinInterval(d, { start: startOfDay(parseISO(startDate)), end: endOfDay(parseISO(endDate)) });
        }
      }
    }

    return matchesSearch && matchesDate;
  }), [initialExpenses, appliedSearch, dateFilter, startDate, endDate]);

  const rates = initialRates || { aud: 1.5, vnd: 25500 };
  const totalUsdSpent = useMemo(() => filteredExpenses.reduce((sum: number, e: any) => sum + Number(e.amount_usd), 0), [filteredExpenses]);
  const totalAudSpent = totalUsdSpent * Number(rates.aud);

  const formatMoney = (amount: number, currency: string) => {
    if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'VNĐ');
    if (currency === 'AUD') return `${amount.toFixed(2)} AUD`;
    return `${amount.toFixed(2)} USD`;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await addExpenseAction(formData);
      setIsAdding(false);
    } catch (error) {
      alert("Error adding expense");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Xóa khoản chi này? Hậu quả sẽ làm tăng số Net Profit bị sai!")) {
      await deleteExpenseAction(id);
    }
  }

  // Checkbox Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredExpenses.map(e => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectExpense = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const isAllSelected = filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredExpenses.length;

  // EXCEL EXPORT
  const handleExportExcel = async () => {
    if (selectedIds.length === 0) {
      return alert("Vui lòng tick chọn ít nhất 1 khoản chi phí để xuất Excel.");
    }
    
    setIsExporting(true);
    try {
      const expensesToExport = filteredExpenses.filter(e => selectedIds.includes(e.id));
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Expenses");
      
      sheet.columns = [
        { header: "Ngày Chi", key: "expense_date", width: 20 },
        { header: "Dự Án / Web", key: "project_name", width: 25 },
        { header: "Lý Do / Hạng Mục", key: "reason", width: 40 },
        { header: "Tiền Khai Báo", key: "amount", width: 15 },
        { header: "Tiền Tệ", key: "currency", width: 10 },
        { header: "Quy đổi USD", key: "amount_usd", width: 15 }
      ];

      expensesToExport.forEach(e => {
        sheet.addRow({
          expense_date: e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }) : "-",
          project_name: e.projects?.name || "Global",
          reason: e.reason,
          amount: Number(e.amount),
          currency: e.currency,
          amount_usd: Number(e.amount_usd)
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
      a.download = `Expenses_Export_${new Date().getTime()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Lỗi khi xuất tệp: " + err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 pt-16 md:p-8 md:pt-8 h-full flex flex-col font-sans">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 shrink-0 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-red-500" /> Quản Lý Chi Phí (Expenses)
          </h1>
          <p className="text-sm text-slate-500 mt-1">Các chi phí đã chi</p>
        </div>
        
        <div className="bg-red-50 text-red-700 px-4 py-2.5 rounded-xl border border-red-100 flex items-center justify-between shadow-sm w-full md:w-auto">
          <div className="text-sm font-semibold text-red-600 uppercase tracking-widest mr-3">Tổng Chi:</div>
          <div className="text-xl font-black">{totalAudSpent.toFixed(2)} AUD</div>
        </div>
      </div>

      {/* Date Filters & Export */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 shrink-0 gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg w-full md:w-80 text-sm border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Tìm lý do, hoặc tên Web..." 
            defaultValue={appliedSearch}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setAppliedSearch(e.currentTarget.value);
            }}
            className="bg-transparent border-none outline-none flex-1 font-medium text-slate-700" 
          />
          <button 
            onClick={() => setAppliedSearch(searchInputRef.current?.value || "")}
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-xs font-bold transition-colors shadow-sm ml-1"
          >
            Tìm
          </button>
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
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50 w-full md:w-auto"
          >
            {isExporting ? <Search className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Xuất Excel ({selectedIds.length})
          </button>
        </div>
      </div>

      <div className="flex gap-8 flex-col lg:flex-row h-full pb-8">
        
        {/* Left Column: Form Setup */}
        {isAdding && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm w-full lg:w-96 shrink-0 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-4 border-b border-slate-100 flex items-center justify-between">
              Thêm Khoản Chi Mới
              <button onClick={() => setIsAdding(false)} className="text-xs text-slate-400 font-semibold hover:text-slate-800">Đóng</button>
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Dự Án / Website</label>
                <select name="projectId" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-red-200">
                  {initialProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Lý do Chi (BBM, Ads, Host...)</label>
                <input name="reason" required type="text" placeholder="Vd: Chạy Ads FB Tháng 3" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-600 block mb-1">Số Tiền Khai Báo</label>
                  <input name="amount" required type="number" step="0.01" placeholder="Ví dụ: 500000" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200 font-mono font-bold" />
                </div>
                <div className="w-24 shrink-0">
                  <label className="text-xs font-bold text-slate-600 block mb-1">Tiền Tệ</label>
                  <select name="currency" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-200">
                    <option value="USD">USD</option>
                    <option value="VND">VNĐ</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Ngày Chi Tiền</label>
                <input name="expenseDate" type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200" />
              </div>

              <button disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-colors mt-2">
                {loading ? "Đang lưu..." : "Ghi nhận Chi Phí (- Tiền)"}
              </button>
            </form>
          </div>
        )}

        {/* Right Column: Table */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-slate-100">
             <div className="text-sm font-bold text-slate-700">{filteredExpenses.length} khoản chi trong bộ lọc này</div>

            {!isAdding && (
               <button onClick={() => setIsAdding(true)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-900 transition-colors">
                  <Plus className="w-4 h-4" /> Thêm Chi Phí
               </button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-[#F8FAFC] border-b text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-5 py-3 w-[50px] text-center">
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-3">Ngày Chi</th>
                  <th className="px-5 py-3">Dự Án</th>
                  <th className="px-5 py-3">Lý do / Hạng mục</th>
                  <th className="px-5 py-3 text-right">Khai Báo</th>
                  <th className="px-5 py-3 text-right text-red-600 bg-red-50/30">Tính Vào Dashboard (AUD)</th>
                  <th className="px-5 py-3 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredExpenses.map((e) => {
                  const isSelected = selectedIds.includes(e.id);
                  return (
                    <tr key={e.id} className={`transition-colors py-1 ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-5 py-4 text-center">
                         <input 
                           type="checkbox" 
                           checked={isSelected}
                           onChange={() => toggleSelectExpense(e.id)}
                           className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                         />
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-slate-700 font-medium flex items-center gap-2">
                           <Calendar className="w-3.5 h-3.5 text-slate-400" />
                           {new Date(e.expense_date).toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' })}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {e.projects?.name || "Global"}
                      </td>
                      <td className="px-5 py-4 text-slate-600 min-w-[200px]">
                        {e.reason}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs border border-slate-200">
                           {formatMoney(Number(e.amount), e.currency)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right bg-red-50/20">
                        <span className="font-black text-red-600 text-base">-{Number(Number(e.amount_usd) * rates.aud).toFixed(2)} AUD</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                         <button onClick={() => handleDelete(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  )
                })}
                {filteredExpenses.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-20 text-slate-500 font-medium">Không tìm thấy khoản chi nào khớp với mốc lọc.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
