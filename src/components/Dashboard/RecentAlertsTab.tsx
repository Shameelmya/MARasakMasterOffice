import React, { useMemo, useRef } from 'react';
import { Bell, ChevronRight, Clock } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';

interface RecentAlertsTabProps {
  user: User;
  tasks: Task[];
  jumpToTask: (tab: string, taskId: string) => void;
  users?: User[];
  setImpersonatedUser?: (u: User) => void;
  onOfficerClick?: (u: User) => void;
  updateTask?: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

export function RecentAlertsTab({ user, tasks, jumpToTask, users, setImpersonatedUser, onOfficerClick, updateTask }: RecentAlertsTabProps) {
  // Determine active tasks based on whether the user is MLA (admin) or an Officer
  const activeTasks = useMemo(() => {
    if (user.role === 'admin') {
      return tasks
        .filter(t => t.status === 'Pending' || t.status === 'In Progress' || t.status === 'Rejected')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      return tasks
        .filter(t => 
          (t.assignedTo.includes(user.id) && (t.officerStatuses?.[user.id] === 'Pending' || t.officerStatuses?.[user.id] === 'In Progress' || !t.officerStatuses?.[user.id])) ||
          (t.status === 'Rejected' && t.createdByUid === user.id)
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [tasks, user]);

  const pendingCount = activeTasks.filter(t => user.role === 'admin' ? t.status === 'Pending' : (t.status !== 'Rejected' && (t.officerStatuses?.[user.id] === 'Pending' || !t.officerStatuses?.[user.id]))).length;
  const inProgressCount = activeTasks.filter(t => user.role === 'admin' ? t.status === 'In Progress' : (t.status !== 'Rejected' && t.officerStatuses?.[user.id] === 'In Progress')).length;
  const rejectedCount = activeTasks.filter(t => t.status === 'Rejected').length;

  const overdueCount = useMemo(() => {
    // Tasks are overdue if deadline is in the past, excluding Completed/Draft/Unsolved tasks
    return activeTasks.filter(t => {
      if (t.status === 'Completed' || t.status === 'Draft' || t.status === 'Unsolved') return false;
      const d = t.deadline ? new Date(t.deadline).getTime() : 0;
      return d > 0 && d < Date.now();
    }).length;
  }, [activeTasks]);

  const handleShowTask = (t: Task) => {
    if (user.role === 'admin') {
      if (updateTask) updateTask(t.id, { isReadByAdmin: true });
      if (t.taskType === 'direct') {
        jumpToTask('direct', t.id);
      } else {
        jumpToTask('overview', t.id);
      }
    } else {
      if (t.taskType === 'direct') {
        jumpToTask('direct_worker', t.id);
      } else {
        jumpToTask('worker', t.id);
      }
    }
  };

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const startPress = (t: Task) => {
    if (user.role === 'admin' && updateTask && t.isReadByAdmin) {
      timersRef.current[t.id] = setTimeout(() => {
        updateTask(t.id, { isReadByAdmin: false });
      }, 500);
    }
  };

  const clearPress = (id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };

  return (
    <div id="recent-alerts-tab" className="bg-[#FFF5F5] border border-[#FECDD3] rounded-[32px] p-8 md:p-8 shadow-sm relative overflow-hidden animate-in fade-in duration-200">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="text-[#DC2626] shrink-0 fill-current animate-pulse" size={24} />
        <h2 className="text-[#991B1B] font-bold tracking-tight text-xl sm:text-2xl uppercase">
          URGENT & ACTIVE ACTIONS
        </h2>
      </div>

      {user.role === 'admin' && users && setImpersonatedUser ? (
        <div className="flex flex-row gap-2 sm:gap-8 mb-4 sm:mb-8 w-full justify-center items-stretch">
          {/* Big Active Box */}
          <div className="bg-white border border-[#FEE2E2] rounded-[16px] sm:rounded-[24px] py-3 px-2 sm:py-6 sm:px-8 shadow-sm flex flex-col items-center justify-center shrink-0 w-[35%] sm:w-auto sm:max-w-[280px]">
            <div className="text-3xl sm:text-6xl font-bold text-[#EF4444] tracking-tight leading-none mb-1 sm:mb-2">
              {activeTasks.length}
            </div>
            <div className="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-3 text-center leading-tight">
              ACTIVE ACTIONS
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-5 text-[9px] sm:text-sm font-bold mt-1">
              <span className="text-red-500 whitespace-nowrap">{pendingCount} Pend</span>
              <span className="text-orange-500 whitespace-nowrap">{inProgressCount} Prog</span>
            </div>
            {overdueCount > 0 && (
              <div className="text-red-600 font-bold text-[7px] sm:text-[10px] uppercase bg-red-100 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full mt-2 sm:mt-3 text-center">
                {overdueCount} Overdues
              </div>
            )}
          </div>

          {/* Officer Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-3 w-[65%] sm:max-w-[500px]">
            {users.filter(u => u.enabled).map(u => {
              const uPending = tasks.filter(t => 
                t.assignedTo.includes(u.id) && 
                (t.officerStatuses?.[u.id] === 'Pending' || !t.officerStatuses?.[u.id] || t.officerStatuses?.[u.id] === 'Rejected')
              ).length;
              const uInProgress = tasks.filter(t => 
                t.assignedTo.includes(u.id) && 
                t.officerStatuses?.[u.id] === 'In Progress'
              ).length;
              const uActive = uPending + uInProgress;

              return (
                <button 
                  key={u.id} 
                  onClick={() => {
                    if (onOfficerClick) {
                      onOfficerClick(u);
                    } else if (setImpersonatedUser) {
                      setImpersonatedUser(u);
                    }
                  }}
                  className="flex flex-col items-stretch justify-center gap-0.5 sm:gap-1.5 p-1.5 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm group cursor-pointer duration-300 hover:bg-slate-50 w-full min-w-0"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-3 w-full">
                    <div className="text-[8px] sm:text-xs font-bold text-slate-800 truncate text-left w-full sm:w-auto leading-tight">{u.name}</div>
                    <div className={`w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center rounded-full text-[8px] sm:text-[10px] font-bold shrink-0 self-end sm:self-auto ${uActive > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                      {uActive}
                    </div>
                  </div>
                  <div className="flex flex-col xl:flex-row justify-between w-full text-[7px] sm:text-[10px] font-bold text-left sm:text-center mt-1">
                    <span className="text-red-500">{uPending} Pend</span>
                    <span className="text-orange-500">{uInProgress} Prog</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white border border-[#FEE2E2] rounded-[24px] p-8 shadow-sm text-center mb-8">
          <div className="text-6xl font-bold text-[#EF4444] tracking-tight mb-2">
            {activeTasks.length}
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            ACTIVE ACTIONS
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-sm font-bold mt-1">
            <span className="text-red-500">{pendingCount} Pending</span>
            <span className="text-orange-500">{inProgressCount} In Progress</span>
            {rejectedCount > 0 && (
              <span className="text-orange-600">{rejectedCount} Rejected</span>
            )}
          </div>
          {overdueCount > 0 && (
            <div className="text-red-600 font-bold text-[10px] uppercase bg-red-100 px-3 py-1 rounded-full inline-block mt-3">
              {overdueCount} Overdues
            </div>
          )}
        </div>
      )}

      {activeTasks.length === 0 ? (
        <div className="text-slate-500 font-medium py-12 text-center bg-white/60 rounded-[20px] border border-red-100/50">
          No active assignments found in this view.
        </div>
      ) : (
        <div className="bg-white border border-[#F1F5F9] rounded-[24px] overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#FAFAFA]">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-[#FCFCFC]">
                    REFERENCE ID & DEADLINE
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-[#FCFCFC]">
                    SUBJECT
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-[#FCFCFC] text-right">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.map((t) => {
                  const isTaskOverdue = t.status !== 'Completed' && t.status !== 'Draft' && t.status !== 'Unsolved' && t.deadline && new Date(t.deadline).getTime() < Date.now();
                  return (
                    <tr 
                      key={t.id} 
                      className={`border-b border-[#F1F5F9] hover:bg-[#F4F7FB]/80 transition-colors ${user.role === 'admin' && t.isReadByAdmin ? 'bg-blue-100' : ''}`}
                      onContextMenu={(e) => {
                        if (user.role === 'admin' && updateTask && t.isReadByAdmin) {
                          e.preventDefault();
                          updateTask(t.id, { isReadByAdmin: false });
                        }
                      }}
                      onPointerDown={() => startPress(t)}
                      onPointerUp={() => clearPress(t.id)}
                      onPointerLeave={() => clearPress(t.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          <span className="bg-[#E2E8F0] text-[#1E293B] text-[10px] font-extrabold px-2.5 py-0.5 rounded shadow-sm w-fit uppercase tracking-wider">
                            {t.id}
                          </span>
                          <span className={`text-xs font-bold flex items-center gap-1 ${isTaskOverdue ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                            <Clock size={12} />
                            {formatDate(t.deadline)} {formatTime(t.deadline)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <h4 className="font-extrabold text-slate-800 text-sm line-clamp-2">
                            {t.subject || t.personalDetails.name}
                          </h4>
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                            {t.personalDetails.name} • {t.category}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleShowTask(t)}
                          className="px-5 py-2 bg-[#FEE2E2] hover:bg-red-200 text-[#EF4444] rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm inline-flex items-center gap-1 cursor-pointer transition-all duration-300 hover:bg-slate-50"
                        >
                          SHOW TASK <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-style View */}
          <div className="block md:hidden divide-y divide-[#F1F5F9]">
            {activeTasks.map((t) => {
              const isTaskOverdue = t.status !== 'Completed' && t.status !== 'Draft' && t.status !== 'Unsolved' && t.deadline && new Date(t.deadline).getTime() < Date.now();
              return (
                <div 
                  key={t.id} 
                  className={`p-5 flex flex-col gap-5 transition-colors ${user.role === 'admin' && t.isReadByAdmin ? 'bg-blue-100' : ''}`}
                  onContextMenu={(e) => {
                    if (user.role === 'admin' && updateTask && t.isReadByAdmin) {
                      e.preventDefault();
                      updateTask(t.id, { isReadByAdmin: false });
                    }
                  }}
                  onPointerDown={() => startPress(t)}
                  onPointerUp={() => clearPress(t.id)}
                  onPointerLeave={() => clearPress(t.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="bg-[#E2E8F0] text-[#1E293B] text-[10px] font-extrabold px-2 px-2.5 py-0.5 rounded shadow-sm w-fit uppercase tracking-wider">
                        {t.id}
                      </span>
                      <span className={`text-xs font-bold flex items-center gap-1 mt-1 ${isTaskOverdue ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                        <Clock size={12} />
                        {formatDate(t.deadline)} {formatTime(t.deadline)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleShowTask(t)}
                      className="px-4 py-2 bg-[#FEE2E2] hover:bg-red-200 text-[#EF4444] rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 shrink-0"
                    >
                      SHOW TASK <ChevronRight size={12} />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm mb-1">
                      {t.subject || t.personalDetails.name}
                    </h4>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                      {t.personalDetails.name} • {t.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
