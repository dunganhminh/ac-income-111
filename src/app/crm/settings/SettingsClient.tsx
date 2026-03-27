"use client";

import { useState, useEffect } from "react";
import { Link as LinkIcon, Copy, Variable, Trash2, Plus, Users, UserCog, Webhook, CheckCircle2, DollarSign, X, Pencil, Send, RefreshCw, Key, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { saveProjectAction, deleteProjectAction } from "@/app/actions/projectActions";
import { logoutAction } from "@/app/actions/roleActions";
import { createUserAction, deleteUserAction, updateUserRoleAction, changePasswordAction } from "@/app/actions/userActions";
import { saveRatesAction } from "@/app/actions/settingsActions";

export default function SettingsClient({ initialProjects, initialUsers, initialRates, currentUserId }: { initialProjects: any[], initialUsers: any[], initialRates: any, currentUserId?: string }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rates, setRates] = useState(initialRates || { vnd: 25500, aud: 1.5 });
  const [saveStatus, setSaveStatus] = useState("");
  const [isSavingRates, setIsSavingRates] = useState(false);
  
  const [usersList, setUsersList] = useState<any[]>(initialUsers);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userError, setUserError] = useState("");
  const [userFormData, setUserFormData] = useState({ username: "", password: "", full_name: "", role: "staff" });
  
  const isSuperAdmin = usersList.find(u => u.id === currentUserId)?.username === 'vutieulong';

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Toggles for Modal
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    website_url: "",
    woo_consumer_key: "",
    woo_consumer_secret: "",
    income_rule_type: "fixed_pack",
    income_percentage: 10,
    telegram_active: false,
    telegram_chat_id: "",
    income_rules: [] as {keyword: string, price: number}[]
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync Modal State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncProjectId, setSyncProjectId] = useState<string | null>(null);
  const [syncStartDate, setSyncStartDate] = useState("");
  const [syncEndDate, setSyncEndDate] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    setUsersList(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setUsersList(initialUsers);
  }, [initialUsers]);

  const handleCreateUser = async () => {
    if (!userFormData.username || !userFormData.password) {
      return setUserError("Vui lòng điền đủ Username và Password.");
    }
    setIsCreatingUser(true);
    setUserError("");
    const formData = new FormData();
    formData.append("username", userFormData.username);
    formData.append("password", userFormData.password);
    formData.append("full_name", userFormData.full_name);
    formData.append("role", userFormData.role);
    
    try {
      const res = await createUserAction(formData);
      if (res.success && res.user) {
        setUsersList([...usersList, res.user]);
        setIsUserModalOpen(false);
      } else {
        setUserError(res.error || "Tạo tài khoản thất bại.");
      }
    } catch(err:any) {
      setUserError(err.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá tài khoản ${name}?`)) return;
    const res = await deleteUserAction(id);
    if (res.success) setUsersList(usersList.filter(u => u.id !== id));
    else alert(res.error);
  };

  const handleToggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "staff" : "admin";
    const res = await updateUserRoleAction(id, newRole);
    if (res.success) {
      setUsersList(usersList.map(u => u.id === id ? { ...u, global_role: newRole } : u));
    } else {
      alert(res.error);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    setIsChangingPassword(true);
    setPasswordError("");
    try {
      const res = await changePasswordAction(currentUserId!, newPassword);
      if (res.success) {
        setPasswordSuccess(true);
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPasswordSuccess(false);
          setNewPassword("");
        }, 2000);
      } else {
        setPasswordError(res.error || "Có lỗi khi đổi mật khẩu");
      }
    } catch(err:any) {
      setPasswordError(err.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveRates = async () => {
    setIsSavingRates(true);
    const res = await saveRatesAction(rates);
    setIsSavingRates(false);
    if (res.success) {
      setSaveStatus("Đã đồng bộ lên Cloud!");
    } else {
      setSaveStatus(`Lỗi: ${res.error}`);
    }
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ 
      name: "", website_url: "", 
      woo_consumer_key: "", woo_consumer_secret: "",
      income_rule_type: "fixed_pack", income_percentage: 10, 
      telegram_active: false, telegram_chat_id: "", income_rules: []
    });
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn chuyển dự án "${name}" vào thùng rác không?`)) return;
    setIsLoading(true);
    try {
      const res = await deleteProjectAction(id);
      if (res.success) {
        setProjects(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Lỗi khi xoá CSDL: " + res.error);
      }
    } catch (err: any) {
      alert("Lỗi hệ thống (Vui lòng F5 lại trang): " + err.message);
    }
    setIsLoading(false);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setFormData({
      name: p.name || "",
      website_url: p.website_url || "",
      woo_consumer_key: p.woo_consumer_key || "",
      woo_consumer_secret: p.woo_consumer_secret || "",
      income_rule_type: p.income_rule_type || "fixed_pack",
      income_percentage: p.income_percentage || 10,
      telegram_active: p.telegram_active || false,
      telegram_chat_id: p.telegram_chat_id || "",
      income_rules: p.income_rules || []
    });
    setIsModalOpen(true);
  };

  const handleSaveProject = async () => {
    if (!formData.name) return alert("Vui lòng nhập tên dự án");
    setIsLoading(true);
    
    try {
      const result = await saveProjectAction(formData, editingId);
      if (!result.success) throw new Error(result.error);
      
      if (editingId) {
        setProjects(projects.map(p => p.id === editingId ? result.data : p));
      } else {
        setProjects([...projects, result.data]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert("Lỗi lưu dự án: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openSyncModal = (id: string) => {
    setSyncProjectId(id);
    setSyncResult(null);
    setIsSyncModalOpen(true);
  };

  const handleSyncOrders = async () => {
    if (!syncStartDate || !syncEndDate) return alert("Vui lòng chọn Từ Ngày và Đến Ngày.");
    setIsSyncing(true);
    setSyncResult("Đang khởi tạo đồng bộ...");

    let page = 1;
    let hasMore = true;
    let totalFetched = 0;
    let totalSuccess = 0;
    let totalFailed = 0;

    try {
      while (hasMore) {
        setSyncResult(`Đang đồng bộ trang ${page}... (${totalFetched} đơn đã được quét)`);
        
        const res = await fetch('/api/sync-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: syncProjectId,
            startDate: syncStartDate,
            endDate: syncEndDate,
            page: page
          })
        });
        
        if (!res.ok) {
           const errText = await res.text();
           throw new Error(`Mã lỗi trả về: ${res.status}. ${errText}`);
        }

        const data = await res.json();
        
        if (data.success) {
          totalFetched += data.summary.fetched;
          totalSuccess += data.summary.success;
          totalFailed += data.summary.failed;
          hasMore = data.hasMore;
          
          if (hasMore) {
            page++;
          }
        } else {
          throw new Error(data.error || "Lỗi không xác định từ máy chủ");
        }
      }
      
      setSyncResult(`Đã đồng bộ Xong Toàn Bộ! Kéo được tổng cộng ${totalFetched} đơn hàng. Lưu thành công: ${totalSuccess}, Lỗi: ${totalFailed}.`);

    } catch (err: any) {
       setSyncResult(`Lỗi kết nối hoặc xử lý: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 pt-16 md:p-8 md:pt-8 h-full flex flex-col overflow-y-auto">
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Cài Đặt Hệ Thống</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý kết nối WooCommerce, phân quyền và Cấu hình Project.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        
        {/* Left Column: Projects & Webhooks */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Webhook className="w-5 h-5 text-blue-600" />
                Quản lý Dự Án & Webhooks
              </h2>
              <button onClick={openAddModal} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Thêm Dự án mới
              </button>
            </div>
            
            <div className="space-y-4">
              {projects.map((p) => {
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                const webhookUrl = `${baseUrl}/api/webhooks/woocommerce/${p.id}`;
                const isPack = p.income_rule_type === 'fixed_pack' || !p.income_rule_type;
                
                return (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          {p.name}
                          {p.telegram_active && <span title="Bot Telegram Đang Bật"><Send className="w-3 h-3 text-sky-500" /></span>}
                        </div>
                        <a href={p.website_url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                          <LinkIcon className="w-3 h-3" /> {p.website_url || "Chưa có URL"}
                        </a>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <button 
                          onClick={() => openEditModal(p)}
                          className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors border border-transparent shadow-sm"
                        >
                          <Pencil className="w-3 h-3" /> Cấu hình
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors border border-transparent shadow-sm"
                          onClick={() => handleDeleteProject(p.id, p.name)}
                        >
                          <Trash2 className="w-3 h-3" /> Xóa
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                       <span className="text-[10px] bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-300">
                         Luật: {p.income_rule_type === 'zero' ? 'Dự bị ($0)' : (isPack ? 'Cố định (Pack)' : `Chiết khấu (${p.income_percentage}%)`)}
                       </span>
                       {p.telegram_active ? (
                         <span className="text-[10px] bg-sky-50 text-sky-600 border border-sky-200 px-2 py-0.5 rounded font-bold">
                           Tele Bot: Bật
                         </span>
                       ) : (
                         <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-medium">Tele: Tắt</span>
                       )}
                       {p.woo_consumer_key && (
                         <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                           <Key className="w-3 h-3"/> API: OK
                         </span>
                       )}
                    </div>

                    <div className="bg-slate-800 rounded-lg p-3 text-emerald-400 font-mono text-[11px] break-all relative group cursor-pointer" onClick={() => copyUrl(p.id, webhookUrl)}>
                      {webhookUrl}
                      <button className="absolute right-2 top-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition-colors opacity-0 group-hover:opacity-100">
                         {copiedId === p.id ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <div className="mt-3 flex justify-end">
                       <button onClick={() => openSyncModal(p.id)} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors">
                         <RefreshCw className="w-3.5 h-3.5" /> Đồng bộ Lịch sử (REST API)
                       </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left Column Projects Closed */}
        </div>

        {/* Right Column: Rate & Roles */}
        <div className="flex flex-col gap-6">
          
          {/* Tỷ giá Tiền Tệ */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Cài đặt Tỷ giá Đồng tiền
            </h2>
            <p className="text-xs text-slate-500 mb-4">Tỷ giá gốc cấu hình Webhook là USD. Nếu bạn điền tỷ giá, Dashboard sẽ auto hiển thị sang VND/AUD.</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">1 USD = ? VNĐ</label>
                <input 
                  type="number" 
                  value={rates.vnd} 
                  onChange={e => setRates({...rates, vnd: Number(e.target.value)})}
                  className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-bold focus:outline-none focus:ring-2 focus:ring-emerald-100" 
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">1 USD = ? AUD</label>
                <input 
                  type="number" 
                  value={rates.aud}
                  step="0.01" 
                  onChange={e => setRates({...rates, aud: Number(e.target.value)})}
                  className="w-32 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-bold focus:outline-none focus:ring-2 focus:ring-emerald-100" 
                />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <label className="text-sm font-black text-emerald-700">1 AUD = ? VNĐ</label>
                <input 
                  type="number" 
                  value={rates.aud_vnd || Math.round(rates.vnd / (rates.aud || 1))}
                  onChange={e => setRates({...rates, aud_vnd: Number(e.target.value)})}
                  className="w-32 px-3 py-1.5 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-lg text-sm text-right font-black focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner" 
                />
              </div>
            </div>
            
            <div className="mt-5 flex justify-end items-center gap-3 border-t border-slate-100 pt-4">
              {saveStatus && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{saveStatus}</span>}
              <button 
                onClick={handleSaveRates}
                disabled={isSavingRates}
                className="text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                {isSavingRates ? "Đang đồng bộ..." : "Lưu Tỷ Giá"}
              </button>
            </div>
          </div>

          {/* Tài khoản & Cá nhân */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <UserCog className="w-5 h-5 text-indigo-600" />
              Tài Khoản (Account)
            </h2>
            
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border border-slate-200 shadow-sm">
                <img src="https://ui-avatars.com/api/?name=User&background=random" alt="Avatar" />
              </div>
              <div>
                <div className="font-bold text-slate-800">Tài khoản Quản Trị</div>
                <div className="text-xs text-slate-500">Phiên làm việc đang hoạt động</div>
              </div>
            </div>
            
            <div className="flex gap-3 border-t border-slate-100 pt-4">
              <button onClick={() => setIsPasswordModalOpen(true)} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 py-2.5 rounded-lg transition-colors shadow-sm">
                <Key className="w-4 h-4" />
                Đổi Mật Khẩu
              </button>
              <form action={async () => {
                await logoutAction();
              }} className="w-full">
                <button type="submit" className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 py-2.5 rounded-lg transition-colors shadow-sm">
                  <LogOut className="w-4 h-4" />
                  Đăng Xuất
                </button>
              </form>
            </div>
          </div>

          {/* Quản Trị Viên & Nhân Sự */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-600"></div>
            
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Quản Trị Viên & Nhân Sự
              </h2>
              <button 
                onClick={() => {
                  setUserFormData({ username: "", password: "", full_name: "", role: "staff" });
                  setUserError("");
                  setIsUserModalOpen(true);
                }} 
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Nhân sự
              </button>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nhân sự</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3 text-right">Tùy chọn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs uppercase">
                            {u.full_name?.charAt(0) || u.email?.charAt(0) || u.username?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-700">{u.full_name || u.username || "Unknown"}</div>
                            <div className="text-[11px] text-slate-500">{u.username ? `@${u.username}` : (u.email || "No details")}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isSuperAdmin ? (
                          <button onClick={() => handleToggleRole(u.id, u.global_role)} className="focus:outline-none" title="Nhấp để đổi quyền">
                            {u.global_role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 transition-colors">
                                 <UserCog className="w-3 h-3" /> Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors">
                                 Staff
                              </span>
                            )}
                          </button>
                        ) : (
                          <span>
                            {u.global_role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 cursor-default opacity-80">
                                 <UserCog className="w-3 h-3" /> Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 cursor-default opacity-80">
                                 Staff
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteUser(u.id, u.username || u.email || "N/A")} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Xóa tài khoản">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-700 leading-relaxed">
               <strong>Lưu ý:</strong> Nhân sự (Staff) sẽ bị khóa quyền xem Tab Analytics, Expenses, Settings và không thể xem số tiền Tịnh (Net) ở danh sách Orders.
            </div>

          </div>
        </div>
      </div>

      {/* --- MODAL THÊM USER --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserCog className="w-5 h-5 text-purple-600"/> Thêm Tài Khoản Mới</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tên Đăng Nhập (Username)</label>
                <input 
                  type="text" 
                  value={userFormData.username}
                  onChange={e => setUserFormData({...userFormData, username: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-purple-500" 
                  placeholder="Ví dụ: nhanvien1"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mật khẩu</label>
                <input 
                  type="password" 
                  value={userFormData.password}
                  onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-purple-500" 
                  placeholder="Nhập mật khẩu an toàn"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tên Hiển Thị (Không Bắt Buộc)</label>
                <input 
                  type="text" 
                  value={userFormData.full_name}
                  onChange={e => setUserFormData({...userFormData, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-purple-500" 
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Vai Trò</label>
                <div className="flex items-center gap-3 mt-1">
                   <label className="flex items-center gap-2 text-sm cursor-pointer">
                     <input type="radio" checked={userFormData.role === 'staff'} onChange={() => setUserFormData({...userFormData, role: 'staff'})} />
                     Nhân viên (Staff)
                   </label>
                   <label className="flex items-center gap-2 text-sm cursor-pointer">
                     <input type="radio" checked={userFormData.role === 'admin'} onChange={() => setUserFormData({...userFormData, role: 'admin'})} />
                     Quản trị (Admin)
                   </label>
                </div>
              </div>

              {userError && (
                <div className="p-2 text-xs text-red-600 bg-red-50 rounded-lg border border-red-100 font-semibold mt-1">{userError}</div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
              <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
              <button 
                onClick={handleCreateUser} 
                disabled={isCreatingUser} 
                className="px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
               >
                 {isCreatingUser ? "Đang tạo..." : "Tạo Tài Khoản"}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL QUẢN LÝ DỰ ÁN --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editingId ? "Cập Nhật Dự Án" : "Thêm Dự Án Mới"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto max-h-[70vh] flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Tên Dự án / Store</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ví dụ: My Droshipping Store"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-blue-500" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Website URL</label>
                  <input 
                    type="url" 
                    value={formData.website_url}
                    onChange={e => setFormData({...formData, website_url: e.target.value})}
                    placeholder="https://test.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-blue-500" 
                  />
                </div>
              </div>

              {/* API Keys WooCommerce */}
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span className="block text-xs font-bold text-indigo-800 uppercase">WooCommerce REST API Keys</span>
                </div>
                <p className="text-[10px] text-indigo-600/80 leading-snug">
                  Chỉ cần thiết nếu bạn muốn Đồng bộ đơn hàng Lịch sử tự động.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Consumer Key (CK)</label>
                    <input 
                      type="text" 
                      value={formData.woo_consumer_key}
                      onChange={e => setFormData({...formData, woo_consumer_key: e.target.value})}
                      placeholder="ck_..."
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-[2px] focus:outline-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Consumer Secret (CS)</label>
                    <input 
                      type="password" 
                      value={formData.woo_consumer_secret}
                      onChange={e => setFormData({...formData, woo_consumer_secret: e.target.value})}
                      placeholder="cs_..."
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-[2px] focus:outline-indigo-500" 
                    />
                  </div>
                </div>
              </div>

              {/* Income Rule */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col gap-3">
                <span className="block text-xs font-bold text-slate-700 uppercase">Luật tính Income cho Webhook</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="rule_type" 
                      checked={formData.income_rule_type === 'fixed_pack'} 
                      onChange={() => setFormData({...formData, income_rule_type: 'fixed_pack'})}
                    /> 
                    Giá cố định (Khớp tên Pack)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="rule_type" 
                      checked={formData.income_rule_type === 'percentage'} 
                      onChange={() => setFormData({...formData, income_rule_type: 'percentage'})}
                    /> 
                    Tỉ lệ phần trăm
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                    <input 
                      type="radio" 
                      name="rule_type" 
                      checked={formData.income_rule_type === 'zero'} 
                      onChange={() => setFormData({...formData, income_rule_type: 'zero'})}
                    /> 
                    Dự án dự bị (Income = $0)
                  </label>
                </div>
                {formData.income_rule_type === 'percentage' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Cắt bao nhiêu % giá trị đơn?</label>
                    <div className="relative w-32">
                      <input 
                        type="number" 
                        value={formData.income_percentage}
                        onChange={e => setFormData({...formData, income_percentage: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-blue-500" 
                      />
                      <span className="absolute right-3 top-2.5 text-sm text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                )}
                {formData.income_rule_type === 'fixed_pack' && (
                  <div className="mt-1 bg-white border border-slate-200 rounded-lg p-3">
                     <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded border border-blue-100 leading-relaxed font-medium">
                       <strong>Cơ chế tính mặc định hệ thống:</strong>
                       <ul className="list-disc pl-4 mt-1 space-y-0.5 opacity-90">
                         <li>Sản phẩm có tên VD <em>"Pack 5"</em> ➔ Income = 5 x 5$ = <strong>$25</strong></li>
                         <li>Sản phẩm có tên VD <em>"Pack 10"</em> ➔ Income = 10 x 5$ = <strong>$50</strong></li>
                         <li>Sản phẩm <em>không</em> chứa từ khóa Pack ➔ Mặc định = <strong>$5</strong> / 1 SP</li>
                       </ul>
                     </div>
                  </div>
                )}
              </div>

              {/* Telegram */}
              <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-sky-600" />
                    <span className="block text-xs font-bold text-slate-700 uppercase">Bot Telegram Khi Nhảy Đơn Mới</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.telegram_active} onChange={e => setFormData({...formData, telegram_active: e.target.checked})} />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                {formData.telegram_active && (
                  <div className="mt-2 text-sm animate-in fade-in slide-in-from-top-1">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Telegram Chat ID</label>
                    <input 
                      type="text" 
                      value={formData.telegram_chat_id}
                      onChange={e => setFormData({...formData, telegram_chat_id: e.target.value})}
                      placeholder="VD: -10012345678"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-sky-500" 
                    />
                  </div>
                )}
              </div>

            </div>
            
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Hủy bỏ</button>
              <button onClick={handleSaveProject} disabled={isLoading} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                {isLoading ? "Đang lưu..." : "Lưu Dự Án"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL SYNC ORDERS --- */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="flex items-center gap-3 p-5 border-b border-indigo-100 bg-indigo-50">
              <RefreshCw className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-indigo-900">Đồng bộ Đơn hàng Lịch sử</h3>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <p className="text-xs text-slate-500 leading-snug mb-2">
                Quá trình này sẽ rút danh sách Order từ WooCommerce thông qua REST API và xử lý lại dữ liệu hệt như Webhook.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Từ ngày (Start Date)</label>
                <input 
                  type="date" 
                  value={syncStartDate}
                  onChange={e => setSyncStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-indigo-500" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Đến ngày (End Date)</label>
                <input 
                  type="date" 
                  value={syncEndDate}
                  onChange={e => setSyncEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-indigo-500" 
                />
              </div>

              {syncResult && (
                <div className={`mt-2 p-3 text-xs rounded-lg border ${syncResult.includes('Lỗi') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                  {syncResult}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
              <button 
                onClick={() => setIsSyncModalOpen(false)} 
                disabled={isSyncing} 
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
               >
                 Đóng
               </button>
              <button 
                onClick={handleSyncOrders} 
                disabled={isSyncing || (!syncStartDate || !syncEndDate)} 
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {isSyncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Đang chạy...</> : "Bắt đầu Sync"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ĐỔI MẬT KHẨU --- */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Key className="w-5 h-5 text-teal-600"/> Đổi Mật Khẩu</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-[2px] focus:outline-teal-500" 
                  placeholder="Nhập tối thiểu 6 ký tự"
                />
              </div>
              
              {passwordError && (
                <div className="p-2 text-xs text-red-600 bg-red-50 rounded-lg border border-red-100 font-semibold">{passwordError}</div>
              )}
              {passwordSuccess && (
                <div className="p-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4"/> Đổi mật khẩu thành công!
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
              <button onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
              <button 
                onClick={handleChangePassword} 
                disabled={isChangingPassword || passwordSuccess} 
                className="px-5 py-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
               >
                 {isChangingPassword ? "Đang xử lý..." : "Xác nhận đổi"}
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
