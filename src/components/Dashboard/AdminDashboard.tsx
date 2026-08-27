import React, { useState, useMemo } from 'react';
import { Bell, FileText, Users, Plus, Zap, Eye, Database, FileOutput, Clock, CheckCircle, Paperclip, Ban, AlertCircle, ArrowRight, LogOut, Trash2, Settings, Menu as MenuIcon, Globe } from 'lucide-react';
import { Task, User, GlobalFilters, BackupMeta } from '../../types';
import { InputFormTab } from './InputFormTab';
import { RecentAlertsTab } from './RecentAlertsTab';
import { AdminGlobalView } from './AdminGlobalView';
import { RecentUpdationsTab } from './RecentUpdationsTab';
import { AdminCitizenDirectory } from './AdminCitizenDirectory';
import { AdminDirectAssignments } from './AdminDirectAssignments';
import { AdminSettings } from './AdminSettings';
import { AdminDatabase } from './AdminDatabase';
import { ReportConfigModal, OfficerReportConfigModal, UpdationReportConfigModal } from '../Dialogs/ReportModals';
import { TaskDetailsModal } from '../Dialogs/TaskDetailsModal';
import { StatusFixerModal } from '../Dialogs/StatusFixerModal';
import { useFilteredTasks } from '../../hooks/useFilteredTasks';
import { ReportConfig } from '../Prints/PrintComponents';
import { UpdationReportConfig } from '../../types';
import { formatDate } from '../../utils/formatters';

interface AdminDashboardProps {
  currentUser: User;
  tasks: Task[];
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => void;
  categories: string[];
  designations: string[];
  inputTypes: string[];
  users: User[];
  updateUserDoc: (userId: string, field: string, value: any) => Promise<void>;
  addUser: (newUser: User) => Promise<void>;
  deleteUser: (userId: string) => void;
  setImpersonatedUser: (user: User | null) => void;
  triggerPrint: (task: Task) => void;
  triggerDownloadPDF: (task: Task) => void;
  triggerDetailsPrint: (task: Task) => void;
  triggerDetailsDownload: (task: Task) => void;
  triggerViewDetails: (task: Task) => void;
  addTask: (newTask: Task) => Promise<void>;
  addCategory: (newCat: string) => Promise<void>;
  addDesignation: (newDesig: string) => Promise<void>;
  addInputType: (newType: string) => Promise<void>;
  triggerMasterReport: (config: ReportConfig) => void;
  triggerMasterDownload: (config: ReportConfig) => void;
  triggerOfficerReport: (config: ReportConfig) => void;
  triggerOfficerDownload: (config: ReportConfig) => void;
  triggerUpdationDownload?: (config: UpdationReportConfig) => void;
  triggerRecentUpdationsDownload?: (config: any) => void;
  backupMeta: BackupMeta;
  updateBackupMeta: (updates: Partial<BackupMeta>) => Promise<void>;
  triggerCitizenPrint: (citizens: any[]) => void;
  triggerCitizenDownload: (citizens: any[]) => void;
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
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <div className={`p-2 sm:p-5 rounded-[14px] sm:rounded-2xl border flex flex-col sm:flex-row items-center sm:items-start justify-center gap-1 sm:gap-3 text-center sm:text-left ${colors[color as keyof typeof colors]} hover:shadow-md transition-shadow cursor-pointer transition-all duration-300 hover:bg-white`} onClick={onClick}>
      <div className={`p-1.5 sm:p-2 rounded-lg bg-white/60 shrink-0`}>
        {React.cloneElement(icon, { className: 'w-4 h-4 sm:w-6 sm:h-6' })}
      </div>
      <div>
        <h3 className="text-lg sm:text-2xl font-bold leading-none sm:leading-tight">{value}</h3>
        <p className="text-[7.5px] sm:text-[10px] font-bold uppercase tracking-wider opacity-80 mt-1 leading-none">{title}</p>
      </div>
    </div>
  );
};

export function AdminDashboard({
  currentUser,
  tasks,
  updateTask,
  deleteTask,
  categories,
  designations,
  inputTypes,
  users,
  updateUserDoc,
  addUser,
  deleteUser,
  setImpersonatedUser,
  triggerPrint,
  triggerDownloadPDF,
  triggerDetailsPrint,
  triggerDetailsDownload,
  triggerViewDetails,
  addTask,
  addCategory,
  addDesignation,
  addInputType,
  triggerMasterReport,
  triggerMasterDownload,
  triggerOfficerReport,
  triggerOfficerDownload,
  triggerUpdationDownload,
  triggerRecentUpdationsDownload,
  backupMeta,
  updateBackupMeta,
  triggerCitizenPrint,
  triggerCitizenDownload,
  triggerConfirm,
  globalFilters,
  setGlobalFilters,
  loadArchive
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('alerts');
  const [globalSearch, setGlobalSearch] = useState('');
  const [initialOfficerFilter, setInitialOfficerFilter] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [updationReportModalOpen, setUpdationReportModalOpen] = useState(false);
  const [officerModalOpen, setOfficerModalOpen] = useState<User | null>(null);
  const [showStatusFixer, setShowStatusFixer] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const jumpToTask = (tab: string, taskId: string) => {
    setGlobalSearch(taskId);
    setInitialOfficerFilter('');
    setActiveTab(tab === 'tasks' ? 'overview' : tab);
  };

  const handleOfficerClick = (u: User) => {
    setInitialOfficerFilter(u.id);
    setActiveTab('overview');
  };

  const analyticsTasks = useFilteredTasks(tasks, globalFilters, '', null, null);
  
  const baseTasks = useMemo(() => tasks.filter(t => !t.isTrashed && t.taskType !== 'direct'), [tasks]);

  const total = baseTasks.length;
  const comp = baseTasks.filter(t => t.status === 'Completed').length;
  const draft = baseTasks.filter(t => t.status === 'Draft').length;
  const pend = baseTasks.filter(t => t.status === 'Pending').length;
  const inProg = baseTasks.filter(t => t.status === 'In Progress').length;
  const trashed = tasks.filter(t => t.isTrashed).length;

  const handleStatClick = (status: string) => {
    setGlobalFilters(prev => ({ ...prev, status, dateRange: 'all' }));
    setActiveTab('overview');
    setGlobalSearch('');
    setInitialOfficerFilter('');
  };

  // Filter rejected tasks globally so Admin can reassign them
  const adminRejectedTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'Rejected' && !t.isTrashed);
  }, [tasks]);

  return (
    <div className="space-y-6 pb-[120px]">
      <div className="hidden md:flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-full print-hidden">
        <button 
          onClick={() => { setActiveTab('alerts'); setGlobalSearch(''); }} 
          className={`flex-1 justify-center px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'alerts' ? 'bg-red-600 text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          <Bell size={13}/> Recent
        </button>
        <button 
          onClick={() => { setActiveTab('overview'); setGlobalSearch(''); setInitialOfficerFilter(''); }} 
          className={`flex-1 justify-center px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'overview' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          Global Overview
        </button>
        <button 
          onClick={() => { setActiveTab('recent_updations'); setGlobalSearch(''); loadArchive(); }} 
          className={`flex-1 justify-center px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'recent_updations' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          <Zap size={13}/> Updations
        </button>
        <button 
          onClick={() => { setActiveTab('input'); setGlobalSearch(''); }} 
          className={`flex-1 justify-center px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'input' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          <Plus size={13}/> Register Input
        </button>
        <button 
          onClick={() => { setActiveTab('citizens'); setGlobalSearch(''); loadArchive(); }} 
          className={`flex-1 justify-center px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'citizens' ? 'bg-teal-605 text-teal-700 bg-teal-50 border border-teal-100 shadow-sm' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          <Users size={13}/> Citizen Info
        </button>
        <button 
          onClick={() => { setActiveTab('direct'); setGlobalSearch(''); }} 
          className={`flex-1 justify-center px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'direct' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          <Zap size={13}/> Direct Desk
        </button>
        <button 
          onClick={() => { setActiveTab('users'); setGlobalSearch(''); }} 
          className={`flex-1 justify-center px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'users' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          <Eye size={13}/> Manage Officers
        </button>
        <button 
          onClick={() => { setActiveTab('database'); setGlobalSearch(''); loadArchive(); }} 
          className={`flex-1 justify-center px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'database' ? 'bg-red-600 hover:bg-red-700 text-white shadow' : 'text-slate-600 hover:bg-[#F4F7FB]'}`}
        >
          <Database size={13}/> DB & Backup
        </button>
        {adminRejectedTasks.length > 0 && (
          <button 
            onClick={() => { setActiveTab('rejected'); setGlobalSearch(''); }} 
            className={`flex-1 justify-center px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap ${activeTab === 'rejected' ? 'bg-orange-600 text-white shadow' : 'text-orange-600 hover:bg-orange-50 bg-orange-50/75 border border-orange-100'}`}
          >
            <Ban size={13} className="animate-pulse" /> Rejected ({adminRejectedTasks.length})
          </button>
        )}
      </div>

      {activeTab === 'alerts' && (
        <RecentAlertsTab 
          user={users.find(u => u.role === 'admin')!} 
          tasks={tasks} 
          jumpToTask={jumpToTask} 
          users={users}
          setImpersonatedUser={setImpersonatedUser}
          onOfficerClick={handleOfficerClick}
          updateTask={updateTask}
        />
      )}

      {activeTab === 'recent_updations' && (
        <RecentUpdationsTab 
          tasks={tasks} 
          users={users} 
          triggerRecentUpdationsDownload={triggerRecentUpdationsDownload!} 
          updateTask={updateTask} 
        />
      )}
      
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in">
          {/* Desktop Header */}
          <div className="hidden md:flex justify-between items-center bg-white p-5 rounded-[20px] shadow-sm border border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Analytics Dashboard</h2>
              <p className="text-sm font-medium text-slate-500">System wide tracking for active filters</p>
            </div>
            <div className="flex gap-5">
              <button 
                onClick={() => setShowStatusFixer(true)}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-2xl text-sm font-bold shadow-sm transition-all"
              >
                Quick Status
              </button>
              <div className="flex gap-2">
                {currentUser.role === 'admin' && (
                  <button 
                    onClick={() => { setUpdationReportModalOpen(true); loadArchive(); }} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow flex items-center gap-2 transition-colors"
                  >
                    <FileOutput size={18}/> Updation Report
                  </button>
                )}
                <button 
                  onClick={() => { setReportModalOpen(true); loadArchive(); }} 
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow flex items-center gap-2 transition-colors"
                >
                  <FileOutput size={18}/> Generate Master Report
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Buttons Row */}
          <div className="md:hidden flex gap-2 mt-2 w-full">
            <button 
              onClick={() => setShowStatusFixer(true)}
              className="flex-1 justify-center bg-amber-100 hover:bg-amber-200 text-amber-800 px-1 sm:px-2 py-2 rounded-[14px] text-[10px] font-bold shadow-sm transition-all flex items-center gap-1 leading-tight whitespace-nowrap"
            >
              Quick Status
            </button>
            {currentUser.role === 'admin' && (
              <button 
                onClick={() => { setUpdationReportModalOpen(true); loadArchive(); }} 
                className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-1 sm:px-2 py-2 rounded-[14px] text-[10px] font-bold shadow flex items-center gap-1 transition-colors leading-tight whitespace-nowrap"
              >
                <FileOutput size={12} className="hidden sm:inline-block"/> Updation Report
              </button>
            )}
            <button 
              onClick={() => { setReportModalOpen(true); loadArchive(); }} 
              className="flex-1 justify-center bg-purple-600 hover:bg-purple-700 text-white px-1 sm:px-2 py-2 rounded-[14px] text-[10px] font-bold shadow flex items-center gap-1 transition-colors leading-tight whitespace-nowrap"
            >
              <FileOutput size={12} className="hidden sm:inline-block"/> Master Report
            </button>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-5">
            <StatCard title="Inputs" value={total} color="blue" icon={<FileText />} onClick={() => handleStatClick('All')}/>
            <StatCard title="Completed" value={comp} color="green" icon={<CheckCircle />} onClick={() => handleStatClick('Completed')}/>
            <StatCard title="Pending" value={pend} color="red" icon={<Clock />} onClick={() => handleStatClick('Pending')}/>
            <StatCard title="In Prog" value={inProg} color="indigo" icon={<Zap />} onClick={() => handleStatClick('In Progress')}/>
            <StatCard title="Drafts" value={draft} color="purple" icon={<Paperclip />} onClick={() => handleStatClick('Draft')}/>
            <StatCard title="Trash" value={trashed} color="slate" icon={<Trash2 />} onClick={() => {}}/>
          </div>
          <AdminGlobalView 
            currentUser={currentUser}
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
            initialOfficerFilter={initialOfficerFilter}
            triggerConfirm={triggerConfirm} 
          />
        </div>
      )}
      
      {activeTab === 'input' && (
        <InputFormTab 
          tasks={tasks} 
          addTask={addTask} 
          categories={categories} 
          designations={designations} 
          inputTypes={inputTypes}
          addCategory={addCategory} 
          addDesignation={addDesignation} 
          addInputType={addInputType}
          users={users} 
          triggerPrint={triggerPrint} 
          triggerDownloadPDF={triggerDownloadPDF} 
          creator={currentUser} 
        />
      )}
      
      {activeTab === 'citizens' && (
        <AdminCitizenDirectory 
          currentUser={currentUser}
          updateTask={updateTask}
          tasks={tasks} 
          triggerCitizenPrint={triggerCitizenPrint} 
          triggerDownloadPDF={triggerCitizenDownload} 
          onCitizenClick={(phone) => {
            setGlobalSearch(phone);
            setGlobalFilters(prev => ({ ...prev, applicationMode: 'Citizen' }));
            setActiveTab('overview');
          }}
        />
      )}
      
      {activeTab === 'direct' && (
        <AdminDirectAssignments 
          currentUser={currentUser}
          users={users} 
          tasks={tasks} 
          globalFilters={globalFilters} 
          addTask={addTask} 
          triggerPrint={triggerPrint} 
          triggerDetailsPrint={triggerDetailsPrint} 
          triggerViewDetails={triggerViewDetails} 
          triggerDownloadPDF={triggerDownloadPDF} 
          triggerDetailsDownload={triggerDetailsDownload} 
          updateTask={updateTask} 
          deleteTask={deleteTask} 
          initialSearch={globalSearch} 
          triggerConfirm={triggerConfirm} 
        />
      )}
      
      {activeTab === 'users' && (
        <AdminSettings 
          users={users} 
          updateUserDoc={updateUserDoc} 
          addUser={addUser} 
          deleteUser={deleteUser} 
          setImpersonatedUser={setImpersonatedUser} 
          setOfficerModalOpen={setOfficerModalOpen} 
          loadArchive={loadArchive} 
        />
      )}
      
      {activeTab === 'database' && (
        <AdminDatabase 
          tasks={tasks} 
          users={users} 
          backupMeta={backupMeta} 
          updateBackupMeta={updateBackupMeta} 
          triggerConfirm={triggerConfirm as any} 
          categories={categories}
          designations={designations}
          inputTypes={inputTypes}
        />
      )}

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
          {adminRejectedTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              No rejected inputs present.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adminRejectedTasks.map((t) => {
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
      
      {reportModalOpen && (
        <ReportConfigModal 
          onClose={() => setReportModalOpen(false)} 
          onGenerate={(c) => { setReportModalOpen(false); triggerMasterReport(c); }} 
          triggerDownloadPDF={(c) => { setReportModalOpen(false); triggerMasterDownload(c); }} 
          loadArchive={loadArchive}
        />
      )}
      
      {officerModalOpen && (
        <OfficerReportConfigModal 
          officer={officerModalOpen} 
          onClose={() => setOfficerModalOpen(null)} 
          onGenerate={(c) => { setOfficerModalOpen(null); triggerOfficerReport(c); }} 
          triggerDownloadPDF={(c) => { setOfficerModalOpen(null); triggerOfficerDownload(c); }} 
          loadArchive={loadArchive}
        />
      )}
      
      {updationReportModalOpen && (
        <UpdationReportConfigModal 
          onClose={() => setUpdationReportModalOpen(false)}
          onGenerate={(c) => { setUpdationReportModalOpen(false); triggerUpdationDownload(c); }}
          users={users}
        />
      )}

      {showStatusFixer && (
        <StatusFixerModal 
          tasks={tasks}
          updateTask={updateTask}
          onClose={() => setShowStatusFixer(false)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-3 left-4 right-4 h-[85px] bg-gradient-to-r from-purple-800 to-[#2d1b4e] rounded-[24px] shadow-[0_8px_32px_rgba(45,27,78,0.4)] border border-white/10 z-[90] flex justify-around items-center px-1">
          <button 
            onClick={() => { setActiveTab('alerts'); setGlobalSearch(''); setMobileSettingsOpen(false); }} 
            className={`flex flex-col items-center justify-center gap-1 w-[58px] transition-colors ${activeTab === 'alerts' && !mobileSettingsOpen ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
          >
            <div className={`flex items-center justify-center w-[48px] h-[48px] rounded-[16px] transition-all ${activeTab === 'alerts' && !mobileSettingsOpen ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-red-500' : 'bg-white/15 text-white/80'}`}>
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
            onClick={() => { setActiveTab('overview'); setGlobalSearch(''); setInitialOfficerFilter(''); setMobileSettingsOpen(false); }} 
            className={`flex flex-col items-center justify-center gap-1 w-[58px] transition-colors ${activeTab === 'overview' && !mobileSettingsOpen ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
          >
            <div className={`flex items-center justify-center w-[48px] h-[48px] rounded-[16px] transition-all ${activeTab === 'overview' && !mobileSettingsOpen ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-blue-600' : 'bg-white/15 text-white/80'}`}>
              <Globe size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold leading-none">Overview</span>
          </button>

          <button 
            onClick={() => { setActiveTab('citizens'); setGlobalSearch(''); loadArchive(); setMobileSettingsOpen(false); }} 
            className={`flex flex-col items-center justify-center gap-1 w-[58px] transition-colors ${activeTab === 'citizens' && !mobileSettingsOpen ? 'text-white' : 'text-white/60 hover:text-white/80'}`}
          >
            <div className={`flex items-center justify-center w-[48px] h-[48px] rounded-[16px] transition-all ${activeTab === 'citizens' && !mobileSettingsOpen ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-teal-600' : 'bg-white/15 text-white/80'}`}>
              <Users size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold leading-none">Citizens</span>
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
              onClick={() => { setActiveTab('direct'); setGlobalSearch(''); setMobileSettingsOpen(false); }} 
              className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
            >
              <Zap size={20} className="text-purple-600" /> Direct Desk
            </button>
            <button 
              onClick={() => { setActiveTab('recent_updations'); setGlobalSearch(''); loadArchive(); setMobileSettingsOpen(false); }} 
              className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
            >
              <Zap size={20} className="text-amber-500" /> Updations
            </button>
            <button 
              onClick={() => { setActiveTab('users'); setGlobalSearch(''); setMobileSettingsOpen(false); }} 
              className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
            >
              <Users size={20} className="text-indigo-600" /> Manage Officers
            </button>
            <button 
              onClick={() => { setActiveTab('database'); setGlobalSearch(''); loadArchive(); setMobileSettingsOpen(false); }} 
              className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm transition-colors"
            >
              <Database size={20} className="text-red-600" /> DB & Backup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
