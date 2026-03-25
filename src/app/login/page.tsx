"use client";

import { useState } from "react";
import { Hexagon, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { loginAction } from "@/app/actions/authActions";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await loginAction(formData);
      if (res?.success) {
        router.push("/crm");
        router.refresh();
      } else {
        setError(res?.error || "Đăng nhập thất bại");
      }
    } catch (err: any) {
      setError("Có lỗi hệ thống: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full point-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full point-events-none"></div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-5">
            <Hexagon className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Income Platform</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium">Bảo mật hệ thống nội bộ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4.5">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">Tên Đăng Nhập</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  name="username"
                  type="text"
                  required
                  placeholder="admin"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-semibold placeholder:text-slate-400 placeholder:font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">Mật Khẩu</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-semibold placeholder:text-slate-400 placeholder:font-medium"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 !mt-5 bg-red-50 border border-red-100 text-red-600 text-[13px] font-semibold rounded-xl text-center flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-slate-800 hover:bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all text-[15px] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 !mt-6"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Đăng Nhập <ArrowRight className="w-4.5 h-4.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-slate-100/80 text-center text-[11px] text-slate-400 font-semibold tracking-wide">
          Protected by AntiGravity Platform
        </div>
      </div>
    </div>
  );
}
