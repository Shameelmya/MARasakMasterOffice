import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, LayoutGrid, LayoutList, CheckSquare, Eye, Send, Printer, 
  Download, Trash2, Activity, UserX, Lock, Phone, MessageSquare, ExternalLink,
  FileEdit, MapPin, Clock, CheckCircle2
} from 'lucide-react';
import { Task, User, GlobalFilters } from '../../types';
import { AttachmentRenderer } from '../Shared/AttachmentRenderer';
import { useFilteredTasks } from '../../hooks/useFilteredTasks';
import { formatDate, formatTime, generateUid, getNow, formatWhatsAppNumber } from '../../utils/formatters';

interface AdminGlobalViewProps {
  currentUser: User;
  tasks: Task[];
  globalFilters: GlobalFilters;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => void;
  users: User[];
  triggerPrint: (task: Task) => void;
  triggerDetailsPrint: (task: Task) => void;
  triggerViewDetails: (task: Task) => void;
  triggerDownloadPDF: (task: Task) => void;
  triggerDetailsDownload: (task: Task) => void;
  categories: string[];
  initialSearch?: string;
  initialOfficerFilter?: string;
  triggerConfirm: (
    title: string,
    message: string,
    onConfirm: (val: string) => void,
    isDanger?: boolean,
    confirmText?: string,
    showInput?: boolean,
    inputPlaceholder?: string
  ) => void;
}

export function AdminGlobalView({
  currentUser,
  tasks,
  globalFilters,
  updateTask,
  deleteTask,
  users,
  triggerPrint,
  triggerDetailsPrint,
  triggerViewDetails,
  triggerDownloadPDF,
  triggerDetailsDownload,
  categories,
  initialSearch,
  initialOfficerFilter,
  triggerConfirm
}: AdminGlobalViewProps) {
  const [search, setSearch] = useState('');
  
  const waPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWAPress = () => {
    if (waPressTimer.current) {
      clearTimeout(waPressTimer.current);
      waPressTimer.current = null;
    }
  };
  const [catFilter, setCatFilter] = useState('All');
  const [officerFilter, setOfficerFilter] = useState(initialOfficerFilter || 'All');
  const [visibleCount, setVisibleCount] = useState(50);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); 

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (initialOfficerFilter) setOfficerFilter(initialOfficerFilter);
  }, [initialOfficerFilter]);

  const filtered = useFilteredTasks(tasks, globalFilters, search, catFilter, officerFilter);
  const displayed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  
  const toggleUnsolved = useCallback((task: Task) => {
    const nextStatus = task.status === 'Unsolved' ? 'Pending' : 'Unsolved';
    const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'M. A. Razak Master (Admin)', text: `Task marked as ${nextStatus} directly by Admin.` };
    updateTask(task.id, { status: nextStatus, timeline: [...(task.timeline || []), ev] });
  }, [updateTask]);

  const quickCompleteTask = useCallback((task: Task) => {
    triggerConfirm(
      "Quick Complete Task", 
      `Mark task ${task.id} as fully completed for all officers? You can provide a completion note below:`, 
      (note: string) => {
        const newOffStat: Record<string, string> = { ...task.officerStatuses };
        task.assignedTo.forEach(id => {
          newOffStat[id] = 'Completed';
        });
        const evs = [];
        if (note && note.trim()) {
          evs.push({ id: generateUid(), type: 'update', time: getNow(), by: 'M. A. Razak Master (Admin)', text: `Completion Note: ${note}` });
        }
        evs.push({ id: generateUid(), type: 'completed', time: getNow(), by: 'M. A. Razak Master (Admin)', text: 'Task marked as fully completed directly by Admin.' });
        updateTask(task.id, { status: 'Completed', officerStatuses: newOffStat, timeline: [...(task.timeline || []), ...evs] });
      }, 
      false, 
      "Mark Completed", 
      true, 
      "Enter optional completion note here..."
    );
  }, [updateTask, triggerConfirm]);

  const togglePriority = useCallback((task: Task) => {
    const p = ['Low', 'Medium', 'High'];
    const nextP = p[(p.indexOf(task.priority || 'Medium') + 1) % 3];
    const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'M. A. Razak Master (Admin)', text: `Priority changed to ${nextP} directly by Admin.` };
    updateTask(task.id, { priority: nextP, timeline: [...(task.timeline || []), ev] });
  }, [updateTask]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => String(a).localeCompare(String(b)));
  }, [categories]);

  const handleSendWA = (t: Task) => {
    if (t.isSelfMode) return;
    const num = t.personalDetails?.whatsappNumber || t.personalDetails?.mobileNumber;
    const waNum = formatWhatsAppNumber(num);
    if (!waNum) {
      alert('No valid mobile number found for this citizen.');
      return;
    }
    const waMessage = `പ്രിയപ്പെട്ട ${t.personalDetails.name},\n\nതാങ്കൾ എം.എ. റസാഖ് മാസ്റ്റർ എം.എൽ.എ യുടെ ഓഫീസുമായി ബന്ധപ്പെട്ടതിന് നന്ദി. നിങ്ങളുടെ അപേക്ഷ/പരാതി ഔദ്യോഗികമായി രേഖപ്പെടുത്തിയിട്ടുണ്ട്.\n\n*വിഷയം:* ${t.subject}\n*റഫറൻസ് ഐഡി:* ${t.id}\n\n\nസ്നേഹത്തോടെ,\nഎം.എൽ.എ ഓഫീസ്, കുന്ദമംഗലം.ഫോൺ: 9037032002`;
    const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'System', text: 'Auto-Acknowledgment sent via WhatsApp.' };
    updateTask(t.id, { isWASent: true, timeline: [...(t.timeline || []), ev] });
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(waMessage)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-2 sm:gap-5 bg-white p-3 sm:p-5 rounded-[20px] border border-slate-200 shadow-sm justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-5 flex-1">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search entries by Subject, Name, ID, Mobile..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-[14px] sm:rounded-2xl font-medium outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" 
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {categories && (
              <select 
                value={catFilter} 
                onChange={e => setCatFilter(e.target.value)} 
                className="flex-1 px-2 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-[14px] sm:rounded-2xl font-medium outline-none bg-white focus:ring-2 focus:ring-blue-500 min-w-0 font-bold text-[10px] sm:text-sm text-slate-700"
              >
                <option value="All">All Categories</option>
                {sortedCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select 
              value={officerFilter} 
              onChange={e => setOfficerFilter(e.target.value)} 
              className="flex-1 px-2 sm:px-4 py-2 sm:py-2.5 border border-slate-300 rounded-[14px] sm:rounded-2xl font-medium outline-none bg-white focus:ring-2 focus:ring-blue-500 min-w-0 font-bold text-[10px] sm:text-sm text-slate-700"
            >
              <option value="All">All Assigned Officers</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div className="hidden md:flex bg-slate-100 p-1 rounded-2xl border border-slate-200 h-fit">
          <button 
            onClick={() => setViewMode('grid')} 
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`} 
            title="Grid View"
          >
            <LayoutGrid size={18}/>
          </button>
          <button 
            onClick={() => setViewMode('list')} 
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`} 
            title="List View"
          >
            <LayoutList size={18}/>
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar py-1">
         <div className="bg-[#EF4444] border border-red-600 rounded-[14px] sm:rounded-[20px] py-3 sm:py-4 px-4 sm:px-6 shadow-sm shrink-0 text-center flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px]">
            <span className="text-3xl sm:text-4xl font-bold text-yellow-300 leading-none mb-1">{displayed.length}</span>
            <span className="text-[8px] sm:text-xs font-bold text-white/90 uppercase tracking-widest">Total Found</span>
         </div>
         <div className="bg-white border border-slate-200 rounded-[14px] sm:rounded-[20px] py-3 sm:py-4 px-4 sm:px-6 shadow-sm shrink-0 text-center flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px]">
            <span className="text-3xl sm:text-4xl font-bold text-slate-800 leading-none mb-1">{displayed.filter(t => t.status === 'Pending').length}</span>
            <span className="text-[8px] sm:text-xs font-bold text-red-500 uppercase tracking-widest">Pending</span>
         </div>
         <div className="bg-white border border-slate-200 rounded-[14px] sm:rounded-[20px] py-3 sm:py-4 px-4 sm:px-6 shadow-sm shrink-0 text-center flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px]">
            <span className="text-3xl sm:text-4xl font-bold text-slate-800 leading-none mb-1">{displayed.filter(t => t.status === 'In Progress').length}</span>
            <span className="text-[8px] sm:text-xs font-bold text-orange-500 uppercase tracking-widest">In Progress</span>
         </div>
         <div className="bg-white border border-slate-200 rounded-[14px] sm:rounded-[20px] py-3 sm:py-4 px-4 sm:px-6 shadow-sm shrink-0 text-center flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px]">
            <span className="text-3xl sm:text-4xl font-bold text-slate-800 leading-none mb-1">{displayed.filter(t => t.status === 'Completed').length}</span>
            <span className="text-[8px] sm:text-xs font-bold text-green-500 uppercase tracking-widest">Completed</span>
         </div>
      </div>
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {displayed.map((t, i) => (
            <AdminTaskCard 
              key={`${t.id}-${i}`} 
              currentUser={currentUser}
              t={t} 
              users={users} 
              toggleUnsolved={toggleUnsolved} 
              quickCompleteTask={quickCompleteTask} 
              togglePriority={togglePriority} 
              triggerViewDetails={triggerViewDetails} 
              deleteTask={deleteTask} 
              updateTask={updateTask}
              triggerConfirm={triggerConfirm}
            />
          ))}
          {displayed.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-white rounded-[20px] border border-slate-200">
              No records found.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[20px] shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 whitespace-nowrap">
            <thead className="bg-[#F4F7FB] border-b border-slate-200 text-slate-500 uppercase text-xs tracking-widest font-bold">
              <tr>
                <th className="px-4 py-3">ID & Date</th>
                <th className="px-4 py-3">Subject & Citizen</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.map((t, idx) => (
                <tr key={`${t.id}-${idx}`} className={`hover:bg-[#F4F7FB] font-medium ${t.isSelfMode ? 'bg-yellow-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-800">{t.id}</span> 
                    {t.isSelfMode && (
                      <span className="bg-yellow-300 text-yellow-900 px-1 py-0.5 rounded text-[8px] font-bold ml-1 uppercase">
                        Self
                      </span>
                    )}
                    <br/>
                    <span className="text-xs text-slate-400">{formatDate(t.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-800 max-w-[200px] truncate block" title={t.subject}>{t.subject || '-'}</span>
                    <span className="text-xs text-slate-500">{t.personalDetails?.name || 'Unknown'} • {t.personalDetails?.mobileNumber || ''}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700">{t.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${t.status==='Completed'?'bg-green-100 text-green-700':t.status==='Partially Completed'?'bg-emerald-100 text-emerald-700':t.status==='In Progress'?'bg-amber-100 text-amber-700':t.status==='Draft'?'bg-purple-100 text-purple-700':t.status==='Unsolved'?'bg-slate-200 text-slate-500':'bg-red-100 text-red-700'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button 
                      onClick={() => {
                        updateTask(t.id, { isReadByAdmin: true });
                        triggerViewDetails(t);
                      }} 
                      title="Detailed Report" 
                      className="touch-target flex items-center justify-center text-slate-600 hover:bg-slate-200 p-2 rounded-lg transition-colors bg-slate-100"
                    >
                      <Eye size={16}/>
                    </button>
                    {!t.isSelfMode && (
                      <button 
                        onClick={() => handleSendWA(t)} 
                        onMouseDown={() => {
                          if (t.isWASent) {
                            waPressTimer.current = setTimeout(() => {
                              const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'System', text: 'WhatsApp acknowledgment status reset.' };
                              updateTask(t.id, { isWASent: false, timeline: [...(t.timeline || []), ev] });
                            }, 500);
                          }
                        }}
                        onMouseUp={clearWAPress}
                        onMouseLeave={clearWAPress}
                        onTouchStart={() => {
                          if (t.isWASent) {
                            waPressTimer.current = setTimeout(() => {
                              const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'System', text: 'WhatsApp acknowledgment status reset.' };
                              updateTask(t.id, { isWASent: false, timeline: [...(t.timeline || []), ev] });
                            }, 500);
                          }
                        }}
                        onTouchEnd={clearWAPress}
                        title={t.isWASent ? "Hold to mark Unsent" : "Send WhatsApp Acknowledgement"} 
                        className={`touch-target flex items-center justify-center p-2 rounded-lg transition-colors ${t.isWASent ? 'bg-slate-200 text-slate-400' : 'text-green-600 hover:bg-green-100 bg-green-50'}`}
                      >
                        <Send size={16}/>
                      </button>
                    )}
                    {currentUser?.role === 'admin' && t.status !== 'Completed' && t.status !== 'Unsolved' && (
                      <button 
                        onClick={() => quickCompleteTask(t)} 
                        title="Quick Complete" 
                        className="touch-target flex items-center justify-center text-purple-600 hover:bg-blue-100 p-2 rounded-lg transition-colors bg-blue-50"
                      >
                        <CheckSquare size={16}/>
                      </button>
                    )}
                    <button 
                      onClick={() => deleteTask(t.id)} 
                      title="Delete Input" 
                      className="touch-target flex items-center justify-center text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors bg-red-50"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {visibleCount < filtered.length && (
         <div className="py-4 text-center">
            <button 
              onClick={() => setVisibleCount(v => v + 50)} 
              className="px-6 py-2 bg-white border border-slate-200 hover:bg-[#F4F7FB] text-slate-700 rounded-full font-bold text-sm transition-colors shadow-sm"
            >
              Load More ({filtered.length - visibleCount} remaining)
            </button>
         </div>
      )}
    </div>
  );
}

// AdminTaskCard Component
interface AdminTaskCardProps {
  currentUser: User;
  t: Task;
  users: User[];
  toggleUnsolved: (task: Task) => void;
  quickCompleteTask: (task: Task) => void;
  togglePriority: (task: Task) => void;
  triggerViewDetails: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  triggerConfirm: (title: string, message: string, onConfirm: (val: string) => void, isDanger?: boolean, confirmText?: string) => void;
}

const AdminTaskCard = React.memo(({
  currentUser,
  t,
  users,
  toggleUnsolved,
  quickCompleteTask,
  togglePriority,
  triggerViewDetails,
  deleteTask,
  updateTask,
  triggerConfirm
}: AdminTaskCardProps) => {
  const getPriorityColor = (p?: string) => {
    if (p === 'High') return 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200';
    if (p === 'Low') return 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200';
    return 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200';
  };

  const getStatusColor = (s: string) => {
    if (s === 'Completed') return 'text-green-600';
    if (s === 'D Finished') return 'text-emerald-600';
    if (s === 'In Progress') return 'text-amber-600';
    if (s === 'Draft') return 'text-purple-600';
    return 'text-red-600';
  };

  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => {
    if (t.isReadByAdmin) {
      pressTimer.current = setTimeout(() => {
        updateTask(t.id, { isReadByAdmin: false });
      }, 3000);
    }
  };

  const clearPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const cardBg = t.isSelfMode 
    ? 'bg-yellow-50/70 border-yellow-300' 
    : t.isReadByAdmin 
      ? 'bg-white border-slate-200'
      : 'bg-[#E8F2FF] border-blue-200';

  return (
    <div 
      className={`${cardBg} rounded-[20px] p-5 border shadow-sm flex flex-col transition-all relative overflow-hidden ${t.status === 'Unsolved' ? 'border-slate-300 bg-[#F4F7FB] opacity-75 grayscale' : 'hover:shadow-md hover:border-blue-300'}`}
      onContextMenu={(e) => {
        e.preventDefault();
        if (t.isReadByAdmin) updateTask(t.id, { isReadByAdmin: false });
      }}
      onPointerDown={startPress}
      onPointerUp={clearPress}
      onPointerLeave={clearPress}
    >
      {t.status === 'Unsolved' && (
        <div className="absolute top-5 right-4 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase z-10">
          <Lock size={10} className="inline mr-1"/>Unsolved
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-wrap gap-2">
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${t.taskType === 'direct' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-50 text-blue-800'}`}>
            {t.id}
          </span>
          {t.isSelfMode && (
            <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-widest">
              Self Mode
            </span>
          )}
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end items-center gap-2 lg:gap-1">
            <div className="flex gap-3 lg:gap-1 items-center">
              {t.status !== 'Draft' && (
                <button onClick={(e) => { e.stopPropagation(); triggerConfirm('Confirm Action', 'Change status to Draft?', () => { const newOffStat = {...t.officerStatuses}; (t.assignedTo || []).forEach(id => newOffStat[id] = 'Draft'); const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'M. A. Razak Master (Admin)', text: 'Task marked as Draft directly by Admin.' }; updateTask(t.id, { status: 'Draft', officerStatuses: newOffStat, timeline: [...(t.timeline || []), ev] }); }, false, 'Yes, Change'); }} title="Mark as Draft" className="group flex items-center justify-center transition-colors">
                  <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-purple-300 text-purple-600 text-[9px] sm:text-[10px] font-bold lg:hidden group-hover:bg-purple-50">DR</span>
                  <span className="hidden lg:flex text-purple-400 group-hover:text-purple-600 group-hover:bg-purple-50 p-1 rounded"><FileEdit size={12}/></span>
                </button>
              )}
              {t.status !== 'Local Work' && (
                <button onClick={(e) => { e.stopPropagation(); triggerConfirm('Confirm Action', 'Change status to Local Work?', () => { const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'M. A. Razak Master (Admin)', text: 'Task marked as Local Work directly by Admin.' }; updateTask(t.id, { status: 'Local Work', assignedTo: [], officerStatuses: {}, timeline: [...(t.timeline || []), ev] }); }, false, 'Yes, Change'); }} title="Mark as Local Work" className="group flex items-center justify-center transition-colors">
                  <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-300 text-slate-600 text-[9px] sm:text-[10px] font-bold lg:hidden group-hover:bg-[#F4F7FB]">LW</span>
                  <span className="hidden lg:flex text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100 p-1 rounded"><MapPin size={12}/></span>
                </button>
              )}
              {t.status !== 'Pending' && (
                <button onClick={(e) => { e.stopPropagation(); triggerConfirm('Confirm Action', 'Change status to Pending?', () => { const newOffStat = {...t.officerStatuses}; (t.assignedTo || []).forEach(id => newOffStat[id] = 'Pending'); const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'M. A. Razak Master (Admin)', text: 'Task marked as Pending directly by Admin.' }; updateTask(t.id, { status: 'Pending', officerStatuses: newOffStat, timeline: [...(t.timeline || []), ev] }); }, false, 'Yes, Change'); }} title="Mark as Pending" className="group flex items-center justify-center transition-colors">
                  <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-red-300 text-red-600 text-[9px] sm:text-[10px] font-bold lg:hidden group-hover:bg-red-50">PD</span>
                  <span className="hidden lg:flex text-red-400 group-hover:text-red-600 group-hover:bg-red-50 p-1 rounded"><Clock size={12}/></span>
                </button>
              )}

              {currentUser?.role === 'admin' && t.status !== 'Completed' && t.status !== 'Unsolved' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); quickCompleteTask(t); }} 
                  title="Quick Mark as Completed" 
                  className="group flex items-center justify-center transition-colors"
                >
                  <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-green-400 text-green-600 text-[9px] sm:text-[10px] font-bold lg:hidden group-hover:bg-green-50"><CheckSquare size={14}/></span>
                  <span className="hidden lg:flex text-green-500 group-hover:text-green-700 group-hover:bg-green-50 p-1 rounded ml-0.5"><CheckSquare size={16}/></span>
                </button>
              )}
            </div>
            <div className="text-right min-w-[45px]">
              <span className="text-[10px] font-bold text-slate-400 block leading-tight">{formatDate(t.createdAt)}</span>
              <span className="text-[9px] font-semibold text-slate-400 block leading-tight">{formatTime(t.createdAt)}</span>
            </div>
          </div>
          <div className="flex gap-2 lg:gap-0.5 items-center mt-2 lg:mt-0 flex-wrap lg:flex-nowrap justify-end">
            {['None', '1W', '2W', '1M', '2M', '3M'].map(f => {
              const isSelected = t.followUpFrequency === f || (!t.followUpFrequency && f === 'None');
              return (
                <button 
                  key={f}
                  onClick={(e) => { e.stopPropagation(); triggerConfirm('Confirm Action', `Change Follow-up to ${f}?`, () => { const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'M. A. Razak Master (Admin)', text: `Follow-up frequency changed to ${f} directly by Admin.` }; updateTask(t.id, { followUpFrequency: f === 'None' ? '' : f, timeline: [...(t.timeline || []), ev] }); }, false, 'Yes, Change'); }}
                  className={`px-3 py-1.5 lg:px-1 lg:py-0.5 rounded text-[10px] lg:text-[7px] font-bold transition-colors ${isSelected ? 'text-indigo-600 bg-indigo-50 border border-indigo-200' : 'text-slate-400 hover:text-slate-600 hover:bg-[#F4F7FB] border border-transparent'}`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>

      </div>
      <div className="mb-2 border-b border-slate-100/50 pb-2 mt-1">
        <h3 className="font-bold text-slate-800 text-base leading-tight mb-1">{t.personalDetails?.name || 'Unknown'}</h3>
        {t.personalDetails?.designation && (
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{t.personalDetails.designation}</p>
        )}
        <div className="flex gap-2 mt-2">
          {!t.isSelfMode && t.personalDetails?.mobileNumber && (
            <a 
              href={`tel:${t.personalDetails.mobileNumber}`} 
              className="bg-slate-100 p-1.5 rounded-lg text-slate-600 hover:bg-blue-100 hover:text-purple-600 transition-colors"
            >
              <Phone size={14}/>
            </a>
          )}
          {t.personalDetails?.whatsappNumber && !t.isSelfMode && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleSendWA(t); }} 
              onMouseDown={(e) => {
                e.stopPropagation();
                if (t.isWASent) {
                  pressTimer.current = setTimeout(() => {
                    const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'System', text: 'WhatsApp acknowledgment status reset.' };
                    updateTask(t.id, { isWASent: false, timeline: [...(t.timeline || []), ev] });
                  }, 500);
                }
              }}
              onMouseUp={(e) => { e.stopPropagation(); clearPress(); }}
              onMouseLeave={(e) => { e.stopPropagation(); clearPress(); }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (t.isWASent) {
                  pressTimer.current = setTimeout(() => {
                    const ev = { id: generateUid(), type: 'update' as const, time: getNow(), by: 'System', text: 'WhatsApp acknowledgment status reset.' };
                    updateTask(t.id, { isWASent: false, timeline: [...(t.timeline || []), ev] });
                  }, 500);
                }
              }}
              onTouchEnd={(e) => { e.stopPropagation(); clearPress(); }}
              className={`p-1.5 rounded-lg transition-colors ${t.isWASent ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-green-600 hover:bg-green-100'}`}
              title={t.isWASent ? "Hold to mark Unsent" : "Send WA"}
            >
              <MessageSquare size={14}/>
            </button>
          )}
        </div>
      </div>
      <div className="mb-3">
        <p className="font-bold text-slate-800 text-sm line-clamp-2" title={t.subject}>{t.subject || 'No Subject'}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{t.category}</p>
      </div>
      {(t.attachment || (t.attachments && t.attachments.length > 0)) && (
        <div className="mb-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-indigo-900 truncate">
            <ExternalLink size={14} className="shrink-0 text-indigo-600" />
            <span className="text-xs font-bold truncate" title={t.attachments && t.attachments.length > 0 ? `${t.attachments.length} Attached Docs` : t.attachment?.name}>
              {t.attachments && t.attachments.length > 0 ? `${t.attachments.length} Attached Docs` : t.attachment?.name}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {t.attachment && (
              <AttachmentRenderer 
                attachment={t.attachment as any} 
                currentUser={currentUser}
                index={0}
              />
            )}
            {t.attachments?.map((att, idx) => (
              <AttachmentRenderer 
                key={idx}
                attachment={att}
                currentUser={currentUser}
                index={t.attachment ? idx + 1 : idx}
                onDeleteSuccess={() => {
                  if (t.attachments) {
                    const newAtts = t.attachments.filter((_, i) => i !== idx);
                    updateTask(t.id, { attachments: newAtts });
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div className={`mb-4 ${t.isSelfMode ? 'bg-yellow-105/50' : 'bg-[#F4F7FB]'} p-3 rounded-lg border border-slate-100/50 flex flex-col gap-2 mt-auto`}>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Assigned:</span>
          <span className="font-bold text-slate-700 text-right truncate max-w-[120px]" title={(t.assignedTo || []).map(id => users.find(u => u.id === id)?.name || id).join(', ')}>
            {(t.assignedTo || []).map(id => users.find(u => u.id === id)?.name || id).join(', ')}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Status:</span>
          <span className={`font-bold uppercase tracking-wider ${getStatusColor(t.status)}`}>{t.status}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Priority:</span>
          <button 
            type="button" 
            onClick={() => togglePriority(t)} 
            className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${getPriorityColor(t.priority || 'Medium')}`}
          >
            {t.priority || 'Medium'}
          </button>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-100/50 flex flex-wrap gap-2">
        <button 
          onClick={() => {
            updateTask(t.id, { isReadByAdmin: true });
            triggerViewDetails(t);
          }} 
          className="flex-1 min-w-[70px] bg-slate-800 text-white font-bold py-2 rounded-2xl text-xs hover:bg-black transition-colors flex items-center justify-center gap-1"
        >
          <Eye size={14}/> Details
        </button>
        <button 
          onClick={() => deleteTask(t.id)} 
          className="px-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors" 
          title="Delete Permanent"
        >
          <Trash2 size={14}/>
        </button>
      </div>
    </div>
  );
});

AdminTaskCard.displayName = 'AdminTaskCard';
AdminGlobalView.displayName = 'AdminGlobalView';
