import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, Activity, ArrowDownUp, CheckCircle, 
  Paperclip, Clock, Eye, Trash2, ExternalLink, MessageSquare, X 
} from 'lucide-react';
import { Task, User, GlobalFilters, Attachment, TimelineItem } from '../../types';
import { useFilteredTasks } from '../../hooks/useFilteredTasks';
import { AwarenessGraph } from '../Charts/AwarenessGraph';
import { 
  formatDate, getNow, generateUid, formatWhatsAppNumber 
} from '../../utils/formatters';
import { sendWhatsAppUpdate } from '../../utils/whatsapp';
import { WhatsAppButton } from '../Shared/WhatsAppButton';
import { AttachmentRenderer } from '../Shared/AttachmentRenderer';
import { FileUploadButton } from '../Shared/FileUploadButton';

interface WorkerTabProps {
  user: User;
  tasks: Task[];
  globalFilters: GlobalFilters;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  isAdminOverride: boolean;
  taskTypeFilter: string;
  triggerViewDetails: (task: Task) => void;
  initialSearch?: string;
  triggerConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    isDanger?: boolean,
    confirmText?: string,
    showInput?: boolean,
    inputPlaceholder?: string
  ) => void;
}

export function WorkerTab({
  user,
  tasks,
  globalFilters,
  updateTask,
  isAdminOverride,
  taskTypeFilter,
  triggerViewDetails,
  initialSearch,
  triggerConfirm
}: WorkerTabProps) {
  const [search, setSearch] = useState('');
  const [showPartiallyCompleted, setShowPartiallyCompleted] = useState(false);

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const myAssignedAll = useMemo(() => {
    return tasks.filter(t => t.assignedTo.includes(user.id));
  }, [tasks, user.id]);

  const compStat = useMemo(() => {
    return myAssignedAll.filter(t => t.officerStatuses && t.officerStatuses[user.id] === 'Completed').length;
  }, [myAssignedAll, user.id]);

  const draftStat = useMemo(() => {
    return myAssignedAll.filter(t => t.officerStatuses && t.officerStatuses[user.id] === 'Draft').length;
  }, [myAssignedAll, user.id]);

  const filtered = useFilteredTasks(myAssignedAll, globalFilters, search, null, null);
  
  const typeFiltered = useMemo(() => {
    return filtered.filter(t => (t.taskType || 'input') === taskTypeFilter);
  }, [filtered, taskTypeFilter]);

  const todo = typeFiltered.filter(t => t.status !== 'Unsolved' && (!t.officerStatuses[user.id] || t.officerStatuses[user.id] === 'Pending'));
  const inProg = typeFiltered.filter(t => t.status !== 'Unsolved' && (t.officerStatuses[user.id] === 'Received' || t.officerStatuses[user.id] === 'In Progress'));
  const draft = typeFiltered.filter(t => t.status !== 'Unsolved' && t.officerStatuses[user.id] === 'Draft');
  const comp = typeFiltered.filter(t => t.status !== 'Unsolved' && (t.officerStatuses[user.id] === 'Completed' || t.officerStatuses[user.id] === 'D Finished'));
  const displayedComp = comp.filter(t => showPartiallyCompleted ? t.officerStatuses[user.id] === 'D Finished' : t.officerStatuses[user.id] === 'Completed');
  const unsolved = typeFiltered.filter(t => t.status === 'Unsolved');

  return (
    <div className="space-y-6">
      <AwarenessGraph total={myAssignedAll.length} completed={compStat} drafted={draftStat} />
      <div className="flex gap-5 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks by subject, name, ID, mobile..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-slate-800" 
          />
        </div>
      </div>
      <div className="flex overflow-x-auto no-scrollbar gap-5 snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-visible w-full pb-4">
        <Column title="New / Pending" count={todo.length} color="slate">
          {todo.map((t, idx) => (
            <WorkerTaskCard 
              key={`${t.id}-${idx}`} 
              task={t} 
              user={user} 
              updateTask={updateTask} 
              isAdminOverride={isAdminOverride} 
              triggerViewDetails={triggerViewDetails} 
              triggerConfirm={triggerConfirm} 
            />
          ))}
        </Column>
        <Column title="In Progress" count={inProg.length} color="blue">
          {inProg.map((t, idx) => (
            <WorkerTaskCard 
              key={`${t.id}-${idx}`} 
              task={t} 
              user={user} 
              updateTask={updateTask} 
              isAdminOverride={isAdminOverride} 
              triggerViewDetails={triggerViewDetails} 
              triggerConfirm={triggerConfirm} 
            />
          ))}
        </Column>
        <Column title="Draft Box" count={draft.length} color="purple">
          {draft.map((t, idx) => (
            <WorkerTaskCard 
              key={`${t.id}-${idx}`} 
              task={t} 
              user={user} 
              updateTask={updateTask} 
              isAdminOverride={isAdminOverride} 
              triggerViewDetails={triggerViewDetails} 
              triggerConfirm={triggerConfirm} 
            />
          ))}
        </Column>
        <Column 
          title={showPartiallyCompleted ? "D Finished" : "Completed"} 
          count={comp.length} 
          color="green"
          onTogglePartially={() => setShowPartiallyCompleted(!showPartiallyCompleted)}
          showPartially={showPartiallyCompleted}
        >
          {displayedComp.map((t, idx) => (
             <WorkerTaskCard 
              key={`${t.id}-${idx}`} 
              task={t} 
              user={user} 
              updateTask={updateTask} 
              isAdminOverride={isAdminOverride} 
              triggerViewDetails={triggerViewDetails} 
              triggerConfirm={triggerConfirm} 
            />
          ))}
          {unsolved.length > 0 && (
            <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-300">
              <h4 className="font-bold text-slate-500 mb-4 uppercase tracking-widest text-xs text-center">Unsolved / Closed</h4>
              {unsolved.map((t, idx) => (
                <WorkerTaskCard 
                  key={`${t.id}-${idx}`} 
                  task={t} 
                  user={user} 
                  updateTask={updateTask} 
                  isUnsolved 
                  isAdminOverride={isAdminOverride} 
                  triggerViewDetails={triggerViewDetails} 
                  triggerConfirm={triggerConfirm} 
                />
              ))}
            </div>
          )}
        </Column>
      </div>
    </div>
  );
}

// Column Component
interface ColumnProps {
  title: string;
  count: number;
  color: 'slate' | 'blue' | 'green' | 'purple';
  children: React.ReactNode;
  onTogglePartially?: () => void;
  showPartially?: boolean;
}

function Column({ title, count, color, children, onTogglePartially, showPartially }: ColumnProps) {
  const colorMap = { 
    slate: 'border-slate-200 text-slate-700 bg-slate-100', 
    blue: 'border-blue-200 text-blue-700 bg-blue-100', 
    green: 'border-green-200 text-green-700 bg-green-100', 
    purple: 'border-purple-200 text-purple-700 bg-purple-100' 
  };
  return (
    <div className="bg-[#F4F7FB] rounded-2xl p-3 border border-slate-200 flex flex-col h-[800px] overflow-hidden min-w-[85vw] sm:min-w-[300px] lg:min-w-0 snap-center">
      <h3 className="font-bold text-base mb-4 flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-slate-800">{title}</span>
          {onTogglePartially && (
            <button 
              onClick={onTogglePartially}
              title="Toggle D Finished View"
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold border uppercase tracking-wider transition-colors ${showPartially ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
            >
              DF
            </button>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${colorMap[color]}`}>
          {count}
        </span>
      </h3>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4 custom-scrollbar">
        {children}
        {React.Children.count(children) === 0 && (
          <div className="text-center text-sm font-medium text-slate-400 mt-10">No tasks here</div>
        )}
      </div>
    </div>
  );
}

// WorkerTaskCard Component
interface WorkerTaskCardProps {
  task: Task;
  user: User;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  isUnsolved?: boolean;
  isAdminOverride: boolean;
  triggerViewDetails: (task: Task) => void;
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

const WorkerTaskCard = React.memo(({
  task,
  user,
  updateTask,
  isUnsolved,
  isAdminOverride,
  triggerViewDetails,
  triggerConfirm
}: WorkerTaskCardProps) => {
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updateAttachment, setUpdateAttachment] = useState<Attachment | null>(null);
  const [sentUpdates, setSentUpdates] = useState<Record<string, boolean>>({});
  
  const status = task.officerStatuses[user.id] || 'Pending';

  const changeStatus = (newStatus: string, customTimelineEvent: any = null) => {
    const newOffStat = { ...task.officerStatuses, [user.id]: newStatus };
    const allAssigned = task.assignedTo.map(id => newOffStat[id] || 'Pending');
    let globStat = task.status;
    
    if (newStatus === 'Completed' || newStatus === 'D Finished') {
      globStat = allAssigned.every(s => s === 'Completed' || s === 'D Finished') 
        ? newStatus 
        : allAssigned.some(s => s === 'Draft') 
          ? 'Draft' 
          : 'In Progress';
    } else if (newStatus === 'Draft') {
      globStat = allAssigned.every(s => s === 'Completed' || s === 'Draft') 
        ? 'Draft' 
        : 'In Progress';
    } else if (newStatus === 'In Progress' || newStatus === 'Received') {
      if (globStat === 'Pending' || globStat === 'Draft') globStat = 'In Progress';
    }

    const evs = [];
    if (customTimelineEvent) {
      if (Array.isArray(customTimelineEvent)) evs.push(...customTimelineEvent);
      else evs.push(customTimelineEvent);
    } else {
      evs.push({
        id: generateUid(),
        type: newStatus.toLowerCase(),
        time: getNow(),
        by: user.name,
        text: `Marked as ${newStatus}`
      });
    }
    updateTask(task.id, { officerStatuses: newOffStat, status: globStat, timeline: [...task.timeline, ...evs] });
  };

  const handleSaveUpdate = () => {
    if(!updateText.trim() && !updateAttachment) return;
    const ev: TimelineItem = {
      id: generateUid(),
      type: 'update',
      time: getNow(),
      by: user.name,
      text: updateText,
      attachment: updateAttachment || undefined
    };
    if (status !== 'In Progress' && status !== 'Draft') {
      changeStatus('In Progress', ev);
    } else {
      updateTask(task.id, { timeline: [...task.timeline, ev] });
    }
    setUpdateText('');
    setUpdateAttachment(null);
    setShowProgressModal(false);
  };

  const deleteUpdate = (uid: string) => {
    triggerConfirm(
      "Delete Timeline Note",
      "Are you sure you want to delete this specific progress entry from the history?",
      () => {
        updateTask(task.id, { timeline: task.timeline.filter(tl => tl.id !== uid) });
      },
      true,
      "Delete Update"
    );
  };

  const myUpdates = task.timeline
    .filter(tl => tl.type === 'update' && (tl.by === user.name || isAdminOverride))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const cardBgColor = task.isSelfMode ? 'bg-yellow-50/70' : 'bg-white';

  return (
    <div className={`${cardBgColor} p-5 rounded-[20px] shadow-sm border ${isUnsolved ? 'border-slate-300 opacity-60 bg-[#F4F7FB] grayscale' : status === 'Pending' ? 'border-red-200' : task.isSelfMode ? 'border-yellow-300' : 'border-slate-200'} relative`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-wrap gap-2">
          <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
            {task.id}
          </span>
          <span className={`${task.taskType==='direct'?'bg-indigo-50 text-indigo-800 border-indigo-200':'bg-blue-50 text-blue-800 border-blue-200'} text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide truncate max-w-[90px]`}>
            {task.category}
          </span>
          {task.isSelfMode && (
            <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
              Self
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-400">{formatDate(task.createdAt)}</span>
      </div>
      <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2">{task.subject || task.personalDetails.name}</h4>
      <p className="text-[10px] font-bold text-indigo-600 mb-2 uppercase tracking-widest">{task.personalDetails.name} {task.personalDetails.referralPerson && `(Ref: ${task.personalDetails.referralPerson})`}</p>
      <p className="text-[10px] font-medium text-slate-500 mb-3">{task.personalDetails.mobileNumber} • {task.personalDetails.place || 'No place'}</p>
      {task.description && (
        <div 
          className="bg-[#F4F7FB]/50 p-2 rounded-lg text-xs font-medium text-slate-700 line-clamp-3 border border-slate-100 mb-3 whitespace-pre-wrap" 
          title={task.description}
        >
          {task.description}
        </div>
      )}

      {(task.attachment || (task.attachments && task.attachments.length > 0)) && (
        <div className="mb-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-2 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-indigo-900 truncate">
            <ExternalLink size={12} className="shrink-0 text-indigo-600" />
            <span className="text-[10px] font-bold truncate" title={task.attachments && task.attachments.length > 0 ? `${task.attachments.length} Attached Docs` : task.attachment?.name}>
              {task.attachments && task.attachments.length > 0 ? `${task.attachments.length} Attached Docs` : task.attachment?.name}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {task.attachment && (
              <AttachmentRenderer 
                attachment={task.attachment as any} 
                currentUser={user}
                index={0}
              />
            )}
            {task.attachments?.map((att, idx) => (
              <AttachmentRenderer 
                key={idx}
                attachment={att}
                currentUser={user}
                index={task.attachment ? idx + 1 : idx}
                onDeleteSuccess={() => {
                  if (task.attachments) {
                    const newAtts = task.attachments.filter((_, i) => i !== idx);
                    updateTask(task.id, { attachments: newAtts });
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {!isUnsolved && status !== 'Pending' && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100/50">
          {/* Receive and Reject buttons have been moved to TaskDetailsModal */}
          {(status === 'Received' || status === 'In Progress' || status === 'Draft') && (
            <div className="w-full space-y-2">
              <button 
                onClick={() => setShowProgressModal(true)} 
                className="w-full bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Activity size={14}/> {status === 'Received' ? 'Start Progress' : 'Add Update'}
              </button>
              {status !== 'Draft' && (
                <button 
                  onClick={() => changeStatus('Draft')} 
                  className="w-full bg-purple-100 text-purple-700 border border-purple-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-200 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Paperclip size={14}/> Send to Draft
                </button>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    triggerConfirm(
                      "D Finished?", 
                      `Mark task ID ${task.id} as D Finished?`, 
                      (note: string) => {
                        const evs = [];
                        if (note && note.trim()) evs.push({ id: generateUid(), type: 'update', time: getNow(), by: user.name, text: `Partial Note: ${note}` });
                        evs.push({ id: generateUid(), type: 'd finished', time: getNow(), by: user.name, text: 'Task marked as D Finished.' });
                        changeStatus('D Finished', evs);
                      }, 
                      false, "Mark D Finished", true, "Optional note..."
                    );
                  }} 
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors shadow-sm flex items-center justify-center gap-1 uppercase tracking-wider"
                >
                  <CheckCircle size={12}/> DF
                </button>
                <button 
                  onClick={() => {
                    triggerConfirm(
                      "Confirm Task Completion", 
                      `Are you sure you want to mark task ID ${task.id} as completely solved?`, 
                      (note: string) => {
                        const evs = [];
                        if (note && note.trim()) evs.push({ id: generateUid(), type: 'update', time: getNow(), by: user.name, text: `Completion Note: ${note}` });
                        evs.push({ id: generateUid(), type: 'completed', time: getNow(), by: user.name, text: 'Task marked as fully completed.' });
                        changeStatus('Completed', evs);
                      }, 
                      false, "Mark Completed", true, "Enter optional completion note here..."
                    );
                  }} 
                  className="w-1/2 bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors shadow-sm flex items-center justify-center gap-1 uppercase tracking-wider"
                >
                  <CheckCircle size={12}/> Complete
                </button>
              </div>
            </div>
          )}
          {(status === 'Completed' || status === 'D Finished') && (
            <div className="w-full space-y-2">
               <button 
                 onClick={() => changeStatus('Draft', { id: generateUid(), type: 'reverted', time: getNow(), by: user.name, text: 'Reverted to Draft Box' })} 
                 className="w-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
               >
                 <Paperclip size={12}/> Revert to Draft
               </button>
               <button 
                 onClick={() => changeStatus('In Progress', { id: generateUid(), type: 'reverted', time: getNow(), by: user.name, text: 'Reverted to Progress' })} 
                 className="w-full bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-orange-100 transition-colors flex items-center justify-center gap-1"
               >
                 <ArrowDownUp size={12}/> Revert to Progress
               </button>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100/50">
        <button 
          onClick={() => triggerViewDetails(task)} 
          className="flex-1 bg-slate-100 text-slate-700 font-bold py-2 rounded-2xl text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
        >
          <Eye size={14}/> View Full Details
        </button>
      </div>

      {myUpdates.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#F1F5F9] space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">My Progress Updates</p>
          {myUpdates.slice(0, 2).map(up => (
            <div key={up.id} className="bg-amber-50/70 p-2 rounded-lg border border-amber-100 relative group">
              <div className="text-[10px] font-medium text-slate-700 pr-10">
                <span className="font-bold text-amber-800 mr-1 block mb-0.5">{formatDate(up.time)}</span>
                {up.text}
                {up.link && (
                  <a href={up.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-1 font-bold text-indigo-600 hover:underline">
                    <ExternalLink size={10}/> View Link
                  </a>
                )}
                {up.attachment && (
                  <div className="mt-2">
                    <AttachmentRenderer attachment={up.attachment} currentUser={user} index={0} />
                  </div>
                )}
              </div>
              <div className="absolute right-1 top-1 flex flex-col gap-1">
                {!task.isSelfMode && (
                  <WhatsAppButton 
                    onSend={() => sendWhatsAppUpdate(task, up.text, up.attachment?.url || up.link)}
                    className="p-1 rounded"
                    iconSize={10}
                  />
                )}
                <button 
                  onClick={() => deleteUpdate(up.id)} 
                  title="Delete Update" 
                  className="text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={10}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showProgressModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-5">
          <div className="bg-white rounded-[20px] shadow-sm w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-purple-600 p-5 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Enter Progress Update</h3>
              <button onClick={() => setShowProgressModal(false)} className="text-white hover:text-blue-100 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-8">
               <textarea 
                 autoFocus 
                 value={updateText} 
                 onChange={e => setUpdateText(e.target.value)} 
                 placeholder="What action did you take?..." 
                 className="w-full px-4 py-3 border border-slate-300 rounded-2xl font-medium outline-none focus:border-purple-500 h-32 mb-3 bg-white text-slate-800"
               ></textarea>
               {updateAttachment ? (
                 <div className="mb-4">
                   <AttachmentRenderer 
                     attachment={updateAttachment} 
                     currentUser={user} 
                     index={0} 
                     onDeleteSuccess={() => setUpdateAttachment(null)}
                   />
                 </div>
               ) : (
                 <div className="mb-4">
                   <FileUploadButton 
                     onUploadSuccess={(att) => setUpdateAttachment(att)} 
                     onManualLinkAdd={(url) => setUpdateAttachment({ name: 'External Document Link', url, type: 'link', id: generateUid() } as Attachment)}
                     uploaderId={user.id}
                   />
                   <p className="text-[10px] text-slate-400 mt-1 text-center font-medium">Supports Images (JPEG/PNG) and PDFs. Max size: 2MB.</p>
                 </div>
               )}
               <button 
                 onClick={handleSaveUpdate} 
                 className="w-full bg-purple-600 text-white font-bold py-3 rounded-2xl hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300 transition-colors shadow"
               >
                 Save Update
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

WorkerTaskCard.displayName = 'WorkerTaskCard';
Column.displayName = 'Column';
