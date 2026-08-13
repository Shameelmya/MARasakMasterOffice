import React, { useState, useMemo } from 'react';
import { Search, Download, Calendar, User as UserIcon, FileText, CheckCircle, FileEdit, Zap, Database, MessageSquare } from 'lucide-react';
import { Task, User, TimelineItem } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';
import { WhatsAppButton } from '../Shared/WhatsAppButton';

interface RecentUpdationsTabProps {
  tasks: Task[];
  users: User[];
  triggerRecentUpdationsDownload: (config: any) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

interface FlattenedUpdation {
  taskId: string;
  taskSubject: string;
  personName: string;
  mobileNumber: string;
  assignedToIds: string[];
  assignedToNames: string;
  updation: TimelineItem;
  taskCreatedAt: string;
  isSelfMode: boolean;
}

export function RecentUpdationsTab({ tasks, users, triggerRecentUpdationsDownload, updateTask }: RecentUpdationsTabProps) {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('3days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [officerFilter, setOfficerFilter] = useState('All');
  const [msgFilter, setMsgFilter] = useState('All');

  const flattenedUpdations = useMemo(() => {
    const arr: FlattenedUpdation[] = [];
    tasks.forEach(t => {
      // Only care about 'update', 'completed', 'draft' events
      const updates = (t.timeline || []).filter(e => ['update', 'completed', 'draft'].includes(e.type));
      updates.forEach(u => {
        arr.push({
          taskId: t.id,
          taskSubject: t.subject || 'No Subject',
          personName: t.personalDetails.name,
          mobileNumber: t.personalDetails.mobileNumber,
          assignedToIds: t.assignedTo,
          assignedToNames: t.assignedTo.map(id => users.find(user => user.id === id)?.name || id).join(', '),
          updation: u,
          taskCreatedAt: t.createdAt,
          isSelfMode: !!t.isSelfMode
        });
      });
    });
    // Sort by updation time descending (newest first)
    return arr.sort((a, b) => new Date(b.updation.time).getTime() - new Date(a.updation.time).getTime());
  }, [tasks, users]);

  const filteredUpdations = useMemo(() => {
    let result = flattenedUpdations;

    // Filter by Date
    if (dateRange === 'custom') {
      if (customStart) {
        const start = new Date(customStart);
        start.setHours(0,0,0,0);
        result = result.filter(u => new Date(u.updation.time) >= start);
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23,59,59,999);
        result = result.filter(u => new Date(u.updation.time) <= end);
      }
    } else if (dateRange !== 'all') {
      const cutoff = new Date();
      if (dateRange === '3days') cutoff.setDate(cutoff.getDate() - 3);
      else if (dateRange === '7days') cutoff.setDate(cutoff.getDate() - 7);
      else if (dateRange === '1month') cutoff.setMonth(cutoff.getMonth() - 1);
      else if (dateRange === '1year') cutoff.setFullYear(cutoff.getFullYear() - 1);
      
      result = result.filter(u => new Date(u.updation.time) >= cutoff);
    }

    // Filter by Officer
    if (officerFilter !== 'All') {
      result = result.filter(u => u.assignedToIds.includes(officerFilter));
    }

    // Search text
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(u => 
        u.taskId.toLowerCase().includes(s) ||
        u.taskSubject.toLowerCase().includes(s) ||
        u.personName.toLowerCase().includes(s) ||
        u.updation.text.toLowerCase().includes(s)
      );
    }

    if (msgFilter === 'Sent') {
      result = result.filter(u => u.updation.whatsappSent === true);
    } else if (msgFilter === 'Not Sent') {
      result = result.filter(u => !u.updation.whatsappSent);
    }

    return result;
  }, [flattenedUpdations, dateRange, customStart, customEnd, officerFilter, search, msgFilter]);

  const handleSendWA = (u: FlattenedUpdation) => {
    if (u.isSelfMode) return;
    const task = tasks.find(t => t.id === u.taskId);
    if (!task) return;

    let num = u.mobileNumber;
    if (num.startsWith('+91')) num = num.substring(3);
    else if (num.startsWith('91') && num.length === 12) num = num.substring(2);
    const waNum = `91${num.replace(/\D/g, '')}`;

    const waMessage = `പ്രിയപ്പെട്ട ${u.personName},\n\nതാങ്കൾ നൽകിയ അപേക്ഷ/പരാതിയിലെ പുതിയ വിവരങ്ങൾ താഴെ നൽകുന്നു:\n\n*വിഷയം:* ${u.taskSubject}\n*റഫറൻസ് ഐഡി:* ${u.taskId}\n*അപ്ഡേറ്റ്:* ${u.updation.text}\n\nസ്നേഹത്തോടെ,\nഎം.എൽ.എ ഓഫീസ്, താനൂർ.ഫോൺ: 9037032002`;
    
    // Open WA
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(waMessage)}`, '_blank');
    
    // Update timeline to mark this specific updation as whatsappSent = true
    const updatedTimeline = task.timeline.map(item => 
      item.id === u.updation.id ? { ...item, whatsappSent: true } : item
    );
    updateTask(task.id, { timeline: updatedTimeline });
  };

  const handleResetWA = (u: FlattenedUpdation) => {
    const task = tasks.find(t => t.id === u.taskId);
    if (!task) return;
    const updatedTimeline = task.timeline.map(item => 
      item.id === u.updation.id ? { ...item, whatsappSent: false } : item
    );
    updateTask(task.id, { timeline: updatedTimeline });
  };

  const handleDownloadPDF = () => {
    // We pass the currently filtered array to a dedicated print layout
    triggerRecentUpdationsDownload({
      dateRange,
      customStartDate: customStart,
      customEndDate: customEnd,
      officer: officerFilter,
      flattenedData: filteredUpdations
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-5 items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Zap className="text-amber-500" /> Recent Updations</h2>
          <p className="text-xs font-bold text-slate-500 mt-1">Timeline updates compiled across all tasks for easy follow-up.</p>
        </div>
        <button 
          onClick={handleDownloadPDF} 
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          <Download size={18}/> Export PDF
        </button>
      </div>

      <div className="bg-[#F4F7FB] p-3 sm:p-5 rounded-[16px] sm:rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-2 sm:gap-4 items-center">
        
        {/* Search */}
        <div className="relative w-full md:flex-1 md:min-w-[120px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-[10px] sm:rounded-lg text-xs sm:text-sm font-bold text-slate-700 outline-none focus:border-amber-500 transition-all"
          />
        </div>
        
        <div className="flex flex-row w-full md:w-auto gap-2 sm:gap-4 justify-between overflow-x-auto hide-scrollbar">
          {/* Date Filter */}
          <div className="relative shrink-0 flex-1 md:flex-none flex items-center bg-white border border-slate-200 rounded-[10px] sm:rounded-lg focus-within:border-amber-500 overflow-hidden">
            <div className="pl-2 sm:pl-3 pr-1 py-1.5 sm:py-2 text-slate-500 pointer-events-none hidden sm:block">
              <Calendar size={16} />
            </div>
            <select 
              value={dateRange} 
              onChange={e => setDateRange(e.target.value)} 
              className="w-full bg-transparent pl-2 sm:pl-1 pr-2 sm:pr-3 py-1.5 sm:py-2 font-bold text-[10px] sm:text-xs text-slate-700 outline-none cursor-pointer appearance-none text-center"
              title="Period"
            >
              <option value="3days">3 Days</option>
              <option value="7days">Week</option>
              <option value="1month">Month</option>
              <option value="1year">Year</option>
              <option value="custom">Custom</option>
              <option value="all">All</option>
            </select>
          </div>

          {/* Officer Filter */}
          <div className="relative shrink-0 flex-1 md:flex-none flex items-center bg-white border border-slate-200 rounded-[10px] sm:rounded-lg focus-within:border-amber-500 overflow-hidden">
            <div className="pl-2 sm:pl-3 pr-1 py-1.5 sm:py-2 text-slate-500 pointer-events-none hidden sm:block">
              <UserIcon size={16} />
            </div>
            <select 
              value={officerFilter}
              onChange={e => setOfficerFilter(e.target.value)}
              className="w-full bg-transparent pl-2 sm:pl-1 pr-2 sm:pr-3 py-1.5 sm:py-2 font-bold text-[10px] sm:text-xs text-slate-700 outline-none cursor-pointer appearance-none text-center"
              title="Officer"
            >
              <option value="All">All Officers</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Msg Filter */}
          <div className="relative shrink-0 flex-1 md:flex-none flex items-center bg-white border border-slate-200 rounded-[10px] sm:rounded-lg focus-within:border-amber-500 overflow-hidden">
            <div className="pl-2 sm:pl-3 pr-1 py-1.5 sm:py-2 text-slate-500 pointer-events-none hidden sm:block">
              <MessageSquare size={16} />
            </div>
            <select 
              value={msgFilter}
              onChange={e => setMsgFilter(e.target.value)}
              className="w-full bg-transparent pl-2 sm:pl-1 pr-2 sm:pr-3 py-1.5 sm:py-2 font-bold text-[10px] sm:text-xs text-slate-700 outline-none cursor-pointer appearance-none text-center"
              title="Messages"
            >
              <option value="All">All Messages</option>
              <option value="Sent">Message Sent</option>
              <option value="Not Sent">Message Not Sent</option>
            </select>
          </div>
        </div>
      </div>

      {dateRange === 'custom' && (
        <div className="flex items-center gap-2 bg-[#F4F7FB] border border-slate-200 rounded-[10px] sm:rounded-lg px-3 py-2 w-full max-w-sm">
          <input 
            type="date" 
            value={customStart} 
            onChange={e => setCustomStart(e.target.value)} 
            className="text-xs font-bold text-slate-700 outline-none bg-transparent flex-1" 
          />
          <span className="text-[10px] font-bold text-slate-400">to</span>
          <input 
            type="date" 
            value={customEnd} 
            onChange={e => setCustomEnd(e.target.value)} 
            className="text-xs font-bold text-slate-700 outline-none bg-transparent flex-1" 
          />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-2">
          {filteredUpdations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-2">
              {filteredUpdations.map((item, idx) => (
                <div key={`${item.taskId}-${item.updation.id}-${idx}`} className="border border-slate-200 rounded-2xl p-5 bg-[#F4F7FB] hover:border-amber-300 hover:shadow-md transition-all group flex flex-col h-full">
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded tracking-widest uppercase">{item.taskId}</span>
                      <span className="text-[10px] font-bold text-slate-500 leading-tight">{item.taskSubject}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-slate-800">{formatDate(item.updation.time)}</span>
                      <span className="block text-[9px] font-bold text-slate-400">{formatTime(item.updation.time)}</span>
                    </div>
                  </div>

                  <div className="flex-1 bg-white border border-slate-100 rounded-lg p-3 my-2 text-sm font-semibold text-slate-800 shadow-sm relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-lg"></div>
                    <div className="flex gap-2">
                      {item.updation.type === 'update' && <FileEdit size={14} className="text-purple-500 mt-0.5 shrink-0" />}
                      {item.updation.type === 'completed' && <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />}
                      {item.updation.type === 'draft' && <FileText size={14} className="text-purple-500 mt-0.5 shrink-0" />}
                      <span className="leading-snug">{item.updation.text}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-auto pt-2">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-800">{item.personName}</span>
                      <span className="block text-[9px] font-bold text-slate-500 uppercase mt-0.5"><span className="text-slate-400 font-medium lowercase">by</span> {item.updation.by} <span className="text-slate-400 font-medium lowercase">for</span> {item.assignedToNames || 'None'}</span>
                    </div>
                    
                    {!item.isSelfMode && (
                      <WhatsAppButton 
                        onSend={() => handleSendWA(item)}
                        isSent={!!item.updation.whatsappSent}
                        onReset={() => handleResetWA(item)}
                        className="p-2 rounded-2xl shadow-sm border border-slate-200"
                        iconSize={16}
                      />
                    )}
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center">
              <Database size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-[11px] text-lg">No recent updations found.</p>
              <p className="text-slate-400 font-medium text-sm mt-1">Try expanding your date range or removing filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
