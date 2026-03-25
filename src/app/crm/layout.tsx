import Link from "next/link";
import { 
  Building2, Users, Phone, LayoutDashboard, 
  Calendar, Activity, FileText, Search, 
  Mail, Bell, ChevronDown, Hexagon, Settings, TrendingDown
} from "lucide-react";

import { cookies } from "next/headers";

import SidebarNavigation from "./SidebarNavigation";
import { supabase } from "@/lib/supabase";

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role = cookieStore.get("crm_role")?.value || "admin";
  const isAdmin = role === "admin";

  const { data: projects } = await supabase.from('projects').select('*');

  return (
    <div className="flex h-screen bg-white font-sans text-slate-800">
      <div className="flex w-full overflow-hidden isolate relative">
        {/* Dynamic Sidebar */}
        <SidebarNavigation isAdmin={isAdmin} projects={projects || []} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative z-0 h-full overflow-hidden">
          {/* Page content */}
          <div className="flex-1 overflow-auto bg-[#F8FAFC] relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Sidebar Navigation Item Component
function NavItem({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <a href="#" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors font-medium">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <span>{label}</span>
      </div>
      <ChevronDown className="w-4 h-4 opacity-50" />
    </a>
  );
}
