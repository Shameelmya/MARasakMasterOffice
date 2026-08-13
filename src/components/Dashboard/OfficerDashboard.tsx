import React, { useState, useMemo } from 'react';
import { 
  Activity, Database, Plus, Bell, Eye, AlertCircle, Ban, 
  Trash2, EyeOff, FileText, ArrowRight, Zap, FileOutput, CheckCircle, Settings, Users, Menu as MenuIcon
} from 'lucide-react';
import { Task, User, GlobalFilters } from '../../types';
import { WorkerTab } from './WorkerTab';
import { AllTasksHistoryTab } from './AllTasksHistoryTab';
import { InputFormTab } from './InputFormTab';
import { InputFormTab } from './InputFormTab';
import { RecentAlertsTab } from './RecentAlertsTab';
import { AdminGlobalView } from './AdminGlobalView';
import { RecentUpdationsTab } from './RecentUpdationsTab';
import { UpdationReportConfigModal } from '../Dialogs/ReportModals';
import { UpdationReportConfig } from '../../types';
import { formatDate } from '../../utils/formatters';

interface OfficerDashboardProps {
  user: User;
  tasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => void;
  categories: string[];
  designations: string[];
  users: User[];
  addTask: (newTask: Task) => Promise<void>;
  addCategory: (newCat: string) => Promise<void>;
  addDesignation: (newDesig: string) => Promise<void>;
  triggerPrint: (task: Task) => void;
  triggerDownloadPDF: (task: Task) => void;
  triggerDetailsPrint: (task: Task) => void;
  triggerDetailsDownload: (task: Task) => void;
  triggerViewDetails: (task: Task) => void;
  triggerUpdationDownload?: (config: UpdationReportConfig) => void;
  triggerRecentUpdationsDownload?: (config: any) => void;
  isAdminOverride: boolean;
  triggerConfirm: (
    title: string,
    message: string,
    onConfirm: (val: string) => void,
    isDanger?: boolean,
    confirmText?: string,
    showInput?: boolean,
    inputPlaceholder?: string
  ) => void;
  globalFilters: GlobalFilters;
  setGlobalFilters: React.Dispatch<React.SetStateAction<GlobalFilters>>;
  loadArchive: () => Promise<void>;
}

const StatCard = ({ title, value, color, icon, onClick }: any) => {
  const colors = {
    blue: 'bg-blue-50 text-purple-600 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <div className={`p-5 rounded-2xl border flex items-center gap-3 ${colors[color as keyof typeof colors]} hover:shadow-md transition-shadow cursor-pointer transition-all duration-300 hover:bg-slate-50`} onClick={onClick}>
      <div className={`p-2 rounded-lg bg-white/60`}>
        {icon}
      </div>
      <div>
        <h3 className="text-2xl font-bold leading-tight">{value}</h3>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-1">{title}</p>
      </div>
    </div>
  );
};

export function OfficerDashboard({
  user,
  tasks,
  updateTask,
  deleteTask,
  categories,
  designations,
  users,
  addTask,
  addCategory,
  addDesignation,
  triggerPrint,
  triggerDownloadPDF,
  triggerDetailsPrint,
  triggerDetailsDownload,
  triggerViewDetails,
  triggerUpdationDownload,
  triggerRecentUpdationsDownload,
  isAdminOverride,
  triggerConfirm,
  globalFilters,
  setGlobalFilters,
  loadArchive
}: OfficerDashboardProps) {
  // Extract permissions
  const hasDraftsPermission = user.canSeeDraftsView || user.canSeeGlobal || false;
  const hasGlobalOverviewPermission = user.canSeeGlobalOverview || user.canSeeGlobal || false;
  const hasReportsPermission = user.canSeeReports || false;
  const hasInputPermission = user.canInput || false;

  // Determine first available tab
  const initialTab = 'recent';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [globalSearch, setGlobalSearch] = useState('');
  const [updationReportModalOpen, setUpdationReportModalOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  // Handle jump/scroll to task card from Recent Alerts / Assignments
  const jumpToTask = (tab: string, taskId: string) => {
    setGlobalSearch(taskId);
    setActiveTab(tab);
  };

  // Rejected Tasks created by this inputter (officer) or assigned to them initially
  const rejectedTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'Rejected' && t.createdByUid === user.id && !t.isTrashed);
  }, [tasks, user.id]);

  const baseTasks = useMemo(() => tasks.filter(t => !t.isTrashed && t.taskType !== 'direct'), [tasks]);
  const total = baseTasks.length;
  const comp = baseTasks.filter(t => t.status === 'Completed').length;
  const draft = baseTasks.filter(t => t.status === 'Draft').length;
  const pend = baseTasks.filter(t => t.status === 'Pending').length;
  const inProg = baseTasks.filter(t => t.status === 'In Progress').length;

  const handleStatClick = (status: string) => {
    setGlobalFilters(prev => ({ ...prev, status, dateRange: 'all' }));
    setActiveTab('overview');
    setGlobalSearch('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-[120px]">
      {/* Dynamic Compact Nav/Tabs List to fit on one line */}
      <div className="hidden md:flex flex-wrap items-center gap-2 bg-white p-2 rounded-[20px] shadow-sm border border-slate-200 w-full print-hidden">
        <button 
          onClick={() => { setActiveTab('recent'); setGlobalSearch(''); }} 
          className={`flex-1 px-2 py-2 md:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'recent' ? 'bg-[#EF4444] text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          <Bell size={15} /> Recent Assignments
        </button>
        <button 
          onClick={() => { setActiveTab('worker'); setGlobalSearch(''); }} 
          className={`flex-1 px-2 py-2 md:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'worker' ? 'bg-[#4F46E5] text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          My Assigned Works
        </button>
        <button 
          onClick={() => { setActiveTab('direct_worker'); setGlobalSearch(''); }} 
          className={`flex-1 px-2 py-2 md:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'direct_worker' ? 'bg-[#6366F1] text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          <Zap size={15} /> Assignments from MLA
        </button>
        {hasGlobalOverviewPermission && (
          <button 
            onClick={() => { setActiveTab('overview'); setGlobalSearch(''); }} 
          className={`flex-1 px-2 py-2 md:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'overview' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
          >
            <Eye size={15} /> Global Overview
          </button>
        )}
        {user.canSeeRecentUpdations && (
          <button 
            onClick={() => { setActiveTab('recent_updations'); setGlobalSearch(''); loadArchive(); }} 
            className={`flex-1 px-2 py-2 md:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'recent_updations' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
          >
            <Zap size={15} /> Updations
          </button>
        )}
        <button 
          onClick={() => { setActiveTab('input'); setGlobalSearch(''); }} 
          className={`flex-1 px-2 py-2 md:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'input' ? 'bg-[#2563EB] text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          Register New Input
        </button>
        <button 
          onClick={() => { setActiveTab('history'); setGlobalSearch(''); loadArchive(); }} 
          className={`flex-1 px-2 py-2 md:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === 'history' ? 'bg-slate-600 text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          History & Reports
        </button>
        {rejectedTasks.length > 0 && (
          <button 
            onClick={() => { setActiveTab('rejected'); setGlobalSearch(''); }} 
            className={`px-3 py-1.5 md:px-4 md:py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'rejected' ? 'bg-orange-600 text-white shadow' : 'text-orange-550 hover:bg-orange-50 text-orange-600 bg-orange-50/60'}`}
          >
            <Ban size={13} className="animate-pulse" /> Rejected ({rejectedTasks.length})
          </button>
        )}
      </div>

      {/* Standalone Updation Report Button for Officers without Global Overview Access */}
      {!hasGlobalOverviewPermission && user.canGenerateUpdationReport && (
        <div className="flex justify-end print-hidden -mt-2">
          <button 
            onClick={() => { setUpdationReportModalOpen(true); loadArchive(); }} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <FileOutput size={18}/> Generate Updation Report
          </button>
        </div>
      )}

      {/* 1. Recent Assignments Tab */}
      {activeTab === 'recent' && (
        <RecentAlertsTab 
          user={user} 
          tasks={tasks} 
          jumpToTask={jumpToTask} 
        />
      )}

      {/* 2. My Assigned Works Tab (taskType = input) */}
      {activeTab === 'worker' && (
        <WorkerTab 
          user={user} 
          tasks={tasks} 
          globalFilters={globalFilters} 
          updateTask={updateTask} 
          isAdminOverride={isAdminOverride} 
          taskTypeFilter="input" 
          triggerViewDetails={triggerViewDetails} 
          triggerConfirm={triggerConfirm} 
          initialSearch={globalSearch}
        />
      )}

      {/* 3. Assignments from MLA Tab (taskType = direct) */}
      {activeTab === 'direct_worker' && (
        <WorkerTab 
          user={user} 
          tasks={tasks} 
          globalFilters={globalFilters} 
          updateTask={updateTask} 
          isAdminOverride={isAdminOverride} 
          taskTypeFilter="direct" 
          triggerViewDetails={triggerViewDetails} 
          triggerConfirm={triggerConfirm} 
          initialSearch={globalSearch}
        />
      )}

      {/* Recent Updations Tab */}
      {activeTab === 'recent_updations' && user.canSeeRecentUpdations && (
        <RecentUpdationsTab 
          tasks={tasks} 
          users={users} 
          triggerRecentUpdationsDownload={triggerRecentUpdationsDownload!} 
          updateTask={updateTask} 
        />
      )}

      {/* 4. Global Overview Tab */}
      {activeTab === 'overview' && hasGlobalOverviewPermission && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Global Overview</h2>
              <p className="text-xs font-semibold text-slate-500">View and print all system-wide inputs based on permissions.</p>
            </div>
            {user.canGenerateUpdationReport && (
              <button 
                onClick={() => { setUpdationReportModalOpen(true); loadArchive(); }} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <FileOutput size={18}/> Generate Updation Report
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            <StatCard title="Total Inputs" value={total} color="blue" icon={<FileText size={24}/>} onClick={() => handleStatClick('All')}/>
            <StatCard title="Completed" value={comp} color="green" icon={<CheckCircle size={24}/>} onClick={() => handleStatClick('Completed')}/>
            <StatCard title="Pending" value={pend} color="red" icon={<Bell size={24}/>} onClick={() => handleStatClick('Pending')}/>
            <StatCard title="In Progress" value={inProg} color="indigo" icon={<Activity size={24}/>} onClick={() => handleStatClick('In Progress')}/>
            <StatCard title="Drafts" value={draft} color="purple" icon={<FileText size={24}/>} onClick={() => handleStatClick('Draft')}/>
          </div>
          <AdminGlobalView 
            currentUser={user}
            tasks={tasks.filter(t => (t.taskType || 'input') === 'input')} 
            globalFilters={globalFilters} 
            updateTask={updateTask} 
            deleteTask={deleteTask} 
            users={users} 
            triggerPrint={triggerPrint} 
            triggerDetailsPrint={triggerDetailsPrint} 
            triggerViewDetails={triggerViewDetails} 
            triggerDownloadPDF={triggerDownloadPDF} 
            triggerDetailsDownload={triggerDetailsDownload} 
            categories={categories} 
            initialSearch={globalSearch} 
            triggerConfirm={triggerConfirm} 
          />
        </div>
      )}

      {/* 5. Register New Input Tab */}
      {activeTab === 'input' && (
        <InputFormTab 
          tasks={tasks} 
          addTask={addTask} 
          categories={categories} 
          designations={designations} 
          addCategory={addCategory} 
          addDesignation={addDesignation} 
          users={users} 
          triggerPrint={triggerPrint} 
          triggerDownloadPDF={triggerDownloadPDF} 
          creator={user} 
        />
      )}

      {/* 6. History & Reports Tab */}
      {activeTab === 'history' && (
        <AllTasksHistoryTab 
          tasks={hasGlobalOverviewPermission ? tasks : tasks.filter(t => t.createdByUid === user.id)} 
          globalFilters={globalFilters} 
          categories={categories} 
          triggerPrint={triggerPrint} 
          triggerDownloadPDF={triggerDownloadPDF} 
          triggerDetailsPrint={triggerDetailsPrint} 
          triggerDetailsDownload={triggerDetailsDownload} 
          triggerViewDetails={triggerViewDetails} 
          currentUser={user} 
          updateTask={updateTask} 
          deleteTask={deleteTask} 
          users={users} 
        />
      )}

      {/* 7. Rejected Tasks Tab (for creators/inputters to reassign) */}
      {activeTab === 'rejected' && (
        <div className="space-y-6 animate-in hover:fade-in duration-200">
          <div className="bg-orange-50 border border-orange-200 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-orange-900 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-600 animate-pulse" /> Rejected Cases awaiting Reassignment
            </h2>
            <p className="text-xs font-semibold text-orange-700 mt-1">
              These tasks were rejected by assigned officers. You can click on "Edit & Reassign" underneath a card to modify the case parameters or select other officers.
            </p>
          </div>
          {rejectedTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              No rejected inputs present.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rejectedTasks.map((t) => {
                // Find rejection reason
                const lastRejection = [...t.timeline].reverse().find(tl => tl.text && (tl.text.includes('Rejected') || tl.text.includes('reverted')));
                const reason = lastRejection ? lastRejection.text : 'No specified reason.';
                return (
                  <div key={t.id} className="bg-white rounded-[24px] border border-orange-200 shadow-sm p-5 flex flex-col justify-between relative group hover:border-orange-300 hover:shadow-md transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          {t.id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatDate(t.createdAt)}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-sm mb-1 leading-snug">{t.subject}</h4>
                      <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">{t.personalDetails.name}</p>
                      <div className="mt-3 bg-red-50 border border-red-100 rounded-2xl p-3 text-xs text-red-700 font-medium font-mono whitespace-pre-wrap">
                        <span className="font-bold text-red-800 block mb-1">REJECTION REASON:</span>
                        {reason}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 w-full">
                      <button 
                        onClick={() => triggerViewDetails(t)} 
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-2xl text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        Edit & Reassign <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {updationReportModalOpen && (
        <UpdationReportConfigModal 
          onClose={() => setUpdationReportModalOpen(false)}
          onGenerate={(c) => { setUpdationReportModalOpen(false); if (triggerUpdationDownload) triggerUpdationDownload(c); }}
          users={users}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {/* Mobile Bottom Navigation */}
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-3 left-4 right-4 h-[85px] bg-gradient-to-r from-purple-800 to-[#2d1b4e] rounded-[24px] shadow-[0_8px_32px_rgba(45,27,78,0.4)] border border-white/10 z-[90] flex justify-around items-center px-1">
          <button 
            onClick={() => { setActiveTab('recent'); setGlobalSearch(''); setMobileSettingsOpen(false); }} 
            className={`flex flex-col items-center justify-center gap-1 w-[58px] transition-colors ${activeTab === 'recent' && !mobileSettingsOpen ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
          >
            <div className={`flex items-center justify-center w-[48px] h-[48px] rounded-[16px] transition-all ${activeTab === 'recent' && !mobileSettingsOpen ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-red-500' : 'bg-white/15 text-white/80'}`}>
              <Bell size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold leading-none">Recent</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('input'); setGlobalSearch(''); setMobileSettingsOpen(false); }} 
            className={`flex flex-col items-center justify-center gap-1 w-[58px] transition-colors ${activeTab === 'input' && !mobileSettingsOpen ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
          >
            <div className={`flex items-center justify-center w-[48px] h-[48px] rounded-[16px] transition-all ${activeTab === 'input' && !mobileSettingsOpen ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-purple-600' : 'bg-white/15 text-white/80'}`}>
              <Plus size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold leading-none">Input</span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('worker'); setGlobalSearch(''); setMobileSettingsOpen(false); }} 
            className={`flex flex-col items-center justify-center gap-1 w-[58px] transition-colors ${activeTab === 'worker' && !mobileSettingsOpen ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
          >
            <div className={`flex items-center justify-center w-[48px] h-[48px] rounded-[16px] transition-all ${activeTab === 'worker' && !mobileSettingsOpen ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-blue-600' : 'bg-white/15 text-white/80'}`}>
              <Activity size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold leading-none">Worker</span>
          </button>

          <button 
            onClick={() => { setActiveTab('history'); setGlobalSearch(''); loadArchive(); setMobileSettingsOpen(false); }} 
            className={`flex flex-col items-center justify-center gap-1 w-[58px] transition-colors ${activeTab === 'history' && !mobileSettingsOpen ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
          >
            <div className={`flex items-center justify-center w-[48px] h-[48px] rounded-[16px] transition-all ${activeTab === 'history' && !mobileSettingsOpen ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-teal-600' : 'bg-white/15 text-white/80'}`}>
              <FileText size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold leading-none">History</span>
          </button>
          
          <button 
            onClick={() => { setMobileSettingsOpen(!mobileSettingsOpen); }} 
            className={`flex flex-col items-center justify-center gap-1 w-[58px] transition-colors ${mobileSettingsOpen ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
          >
            <div className={`flex items-center justify-center w-[48px] h-[48px] rounded-[16px] transition-all ${mobileSettingsOpen ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-orange-500' : 'bg-white/15 text-white/80'}`}>
              <MenuIcon size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold leading-none">More</span>
          </button>
      </div>

      {/* Mobile Settings Modal Menu */}
      {mobileSettingsOpen && (
        <div className="md:hidden fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMobileSettingsOpen(false)}>
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-2">More Options</h3>
            <button 
              onClick={() => { setActiveTab('direct_worker'); setGlobalSearch(''); setMobileSettingsOpen(false); }} 
              className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
            >
              <Zap size={20} className="text-purple-600" /> Assignments from MLA
            </button>
            {hasGlobalOverviewPermission && (
              <button 
                onClick={() => { setActiveTab('overview'); setGlobalSearch(''); setMobileSettingsOpen(false); }} 
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
              >
                <Eye size={20} className="text-purple-600" /> Global Overview
              </button>
            )}
            {user.canSeeRecentUpdations && (
              <button 
                onClick={() => { setActiveTab('recent_updations'); setGlobalSearch(''); loadArchive(); setMobileSettingsOpen(false); }} 
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
              >
                <Zap size={20} className="text-amber-500" /> Updations
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
