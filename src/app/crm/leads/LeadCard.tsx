"use client";

import { useState } from "react";
import { Phone, Mail, MoreVertical, Trash2, CheckCircle } from "lucide-react";
import { deleteLead, updateLeadStatus } from "./actions";

export default function LeadCard({ lead }: { lead: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const getBadgeColors = (color: string) => {
    switch (color) {
      case "orange":
        return "bg-orange-50 text-orange-600 border border-orange-100/50";
      case "blue":
        return "bg-blue-50 text-blue-500 border border-blue-100/50";
      case "cyan":
        return "bg-cyan-50 text-cyan-600 border border-cyan-100/50";
      default:
        return "bg-slate-50 text-slate-600 border border-slate-100";
    }
  };

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

  const statuses = [
    { id: "pending", label: "Pending" },
    { id: "processing", label: "Processing" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative ${isDeleting || isUpdating ? "opacity-50" : ""}`}>
      {/* Contact Info Header */}
      <div className="flex justify-between items-start mb-4 relative">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-sm">
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=random`} 
              alt={lead.name} 
              className="w-full h-full object-cover" 
            />
          </div>
          <div>
            <h3 className="font-bold text-[13px] text-slate-800 tracking-tight truncate max-w-[120px]" title={lead.name}>
              {lead.name}
            </h3>
            <p className="text-[11px] font-medium text-slate-400">{lead.time_label || "Unknown Time"}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-300 hover:text-slate-600 p-1 transition-all rounded-md hover:bg-slate-100"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-8 right-0 bg-white border border-slate-100 shadow-lg rounded-xl z-20 py-2 w-48 text-sm font-medium animate-in fade-in zoom-in-95">
            <div className="px-3 py-1.5 text-xs text-slate-400 uppercase tracking-wider mb-1">
              Move to Status
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
      </div>

      {/* Contact Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{lead.phone || "No phone"}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate" title={lead.email}>{lead.email || "No email"}</span>
        </div>
      </div>

      {/* Badge */}
      {lead.badge_label && (
        <div className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${getBadgeColors(lead.badge_color)}`}>
          {lead.badge_label}
        </div>
      )}
    </div>
  );
}
