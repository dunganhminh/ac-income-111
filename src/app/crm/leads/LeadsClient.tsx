"use client";

import { useState } from "react";
import { Download, Filter, LayoutGrid, List, MoreVertical, Trash2, CheckCircle } from "lucide-react";
import LeadCard from "./LeadCard";
import { deleteLead, updateLeadStatus, addLead } from "./actions";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  time_label: string | null;
  status: string;
  badge_label: string | null;
  badge_color: string | null;
  created_at: string;
}

const statuses = [
  { id: "pending", label: "Pending", dot: "bg-yellow-500" },
  { id: "processing", label: "Processing", dot: "bg-blue-500" },
  { id: "completed", label: "Completed", dot: "bg-green-500" },
  { id: "cancelled", label: "Cancelled", dot: "bg-red-500" },
];

export default function LeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDemo = async () => {
    setIsAdding(true);
    const demoData = {
      name: "Demo Customer " + Math.floor(Math.random() * 1000),
      email: `demo${Math.floor(Math.random() * 100)}@example.com`,
      phone: "03" + Math.floor(Math.random() * 100000000),
      status: "pending",
      time_label: new Date().toLocaleTimeString(),
      badge_label: "API Webhook",
      badge_color: "cyan"
    };
    await addLead(demoData);
    setIsAdding(false);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Leads</h1>
        <div className="flex gap-3">
          <button 
            onClick={handleAddDemo}
            disabled={isAdding}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {isAdding ? "Adding..." : "+ Add Demo"}
          </button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex gap-3">
          <SelectBox label="All Status" />
          <SelectBox label="All Sources" />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === "kanban" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
              title="Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === "table" ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          <button className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors border-l pl-4 border-slate-200">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {viewMode === "kanban" ? (
          <KanbanView leads={initialLeads} />
        ) : (
          <TableView leads={initialLeads} />
        )}
      </div>
    </div>
  );
}

// Kanban View Component
function KanbanView({ leads }: { leads: Lead[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-w-[1000px] h-full">
      {statuses.map((status) => {
        const columnLeads = leads.filter((lead) => lead.status === status.id);
        return (
          <div key={status.id} className="flex flex-col gap-4 h-full">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${status.dot}`}></span>
                <span className="font-semibold text-slate-700 text-sm">{status.label}</span>
              </div>
              <span className="text-xs font-semibold text-slate-400">{columnLeads.length} Leads</span>
            </div>

            {/* Cards Container */}
            <div className="flex flex-col gap-4 overflow-y-auto pb-4 pr-1 snap-y snap-mandatory min-h-20">
              {columnLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
              {columnLeads.length === 0 && (
                <div className="text-center text-sm text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-xl">
                  No leads
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Table View Component
function TableView({ leads }: { leads: Lead[] }) {
  const getBadgeColors = (color: string | null) => {
    switch (color) {
      case "orange": return "bg-orange-50 text-orange-600 border-orange-100/50";
      case "blue": return "bg-blue-50 text-blue-500 border-blue-100/50";
      case "cyan": return "bg-cyan-50 text-cyan-600 border-cyan-100/50";
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const getStatusLabel = (sId: string) => statuses.find(s => s.id === sId)?.label || sId;
  const getStatusDot = (sId: string) => statuses.find(s => s.id === sId)?.dot || "bg-slate-300";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
          <tr>
            <th className="px-6 py-4">Lead Info</th>
            <th className="px-6 py-4">Contact</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Time Added</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {leads.map((lead) => (
            <TableRow key={lead.id} lead={lead} getBadgeColors={getBadgeColors} getStatusLabel={getStatusLabel} getStatusDot={getStatusDot} />
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={5} className="py-12 text-center text-slate-500">No leads found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Table Row Component with internal interaction state
function TableRow({ lead, getBadgeColors, getStatusLabel, getStatusDot }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this lead?")) {
      setIsDeleting(true);
      await deleteLead(lead.id);
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    await updateLeadStatus(lead.id, newStatus);
    setIsUpdating(false);
    setIsOpen(false);
  };

  return (
    <tr className={`hover:bg-slate-50 transition-colors group ${isDeleting || isUpdating ? "opacity-50" : ""}`}>
      <td className="px-6 py-4">
        <div className="flex gap-3 items-center">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=random`} alt={lead.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-bold text-slate-800">{lead.name}</div>
            {lead.badge_label && (
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${getBadgeColors(lead.badge_color)}`}>
                {lead.badge_label}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-slate-600 mb-1 flex items-center gap-1.5"><span className="text-slate-400">📞</span> {lead.phone || "-"}</div>
        <div className="text-slate-500 text-xs flex items-center gap-1.5"><span className="text-slate-400">✉️</span> {lead.email || "-"}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusDot(lead.status)}`}></span>
          <span className="font-medium text-slate-700">{getStatusLabel(lead.status)}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-500">
        {new Date(lead.created_at).toLocaleDateString()} <br/>
        <span className="text-xs text-slate-400">{lead.time_label}</span>
      </td>
      <td className="px-6 py-4 text-right relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors inline-block"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute top-10 right-8 bg-white border border-slate-100 shadow-xl rounded-xl z-50 py-2 w-48 text-sm font-medium animate-in fade-in zoom-in-95 text-left">
            <div className="px-3 py-1.5 text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">
              Change Status
            </div>
            {statuses.map((s) => (
              <button 
                key={s.id} 
                onClick={() => handleUpdateStatus(s.id)}
                disabled={lead.status === s.id}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center justify-between disabled:opacity-50"
              >
                {s.label}
                {lead.status === s.id && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            ))}
            <div className="h-px bg-slate-100 my-1"></div>
            <button 
              onClick={handleDelete}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Lead
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// Select Box Component
function SelectBox({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium tracking-tight shadow-sm">
      {label}
      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
