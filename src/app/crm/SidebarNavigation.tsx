"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Users, TrendingDown, Activity, Settings, Hexagon, ChevronLeft, Menu, LogOut } from "lucide-react";
import { Suspense, useState } from "react";

function SidebarNavigationContent({ isAdmin, projects }: { isAdmin: boolean, projects: any[] }) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const currentProject = projects.find(p => p.id === projectId);
  const getHref = (path: string) => projectId ? `${path}?project=${projectId}` : path;

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-3 left-4 z-40 p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay for Mobile */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        ></div>
      )}

      {/* Sidebar Content */}
      <aside className={`bg-white border-r border-slate-100 flex flex-col z-50 shrink-0 h-full transition-transform duration-300 transform fixed md:relative left-0 top-0 bottom-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isCollapsed ? 'md:w-[72px] w-[260px]' : 'w-[260px]'}`}>
        <div className={`p-4 flex items-center border-b border-slate-100 h-16 md:h-20 shrink-0 ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between px-6'}`}>
          {(!isCollapsed || isMobileOpen) && (
            <Link href="/crm" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Hexagon className="w-5 h-5 fill-current" />
              </div>
              <span className="text-xl font-black tracking-tight text-slate-800">CRM</span>
            </Link>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden md:block p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm"
            title="Toggle Sidebar"
          >
             <Menu className="w-4 h-4" />
          </button>

          {/* Mobile Close */}
          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm"
          >
             <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {(!isCollapsed || isMobileOpen) && projectId && currentProject && (
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex flex-col gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Workspace</span>
              <span className="font-bold text-blue-800 text-sm leading-tight">{currentProject.name}</span>
              <Link href="/crm" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold mt-1">
                <ChevronLeft className="w-3 h-3" /> Trở về Global
              </Link>
            </div>
          </div>
        )}

        {isCollapsed && !isMobileOpen && projectId && (
          <div className="py-4 border-b border-slate-100 flex justify-center">
            <Link href="/crm" className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg" title={`Trở về Global (${currentProject?.name})`}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </div>
        )}

        <nav className={`flex-1 overflow-y-auto mt-4 space-y-2 ${isCollapsed && !isMobileOpen ? 'px-2' : 'px-4'}`}>
          {isAdmin && (
            <div className="pb-1">
              <Link onClick={() => setIsMobileOpen(false)} href="/crm" className={`flex items-center gap-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors font-medium group ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-3'}`} title="Dashboard Global">
                <div className="p-1.5 rounded bg-slate-50 group-hover:bg-slate-200 transition-colors"><LayoutDashboard className="w-4 h-4" /></div>
                {(!isCollapsed || isMobileOpen) && <span>{projectId ? "Dashboard Global" : "Dashboard Tổng"}</span>}
              </Link>
            </div>
          )}
          
          <div className="pb-1">
            <Link onClick={() => setIsMobileOpen(false)} href={getHref("/crm/orders")} className={`flex items-center gap-3 py-2.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors font-bold group ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-3'}`} title="Quản Lý Orders">
              <div className="p-1.5 rounded bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><ShoppingCart className="w-4 h-4" /></div>
              {(!isCollapsed || isMobileOpen) && <span className="flex-1">Quản Lý Orders</span>}
            </Link>
          </div>
          
          <div className="pb-1">
            <Link onClick={() => setIsMobileOpen(false)} href={getHref("/crm/customers")} className={`flex items-center gap-3 py-2.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors font-bold group ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-3'}`} title="Khách Hàng">
              <div className="p-1.5 rounded bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Users className="w-4 h-4" /></div>
              {(!isCollapsed || isMobileOpen) && <span className="flex-1">Khách Hàng</span>}
            </Link>
          </div>

          {isAdmin && (
            <>
              <div className="pb-1">
                <Link onClick={() => setIsMobileOpen(false)} href={getHref("/crm/expenses")} className={`flex items-center gap-3 py-2.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors font-bold group ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-3'}`} title="Quản Lý Chi Phí">
                  <div className="p-1.5 rounded bg-slate-100 group-hover:bg-red-100 group-hover:text-red-600 transition-colors"><TrendingDown className="w-4 h-4" /></div>
                  {(!isCollapsed || isMobileOpen) && <span className="flex-1">Quản Lý Chi Phí</span>}
                </Link>
              </div>
              
              <div className="pb-1">
                <Link onClick={() => setIsMobileOpen(false)} href={getHref("/crm/analytics")} className={`flex items-center gap-3 py-2.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors font-bold group ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-3'}`} title="Analytics">
                  <div className="p-1.5 rounded bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors"><Activity className="w-4 h-4" /></div>
                  {(!isCollapsed || isMobileOpen) && <span className="flex-1">Analytics</span>}
                </Link>
              </div>
              
              <div className="pb-1">
                <Link onClick={() => setIsMobileOpen(false)} href={getHref("/crm/settings")} className={`flex items-center gap-3 py-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors font-bold group ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-3'}`} title="Settings">
                  <div className="p-1.5 rounded bg-slate-100 group-hover:bg-slate-200 transition-colors"><Settings className="w-4 h-4" /></div>
                  {(!isCollapsed || isMobileOpen) && <span className="flex-1">Settings</span>}
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* Author Info & Dev Test */}
        <div className={`p-4 mt-auto border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2 ${isCollapsed && !isMobileOpen ? 'px-2 items-center justify-center' : ''}`}>
          {(!isCollapsed || isMobileOpen) && (
            <div className="text-xs text-slate-500 flex flex-col gap-1 mb-2">
              <div className="font-semibold text-slate-700 mb-0.5">Dũng Lucky</div>
              <p>Tele: @locon99</p>
              <p>Email: Vutieulong@gmail.com</p>
            </div>
          )}
          
          <button 
            onClick={async () => {
              const { logoutAction } = await import('@/app/actions/authActions');
              await logoutAction();
              window.location.href = '/login';
            }}
            className={`w-full flex items-center justify-center gap-2 text-xs font-bold bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 py-2 rounded transition-all shadow-sm ${isCollapsed && !isMobileOpen ? 'px-2' : 'px-0'}`} 
            title="Đăng Xuất"
          >
             <LogOut className="w-3.5 h-3.5" />
             {(!isCollapsed || isMobileOpen) && 'Đăng Xuất'}
          </button>


        </div>
      </aside>
    </>
  );
}

export default function SidebarNavigation(props: any) {
  return (
    <Suspense fallback={<aside className="w-[260px] bg-white border-r border-slate-100 flex flex-col z-10 shrink-0"><div className="p-8 text-center text-xs text-slate-400">Loading Navigation...</div></aside>}>
      <SidebarNavigationContent {...props} />
    </Suspense>
  )
}
