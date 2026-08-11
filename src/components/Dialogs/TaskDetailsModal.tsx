import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Check, X, Edit, Printer, Download, PenTool, 
  FileSignature, User, Activity, MessageSquare, ExternalLink, Trash2, CheckCircle, Plus 
} from 'lucide-react';
import { Task, User as UserType, TimelineItem, Attachment } from '../../types';
import { formatDate, formatTime, generateUid, getNow, formatWhatsAppNumber } from '../../utils/formatters';
import { sendWhatsAppUpdate } from '../../utils/whatsapp';
import { WhatsAppButton } from '../Shared/WhatsAppButton';
import { FileUploadButton } from '../Shared/FileUploadButton';
import { deleteFromGoogleDrive } from '../../utils/fileUpload';
import { AttachmentRenderer } from '../Shared/AttachmentRenderer';
import { TimelineIcon } from '../Layout/TimelineIcon';

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => void;
  users: UserType[];
  categories: string[];
  triggerDetailsPrint: (task: Task) => void;
  triggerDownloadPDF: (task: Task) => void;
  currentUser: UserType;
  triggerConfirm: (
    title: string,
    message: string,
    onConfirm: (val: string) => void,
    isDanger?: boolean,
    confirmText?: string,
    showInput?: boolean,
    inputPlaceholder?: string
  ) => void;
  templates: string[];
  addTemplate: (newTemplate: string) => Promise<void>;
}

export function TaskDetailsModal({
  task,
  onClose,
  updateTask,
  deleteTask,
  users,
  categories,
  triggerDetailsPrint,
  triggerDownloadPDF,
  currentUser,
  triggerConfirm,
  templates,
  addTemplate
}: TaskDetailsModalProps) {
  if (!task) return null;
  const [newUpdate, setNewUpdate] = useState('');
  const [newUpdateLinks, setNewUpdateLinks] = useState<(string | Attachment)[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<Task>(task);
  const [editingTimelineId, setEditingTimelineId] = useState<string | null>(null);
  const [timelineEditText, setTimelineEditText] = useState('');
  
  const [showReassign, setShowReassign] = useState(false);
  const [reassignAssignedTo, setReassignAssignedTo] = useState<string[]>([]);

  const canUserEdit = useMemo(() => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.canEditOwnInputs && task.createdByUid === currentUser.id) return true;
    if (currentUser.canSeeGlobalOverview && currentUser.canEditGlobalOverview) return true;
    return false;
  }, [currentUser, task]);

  const isPendingForCurrentUser = task.assignedTo.includes(currentUser.id) && (task.officerStatuses[currentUser.id] || 'Pending') === 'Pending';

  useEffect(() => {
    setEditData(task);
  }, [task]);
  
  const handleAddUpdate = async () => {
    const finalLinks = newUpdateLinks.filter(lnk => {
      if (typeof lnk === 'string') return lnk.trim() !== '';
      return true;
    });

    if(!newUpdate.trim() && finalLinks.length === 0) return;
    
    const updateText = newUpdate.trim() || 'Added a new document or link.';

    // Support the legacy `link` property for the first item if it's a string
    let firstLinkStr = undefined;
    if (finalLinks.length > 0 && typeof finalLinks[0] === 'string') {
      firstLinkStr = finalLinks[0];
    } else if (finalLinks.length > 0 && typeof finalLinks[0] !== 'string') {
      firstLinkStr = finalLinks[0].url;
    }

    const ev: TimelineItem = {
      id: generateUid(),
      type: 'update',
      time: getNow(),
      by: currentUser.name,
      text: updateText,
    };
    
    if (firstLinkStr) ev.link = firstLinkStr;
    if (finalLinks.length > 0) ev.links = finalLinks;

    await updateTask(task.id, { timeline: [...(task.timeline || []), ev] });
    
    if (saveAsTemplate) {
      await addTemplate(newUpdate);
    }
    
    setNewUpdate('');
    setNewUpdateLinks(['']);
    setSaveAsTemplate(false);
  };

  const handleSaveEdit = async () => {
    let updatedTimeline = [...task.timeline];
    let finalAssignedTo = [...editData.assignedTo];
    if (editData.status === 'Local Work') {
      finalAssignedTo = [];
    }

    const oldAssigned = [...task.assignedTo].sort().join(',');
    const newAssigned = [...finalAssignedTo].sort().join(',');
    
    if (oldAssigned !== newAssigned) {
      const newNames = finalAssignedTo
        .map(id => users.find(u => u.id === id)?.name || id)
        .join(', ');
      updatedTimeline.push({
        id: generateUid(),
        type: 'transfer',
        time: getNow(),
        by: currentUser.name,
        text: `Task reassigned to: ${newNames || 'Nobody'}`
      });
    }

    let finalStatus = editData.status;
    let updatedOfficerStatuses = { ...task.officerStatuses };
    if (finalStatus === 'Local Work') {
      updatedOfficerStatuses = {};
    }

    if (task.status === 'Rejected') {
      finalStatus = 'Pending';
      finalAssignedTo.forEach(id => {
        updatedOfficerStatuses[id] = 'Pending';
      });
      updatedTimeline.push({
        id: generateUid(),
        type: 'update',
        time: getNow(),
        by: currentUser.name,
        text: `Task updated and resubmitted to assigned officers.`
      });
    } else if (editData.status !== task.status) {
      finalAssignedTo.forEach(id => {
        updatedOfficerStatuses[id] = editData.status;
      });
      let actionType = 'update';
      if (editData.status === 'Completed' || editData.status === 'Partially Completed') actionType = 'completed';
      if (editData.status === 'Unsolved') actionType = 'unsolved';
      else if (task.status === 'Completed' || task.status === 'Partially Completed' || task.status === 'Unsolved') actionType = 'reverted';
      
      updatedTimeline.push({
        id: generateUid(),
        type: actionType,
        time: getNow(),
        by: currentUser.name,
        text: `Global status changed to ${editData.status}.`
      });
    } else {
      finalAssignedTo.forEach(id => {
        if (!task.assignedTo.includes(id)) {
          updatedOfficerStatuses[id] = 'Pending';
        }
      });
    }

    await updateTask(task.id, {
      subject: editData.subject,
      description: editData.description,
      status: finalStatus,
      priority: editData.priority,
      category: editData.category,
      assignedTo: finalAssignedTo,
      personalDetails: editData.personalDetails,
      officerStatuses: updatedOfficerStatuses,
      timeline: updatedTimeline,
      attachments: editData.attachments
    });
    setIsEditMode(false);
  };

  const handleDeleteTimelineItem = (itemId: string) => {
    triggerConfirm(
      "Confirm Note Deletion",
      "Are you sure you want to delete this timeline entry?",
      async () => {
        await updateTask(task.id, {
          timeline: task.timeline.filter(t => t.id !== itemId)
        });
      },
      true,
      "Delete Entry"
    );
  };

  const saveTimelineEdit = async (item: TimelineItem) => {
    const updatedTimeline = task.timeline.map(t =>
      t.id === item.id ? { ...t, text: timelineEditText } : t
    );
    await updateTask(task.id, { timeline: updatedTimeline });
    setEditingTimelineId(null);
  };

  const handleReassign = async () => {
    const oldAssigned = [...task.assignedTo];
    const newAssigned = [...reassignAssignedTo];
    
    if (oldAssigned.sort().join(',') === newAssigned.sort().join(',')) {
      setShowReassign(false);
      return;
    }

    const addedUsers = newAssigned.filter(id => !task.assignedTo.includes(id));
    const removedUsers = task.assignedTo.filter(id => !newAssigned.includes(id));

    let updatedOfficerStatuses = { ...task.officerStatuses };
    let updatedReassignedFrom = { ...(task.reassignedFrom || {}) };

    addedUsers.forEach(id => {
      updatedOfficerStatuses[id] = 'Pending';
      updatedReassignedFrom[id] = currentUser.id;
    });

    removedUsers.forEach(id => {
      delete updatedOfficerStatuses[id];
      delete updatedReassignedFrom[id];
    });

    const newNames = newAssigned.map(id => users.find(u => u.id === id)?.name || id).join(', ');
    const timelineEvent: TimelineItem = {
      id: generateUid(),
      type: 'transfer',
      time: getNow(),
      by: currentUser.name,
      text: `Task reassigned to: ${newNames || 'Nobody'}`
    };

    const newStatus = task.status === 'Rejected' ? 'Pending' : task.status;

    await updateTask(task.id, {
      assignedTo: newAssigned,
      officerStatuses: updatedOfficerStatuses,
      reassignedFrom: updatedReassignedFrom,
      timeline: [...task.timeline, timelineEvent],
      ...(task.status === 'Rejected' ? { status: 'Pending' } : {})
    });
    
    setShowReassign(false);
  };

  const handleReject = () => {
    triggerConfirm(
      "Reject Task",
      "Are you sure you want to reject this task? It will be returned to the officer who assigned it to you.",
      async () => {
        const previousOfficerId = task.reassignedFrom?.[currentUser.id];
        if (!previousOfficerId) return;

        const previousOfficer = users.find(u => u.id === previousOfficerId);
        
        let updatedAssignedTo = task.assignedTo.filter(id => id !== currentUser.id);
        if (!updatedAssignedTo.includes(previousOfficerId)) {
          updatedAssignedTo.push(previousOfficerId);
        }

        let updatedOfficerStatuses = { ...task.officerStatuses };
        delete updatedOfficerStatuses[currentUser.id];
        updatedOfficerStatuses[previousOfficerId] = 'Pending';

        let updatedReassignedFrom = { ...(task.reassignedFrom || {}) };
        delete updatedReassignedFrom[currentUser.id];

        const timelineEvent: TimelineItem = {
          id: generateUid(),
          type: 'transfer',
          time: getNow(),
          by: currentUser.name,
          text: `Task rejected and returned to ${previousOfficer?.name || previousOfficerId}.`
        };

        await updateTask(task.id, {
          assignedTo: updatedAssignedTo,
          officerStatuses: updatedOfficerStatuses,
          reassignedFrom: updatedReassignedFrom,
          timeline: [...task.timeline, timelineEvent]
        });
      },
      true,
      "Reject Task"
    );
  };

  const isAssigned = task.assignedTo.includes(currentUser.id);
  const isAdmin = currentUser.role === 'admin';
  const reassignedFromUser = task.reassignedFrom?.[currentUser.id];
  
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const cardBg = task.isSelfMode ? 'bg-yellow-50/70 border-yellow-200' : 'bg-[#F4F7FB] border-slate-200';

  return (
    <div id="task-details-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto animate-in slide-in-from-right flex flex-col shadow-md custom-scrollbar">
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText size={20}/> Task Details 
              {task.isSelfMode && (
                <span className="ml-2 bg-yellow-400 text-yellow-900 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
                  Self Mode
                </span>
              )}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Ref: {task.id}</p>
              {currentUser.name === 'M. A. Razak Master (MLA)' && (
                <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Follow-up:</span>
                  <select
                    value={task.followUpFrequency || ''}
                    onChange={(e) => updateTask(task.id, { followUpFrequency: e.target.value })}
                    className="bg-slate-800 text-white text-xs font-bold rounded px-1.5 py-0.5 border border-slate-700 outline-none cursor-pointer transition-all duration-300 hover:bg-slate-50"
                  >
                    <option value="">None</option>
                    <option value="1W">1W</option>
                    <option value="2W">2W</option>
                    <option value="1M">1M</option>
                    <option value="2M">2M</option>
                    <option value="3M">3M</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
             {canUserEdit && !task.isTrashed && (
               isEditMode ? (
                 <>
                   <button 
                     onClick={handleSaveEdit} 
                     className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                   >
                     <Check size={14}/> Save
                   </button>
                   <button 
                     onClick={() => { setIsEditMode(false); setEditData(task); }} 
                     className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                   >
                     <X size={14}/> Cancel
                   </button>
                 </>
               ) : (
                 <button 
                   onClick={() => setIsEditMode(true)} 
                   className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                 >
                   <Edit size={14}/> Edit Task
                 </button>
               )
             )}
             
             {task.isTrashed && canUserEdit && (
               <>
                 <button 
                   onClick={() => {
                     triggerConfirm(
                       "Restore Task",
                       "Are you sure you want to restore this task from the trash?",
                       () => updateTask(task.id, { isTrashed: false }),
                       false,
                       "Yes, Restore"
                     );
                   }} 
                   className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                 >
                   <CheckCircle size={14}/> Restore
                 </button>
                 <button 
                   onClick={() => deleteTask(task.id)} 
                   className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                 >
                   <Trash2 size={14}/> Delete Forever
                 </button>
               </>
             )}
             {!isEditMode && (
               <>
                 <button 
                   onClick={() => triggerDetailsPrint(task)} 
                   className="p-2 bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300 text-white shadow-sm rounded-lg transition-colors text-slate-300 hover:text-white" 
                   title="Print Details"
                 >
                   <Printer size={18}/>
                 </button>
                 <button 
                   onClick={() => triggerDownloadPDF(task)} 
                   className="p-2 bg-indigo-900 hover:bg-indigo-800 rounded-lg transition-colors text-indigo-200 hover:text-white" 
                   title="Download PDF"
                 >
                   <Download size={18}/>
                 </button>
               </>
             )}
             <button 
               onClick={onClose} 
               className="p-2 bg-red-500/20 hover:bg-red-500 rounded-lg transition-colors text-red-200 hover:text-white ml-2"
             >
               <X size={20}/>
             </button>
          </div>
        </div>

        <div className="p-8 space-y-8 flex-1">
          {(task.status === 'Completed' || task.status === 'Partially Completed') && (
             <div className={`${task.status === 'Completed' ? 'bg-green-50 border-green-200' : 'bg-emerald-50 border-emerald-200'} border p-5 rounded-2xl flex flex-wrap justify-between items-center gap-5`}>
                <div>
                  <h4 className={`font-bold ${task.status === 'Completed' ? 'text-green-900' : 'text-emerald-900'} flex items-center gap-2`}><CheckCircle size={18}/> {task.status === 'Completed' ? 'Task is Completed' : 'Task is Partially Completed'}</h4>
                  <p className={`text-xs ${task.status === 'Completed' ? 'text-green-700' : 'text-emerald-700'} font-medium mt-1`}>This issue has been {task.status === 'Completed' ? 'successfully resolved.' : 'partially resolved.'}</p>
                </div>
                <div className="flex gap-2">
                   {canUserEdit && (
                     <button 
                       onClick={() => {
                         if (task.isSignedByMLA) {
                           triggerConfirm(
                             "Remove MLA Signature?",
                             "This will remove the verification signature from the completion letter. Are you sure?",
                             () => updateTask(task.id, { isSignedByMLA: false }),
                             true,
                             "Yes, Remove Signature"
                           );
                         } else {
                           triggerConfirm(
                             "Verify Completion Letter?",
                             "This will officially add the MLA signature to the completion letter. Proceed?",
                             () => updateTask(task.id, { isSignedByMLA: true }),
                             false,
                             "Yes, Sign Letter"
                           );
                         }
                       }} 
                       className={`px-4 py-2 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 ${task.isSignedByMLA ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300'}`}
                     >
                       <PenTool size={16}/> {task.isSignedByMLA ? 'Remove MLA Signature' : 'Sign Completion Letter'}
                     </button>
                   )}
                   <button 
                     onClick={() => triggerDetailsPrint({ ...task, isCompletionLetter: true })} 
                     className={`px-4 py-2 text-white text-sm font-bold rounded-lg shadow-sm flex items-center gap-2 ${task.isSignedByMLA ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-500 hover:bg-slate-600'}`}
                   >
                     <FileSignature size={16}/> {task.isSignedByMLA ? 'Print / PDF Completion Letter' : 'Print Draft (Unverified)'}
                   </button>
                </div>
             </div>
          )}

          <div className="flex flex-wrap gap-5 justify-between items-start bg-[#F4F7FB] p-5 rounded-2xl border border-slate-200">
             <div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Status</p>
               {isEditMode ? (
                 <select 
                   value={editData.status} 
                   onChange={e => setEditData({...editData, status: e.target.value})} 
                   className="border border-slate-300 rounded p-1 text-sm font-bold bg-white outline-none"
                 >
                   <option value="Pending">Pending</option>
                   <option value="Received">Received</option>
                   <option value="In Progress">In Progress</option>
                   <option value="Draft">Draft</option>
                   <option value="Completed">Completed</option>
                   <option value="D Finished">D Finished</option>
                   <option value="Local Work">Local Work</option>
                 </select>
               ) : (
                 <span className={`px-3 py-1 rounded font-bold text-sm uppercase tracking-wider ${task.status==='Completed'?'bg-green-100 text-green-700':task.status==='D Finished'?'bg-emerald-100 text-emerald-700':task.status==='In Progress'?'bg-amber-100 text-amber-700':task.status==='Draft'?'bg-purple-100 text-purple-700':task.status==='Unsolved'?'bg-slate-200 text-slate-500':'bg-red-100 text-red-700'}`}>
                   {task.status}
                 </span>
               )}
             </div>
             <div className="text-right">
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Created On</p>
               <p className="font-bold text-slate-800">{formatDate(task.createdAt)}</p>
               <p className="text-xs font-semibold text-slate-500">{formatTime(task.createdAt)}</p>
             </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div className={`p-5 rounded-2xl border ${cardBg}`}>
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                 <User size={16} className="text-purple-600"/> {task.isSelfMode ? 'Application Info' : 'Citizen Profile'}
               </h3>
               <div className="space-y-3 text-sm">
                 {isEditMode ? (
                   <div className="space-y-2.5">
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Citizen Name</label>
                       <input
                         type="text"
                         value={editData.personalDetails.name || ''}
                         onChange={e => setEditData({
                           ...editData,
                           personalDetails: { ...editData.personalDetails, name: e.target.value }
                         })}
                         className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Designation</label>
                       <input
                         type="text"
                         value={editData.personalDetails.designation || ''}
                         onChange={e => setEditData({
                           ...editData,
                           personalDetails: { ...editData.personalDetails, designation: e.target.value }
                         })}
                         className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Referral Person</label>
                       <input
                         type="text"
                         value={editData.personalDetails.referralPerson || ''}
                         onChange={e => setEditData({
                           ...editData,
                           personalDetails: { ...editData.personalDetails, referralPerson: e.target.value }
                         })}
                         className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                       />
                     </div>
                     {!task.isSelfMode && (
                       <>
                         <div>
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Mobile Number</label>
                           <input
                             type="number"
                             value={editData.personalDetails.mobileNumber || ''}
                             onChange={e => setEditData({
                               ...editData,
                               personalDetails: { ...editData.personalDetails, mobileNumber: e.target.value }
                             })}
                             className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                           />
                         </div>
                         <div>
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">WhatsApp Number</label>
                           <input
                             type="number"
                             value={editData.personalDetails.whatsappNumber || ''}
                             onChange={e => setEditData({
                               ...editData,
                               personalDetails: { ...editData.personalDetails, whatsappNumber: e.target.value }
                             })}
                             className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                           />
                         </div>
                       </>
                     )}
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">House Name</label>
                       <input
                         type="text"
                         value={editData.personalDetails.houseName || ''}
                         onChange={e => setEditData({
                           ...editData,
                           personalDetails: { ...editData.personalDetails, houseName: e.target.value }
                         })}
                         className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                       />
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Place</label>
                         <input
                           type="text"
                           value={editData.personalDetails.place || ''}
                           onChange={e => setEditData({
                             ...editData,
                             personalDetails: { ...editData.personalDetails, place: e.target.value }
                           })}
                           className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Ward Number</label>
                         <input
                           type="text"
                           value={editData.personalDetails.wardNumber || ''}
                           onChange={e => setEditData({
                             ...editData,
                             personalDetails: { ...editData.personalDetails, wardNumber: e.target.value }
                           })}
                           className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                         />
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Post Office</label>
                         <input
                           type="text"
                           value={editData.personalDetails.postOffice || ''}
                           onChange={e => setEditData({
                             ...editData,
                             personalDetails: { ...editData.personalDetails, postOffice: e.target.value }
                           })}
                           className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                         />
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Pin Code</label>
                         <input
                           type="text"
                           value={editData.personalDetails.pinCode || ''}
                           onChange={e => setEditData({
                             ...editData,
                             personalDetails: { ...editData.personalDetails, pinCode: e.target.value }
                           })}
                           className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-slate-800 outline-none focus:border-indigo-500"
                         />
                       </div>
                     </div>
                   </div>
                 ) : (
                   <>
                     <p><span className="font-bold text-slate-500">Name:</span> <span className="font-bold text-slate-800">{task.personalDetails.name}</span> {task.personalDetails.gender && `(${task.personalDetails.gender})`}</p>
                     {task.personalDetails.designation && <p><span className="font-bold text-slate-500">Desig:</span> {task.personalDetails.designation}</p>}
                     {task.personalDetails.referralPerson && <p><span className="font-bold text-slate-500">Ref:</span> {task.personalDetails.referralPerson}</p>}
                     {!task.isSelfMode && <p className="flex items-center gap-2"><span className="font-bold text-slate-500">Mobile:</span> <a href={`tel:${task.personalDetails.mobileNumber}`} className="font-bold text-purple-600 hover:underline">{task.personalDetails.mobileNumber}</a></p>}
                     {task.personalDetails.whatsappNumber && !task.isSelfMode && <p className="flex items-center gap-2"><span className="font-bold text-slate-500">WA:</span> <a href={`https://wa.me/${formatWhatsAppNumber(task.personalDetails.whatsappNumber)}`} target="_blank" rel="noreferrer" className="font-bold text-green-600 hover:underline">{task.personalDetails.whatsappNumber}</a></p>}
                     <p className="pt-2"><span className="font-bold text-slate-500 block mb-1">Address:</span> <span className="font-medium text-slate-700">{[task.personalDetails.houseName, task.personalDetails.place, task.personalDetails.postOffice, task.personalDetails.pinCode, task.personalDetails.localBody, task.personalDetails.wardNumber ? `Ward ${task.personalDetails.wardNumber}` : ''].filter(Boolean).join(', ')}</span></p>
                   </>
                 )}
               </div>
            </div>
            <div>
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                 <FileText size={16} className="text-indigo-600"/> Task Details
               </h3>
               <div className="space-y-3 text-sm">
                 <p className="flex items-center gap-2">
                   <span className="font-bold text-slate-500">Category:</span> 
                   {isEditMode ? (
                     <select 
                       value={editData.category} 
                       onChange={e => setEditData({...editData, category: e.target.value})} 
                       className="border border-slate-300 rounded p-1 text-xs font-bold bg-white outline-none w-full max-w-[200px]"
                     >
                       {sortedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                       {task.taskType === 'direct' && <option value="Direct Assignment">Direct Assignment</option>}
                     </select>
                   ) : (
                     <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">{task.category}</span>
                   )}
                 </p>
                 <p><span className="font-bold text-slate-500">Source:</span> {task.types.join(', ')}</p>
                 <p className="flex items-center gap-2">
                   <span className="font-bold text-slate-500">Priority:</span> 
                   {isEditMode ? (
                     <select 
                       value={editData.priority} 
                       onChange={e => setEditData({...editData, priority: e.target.value})} 
                       className="border border-slate-300 rounded p-1 text-xs font-bold bg-white outline-none"
                     >
                       <option value="Low">Low</option>
                       <option value="Medium">Medium</option>
                       <option value="High">High</option>
                     </select>
                   ) : (
                     <span className={`font-bold ${task.priority==='High'?'text-red-600':task.priority==='Low'?'text-slate-600':'text-amber-600'}`}>{task.priority || 'Medium'}</span>
                   )}
                 </p>
                 {task.programDate && <p><span className="font-bold text-slate-500">Event Date:</span> <span className="font-bold text-indigo-600">{formatDate(task.programDate)} {formatTime(task.programDate)}</span></p>}
                 <div className="pt-2">
                   <span className="font-bold text-slate-500 block mb-1">Assigned Officers:</span>
                   {isEditMode ? (
                     <div className="grid grid-cols-2 gap-2 mt-2 bg-[#F4F7FB] p-2 rounded border border-slate-200">
                       {users.map(u => (
                         <label key={u.id} className="flex items-center gap-1 text-xs cursor-pointer transition-all duration-300 hover:bg-slate-50 font-bold text-slate-700">
                           <input 
                             type="checkbox" 
                             checked={editData.assignedTo.includes(u.id)} 
                             onChange={e => {
                               const newAssigned = e.target.checked 
                                 ? [...editData.assignedTo, u.id] 
                                 : editData.assignedTo.filter(id => id !== u.id);
                               setEditData({...editData, assignedTo: newAssigned});
                             }} 
                             className="rounded text-indigo-600 w-3 h-3" 
                           /> 
                           {u.name}
                         </label>
                       ))}
                     </div>
                   ) : (
                      <div className="flex flex-col gap-1">
                        {task.assignedTo.map(id => {
                          const name = users.find(u => u.id === id)?.name || id;
                          const stat = task.officerStatuses[id] || 'Pending';
                          return (
                            <div key={id} className="flex justify-between items-center bg-[#F4F7FB] px-2 py-1 rounded text-xs">
                              <span className="font-bold">{name}</span>
                              <span className={`font-bold uppercase tracking-wider ${stat==='Completed'?'text-green-600':stat==='Partially Completed'?'text-emerald-600':stat==='In Progress'?'text-amber-600':stat==='Draft'?'text-purple-600':'text-red-500'}`}>
                                {stat}
                              </span>
                            </div>
                          );
                        })}
                        {isAssigned && task.status !== 'Completed' && task.status !== 'Partially Completed' && task.status !== 'Unsolved' && currentUser.canReassign !== false && (
                          <div className="mt-2 flex gap-2">
                            <button 
                              onClick={() => { setReassignAssignedTo([...task.assignedTo]); setShowReassign(true); }}
                              className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded shadow-sm border border-indigo-100 hover:bg-indigo-100 flex-1"
                            >
                              Re-assign
                            </button>
                            {reassignedFromUser && (
                              <button 
                                onClick={handleReject}
                                className="px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded shadow-sm border border-red-100 hover:bg-red-100 flex-1"
                              >
                                Reject Task
                              </button>
                            )}
                          </div>
                        )}
                        {showReassign && (
                          <div className="mt-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Select Officers for Re-assignment</p>
                            <div className="max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-1 mb-2">
                              {users.map(u => (
                                <label key={u.id} className="flex items-center gap-1 text-xs cursor-pointer transition-all duration-300 hover:bg-slate-50 font-bold text-slate-700">
                                  <input 
                                    type="checkbox" 
                                    checked={reassignAssignedTo.includes(u.id)} 
                                    onChange={e => {
                                      const newAssigned = e.target.checked 
                                        ? [...reassignAssignedTo, u.id] 
                                        : reassignAssignedTo.filter(id => id !== u.id);
                                      setReassignAssignedTo(newAssigned);
                                    }} 
                                    className="rounded text-indigo-600 w-3 h-3" 
                                  /> 
                                  {u.name}
                                </label>
                              ))}
                            </div>
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setShowReassign(false)} className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">Cancel</button>
                              <button onClick={handleReassign} className="px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded">Confirm</button>
                            </div>
                          </div>
                        )}
                      </div>
                   )}
                 </div>
               </div>
            </div>
          </div>

          <div>
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 flex justify-between items-center">
               <span>Subject & Description</span>
               <div className="flex gap-2 flex-wrap">
                 {task.attachment && (
                   <AttachmentRenderer 
                     attachment={task.attachment as any} 
                     currentUser={currentUser}
                     index={0}
                   />
                 )}
                 {task.attachments?.map((att, idx) => (
                   <AttachmentRenderer 
                     key={idx}
                     attachment={att}
                     currentUser={currentUser}
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
             </h3>
             {isEditMode ? (
               <div className="space-y-3 mb-4">
                 <input 
                   type="text" 
                   value={editData.subject} 
                   onChange={e => setEditData({...editData, subject: e.target.value})} 
                   className="w-full font-bold text-lg text-slate-800 border border-slate-300 rounded p-2 outline-none focus:border-indigo-500 bg-white" 
                 />
                 <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Add Document / Link (Edit Mode)</p>
                   <FileUploadButton 
                     onUploadSuccess={(att) => {
                       const newAtts = [...(editData.attachments || []), att];
                       setEditData({...editData, attachments: newAtts});
                     }}
                     onManualLinkAdd={(url) => {
                       let finalUrl = url.trim();
                       if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                         finalUrl = 'https://' + finalUrl;
                       }
                       const att: Attachment = { name: `Attached Link ${(editData.attachments?.length || 0) + 1}`, url: finalUrl, type: 'link' };
                       const newAtts = [...(editData.attachments || []), att];
                       setEditData({...editData, attachments: newAtts});
                     }}
                     buttonText="Add Document / Link"
                     className="w-full text-xs font-bold py-2 border-2 border-dashed border-indigo-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-100 text-indigo-600 transition-colors bg-white"
                   />
                   {editData.attachments && editData.attachments.length > 0 && (
                     <div className="mt-3 flex flex-col gap-2">
                       {editData.attachments.map((att, idx) => (
                         <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-lg">
                           <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]" title={att.name}>{att.name}</span>
                           <div className="flex gap-2">
                             <a 
                               href={att.url} 
                               target="_blank" 
                               rel="noreferrer" 
                               className="text-white bg-indigo-500 hover:bg-purple-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                             >
                               View
                             </a>
                             <button 
                               type="button"
                               onClick={() => {
                                 triggerConfirm(
                                   "Remove Attachment",
                                   "Are you sure you want to remove this attachment from the task?",
                                   () => {
                                     const newAtts = editData.attachments?.filter((_, i) => i !== idx);
                                     setEditData({...editData, attachments: newAtts});
                                   },
                                   true,
                                   "Remove"
                                 );
                               }}
                               className="text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                             >
                               Remove
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               </div>
             ) : (
               <p className="font-bold text-lg text-slate-800 mb-2">{task.subject}</p>
             )}
             {isEditMode ? (
               <textarea 
                 value={editData.description} 
                 onChange={e => setEditData({...editData, description: e.target.value})} 
                 className="w-full bg-[#F4F7FB] p-5 rounded-2xl border border-slate-300 text-sm font-medium text-slate-700 whitespace-pre-wrap outline-none focus:border-indigo-500 h-32" 
               />
             ) : (
               task.description && (
                 <div className="bg-[#F4F7FB] p-5 rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 whitespace-pre-wrap">
                   {task.description}
                 </div>
               )
             )}
          </div>

          {!isPendingForCurrentUser && (
            <div>
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                 <Activity size={16} className="text-green-600"/> Progress Timeline
               </h3>
               <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {task.timeline.map((item) => (
                  <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10">
                      <TimelineIcon type={item.type} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-[20px] border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md relative">
                      <div className="flex items-center justify-between space-x-2 mb-2">
                         <div className="font-bold text-slate-800 text-sm">{item.by}</div>
                         <div className="flex items-center gap-2">
                           <div className="text-[10px] font-bold text-slate-400">{formatDate(item.time)} {formatTime(item.time)}</div>
                           {(item.type === 'update' || item.type === 'completed' || item.type === 'draft') && !task.isSelfMode && (
                             <WhatsAppButton 
                               isSent={item.whatsappSent}
                               onSend={() => {
                                 sendWhatsAppUpdate(task, item.text, item.link);
                                 const newTimeline = task.timeline.map(t => t.id === item.id ? { ...t, whatsappSent: true } : t);
                                 updateTask(task.id, { timeline: newTimeline });
                               }} 
                               onReset={() => {
                                 const newTimeline = task.timeline.map(t => t.id === item.id ? { ...t, whatsappSent: false } : t);
                                 updateTask(task.id, { timeline: newTimeline });
                               }}
                               className="p-1.5 rounded-md"
                             />
                           )}
                         </div>
                      </div>
                      {editingTimelineId === item.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea 
                            value={timelineEditText} 
                            onChange={e => setTimelineEditText(e.target.value)} 
                            className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500 h-20 bg-white shadow-inner"
                          />
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => setEditingTimelineId(null)} 
                              className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => saveTimelineEdit(item)} 
                              className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-slate-600 leading-relaxed">
                          {item.text}
                          {item.link && (
                            <a 
                              href={item.link} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="block mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink size={12}/> View Attached Update Document
                            </a>
                          )}
                          {item.attachment && (
                            <div className="mt-3">
                              <AttachmentRenderer 
                                attachment={item.attachment}
                                currentUser={currentUser}
                                index={0}
                                onDeleteSuccess={() => {
                                  const newTimeline = task.timeline.map(t => {
                                    if (t.id === item.id) {
                                      const updatedT = { ...t };
                                      delete updatedT.attachment;
                                      return updatedT;
                                    }
                                    return t;
                                  });
                                  updateTask(task.id, { timeline: newTimeline });
                                }}
                              />
                            </div>
                          )}
                          {item.links && item.links.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.links.map((lnk, lIdx) => (
                                <AttachmentRenderer 
                                  key={lIdx}
                                  attachment={lnk}
                                  currentUser={currentUser}
                                  index={lIdx}
                                  onDeleteSuccess={() => {
                                    const newLinks = item.links!.filter((_, i) => i !== lIdx);
                                    const newTimeline = task.timeline.map(t => {
                                      if (t.id === item.id) {
                                        return { ...t, links: newLinks };
                                      }
                                      return t;
                                    });
                                    updateTask(task.id, { timeline: newTimeline });
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {canUserEdit && !isEditMode && editingTimelineId !== item.id && (
                        <div className="mt-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingTimelineId(item.id); setTimelineEditText(item.text); }} 
                            className="px-2 py-1 bg-blue-50 text-purple-600 text-[10px] font-bold rounded hover:bg-blue-100 flex items-center gap-1"
                          >
                            <Edit size={10}/> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteTimelineItem(item.id)} 
                            className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded hover:bg-red-100 flex items-center gap-1"
                          >
                            <Trash2 size={10}/> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
             </div>
            </div>
          )}
          {!isPendingForCurrentUser && ((isAssigned && task.status !== 'Completed' && task.status !== 'Partially Completed' && task.status !== 'Unsolved') || canUserEdit) && !isEditMode && (
            <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl mt-8">
              <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><MessageSquare size={16}/> Add Progress Note</h4>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Update Message</label>
                  {templates && templates.length > 0 && (
                    <select 
                      className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 rounded px-2 py-0.5 outline-none focus:border-indigo-400 font-bold max-w-[150px]"
                      onChange={(e) => {
                        if (e.target.value) {
                          setNewUpdate(e.target.value);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Load from template...</option>
                      {templates.map((tpl, idx) => (
                        <option key={idx} value={tpl}>{tpl.length > 30 ? tpl.substring(0, 30) + '...' : tpl}</option>
                      ))}
                    </select>
                  )}
                </div>
                <textarea 
                  value={newUpdate} 
                  onChange={e => setNewUpdate(e.target.value)} 
                  placeholder="Type progress update or response here..." 
                  className="w-full border border-slate-300 rounded-2xl px-4 py-3 text-sm font-medium bg-white text-slate-800 outline-none focus:border-indigo-500 h-28 resize-none mb-3"
                />
                <div className="flex items-center gap-2 mb-3 px-1">
                  <input 
                    type="checkbox" 
                    id="saveAsTemplate" 
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="rounded text-indigo-600 w-3.5 h-3.5"
                  />
                  <label htmlFor="saveAsTemplate" className="text-[10px] font-bold text-slate-600 cursor-pointer transition-all duration-300 hover:bg-slate-50 uppercase tracking-wide">
                    Save as Template
                  </label>
                </div>
                
                <div className="space-y-2 mt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Attach Documents</span>
                  <div className="space-y-2">
                    {newUpdateLinks.map((lnk, idx) => {
                      const isString = typeof lnk === 'string';
                      const name = isString ? `Link ${idx + 1}` : lnk.name;
                      const url = isString ? lnk : lnk.url;
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-[#F4F7FB] border border-slate-200 rounded-2xl">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[60%]">{name}</span>
                          <div className="flex gap-2">
                            <a href={url} target="_blank" rel="noreferrer" className="p-1.5 text-purple-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                              <ExternalLink size={14}/>
                            </a>
                            <button 
                              type="button"
                              onClick={async () => {
                                if (!isString && lnk.driveId) {
                                  if (!confirm("Are you sure you want to permanently delete this file?")) return;
                                  await deleteFromGoogleDrive(lnk.driveId);
                                }
                                setNewUpdateLinks(newUpdateLinks.filter((_, i) => i !== idx));
                              }}
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <X size={14}/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <FileUploadButton 
                    uploaderId={currentUser.id}
                    onUploadSuccess={(att) => setNewUpdateLinks([...newUpdateLinks, att])}
                    onManualLinkAdd={(url) => setNewUpdateLinks([...newUpdateLinks, url])}
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-blue-150 mt-1">
                  <button 
                    onClick={handleAddUpdate} 
                    className="bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm text-sm"
                  >
                    Post Update
                  </button>
                </div>
              </div>
            </div>
          )}
          {task.assignedTo.includes(currentUser.id) && currentUser.id !== task.createdByUid && (task.officerStatuses[currentUser.id] || 'Pending') === 'Pending' && (
            <div className="mt-6 pt-4 border-t border-slate-200 flex gap-5">
              <button 
                onClick={() => {
                  triggerConfirm(
                    "Confirm Assignment",
                    "You are taking this assignment. Did you read all details and do you confirm that this assignment is right for you?",
                    () => {
                      const newOffStat = { ...task.officerStatuses, [currentUser.id]: 'In Progress' };
                      let globStat = task.status;
                      if (globStat === 'Pending') globStat = 'In Progress';
                      const ev = { id: generateUid(), type: 'update', time: getNow(), by: currentUser.name, text: 'Task Received and Started' };
                      updateTask(task.id, {
                        officerStatuses: newOffStat,
                        status: globStat,
                        timeline: [...task.timeline, ev]
                      });
                      onClose();
                    },
                    false,
                    "Yes, I Confirm"
                  );
                }}
                className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-2xl font-bold uppercase tracking-widest hover:bg-black transition-colors shadow-sm"
              >
                Receive Task
              </button>
              <button 
                onClick={() => {
                  triggerConfirm(
                    "Reject Task",
                    "Why are you rejecting this task?",
                    (reason: string) => {
                      if (!reason || !reason.trim()) {
                        alert("Reason is required to reject a task.");
                        return;
                      }
                      const newOffStat = { ...task.officerStatuses, [currentUser.id]: 'Rejected' };
                      const evList = [{
                        id: generateUid(),
                        type: 'reverted',
                        time: getNow(),
                        by: currentUser.name,
                        text: `Rejected by ${currentUser.name}. Reason: ${reason}`
                      }];
                      updateTask(task.id, {
                        officerStatuses: newOffStat,
                        status: 'Rejected',
                        timeline: [...task.timeline, ...evList]
                      });
                      onClose();
                    },
                    true,
                    "Reject Task",
                    true,
                    "Reason for rejection..."
                  );
                }}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 px-4 py-3 rounded-2xl font-bold uppercase tracking-widest transition-colors shadow-sm"
              >
                Reject Task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
