import { Hexagon, Loader2 } from "lucide-react";

export default function CRMLoading() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8FAFC]/80 backdrop-blur-sm z-50 animate-in fade-in duration-300">
      <div className="relative flex items-center justify-center mb-4">
        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
        <div className="relative w-16 h-16 bg-white rounded-2xl shadow-xl border border-blue-100 flex items-center justify-center">
          <Hexagon className="w-8 h-8 text-blue-600 animate-pulse fill-blue-50" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-700 tracking-tight">Đang tải dữ liệu...</h3>
      <p className="text-sm text-slate-400 mt-1">Hệ thống đang chuẩn bị báo cáo</p>
      
      <Loader2 className="w-5 h-5 text-blue-500 animate-spin mt-4" />
    </div>
  );
}
