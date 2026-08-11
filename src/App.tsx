import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Shield, User, LogOut, X, Printer, Download, AlertTriangle, 
  CheckCircle, Database, FileOutput 
} from 'lucide-react';

// Firebase Integration
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { onSnapshot, writeBatch, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { auth, getColRef, getDocRef, db } from './services/firebase';

// Helper Utilities & Formatting
import { formatDate, formatTime } from './utils/formatters';
import { 
  DEFAULT_CATEGORIES, DEFAULT_DESIGNATIONS, DEFAULT_USERS, ISLAMIC_QUOTES 
} from './utils/constants';
import { 
  Task, User as UserType, BackupMeta, GlobalFilters, ConfirmModalState, UpdationReportConfig
} from './types';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

// Structured Sub-Components
import { LiveClock } from './components/Shared/LiveClock';
import { PDFCaptureWrapper } from './components/Shared/PDFCaptureWrapper';
import { 
  PrintAcknowledgeSlip, 
  PrintCompletionLetter, 
  PrintTaskDetailsReport, 
  PrintMasterReport, 
  PrintOfficerReport, 
  PrintCitizenDirectory,
  PrintUpdationReport,
  PrintRecentUpdationsReport,
  ReportConfig
} from './components/Prints/PrintComponents';
import { TaskDetailsModal } from './components/Dialogs/TaskDetailsModal';
import { LoginScreen } from './pages/LoginScreen';
import { AdminDashboard } from './components/Dashboard/AdminDashboard';
import { OfficerDashboard } from './components/Dashboard/OfficerDashboard';

declare const __initial_auth_token: string | undefined;

const sanitizeTask = (data: any): Task => {
  const pd = data?.personalDetails || {};
  return {
    ...data,
    id: data?.id ? String(data.id) : '',
    subject: data?.subject ? String(data.subject) : '',
    category: data?.category ? String(data.category) : 'General',
    status: data?.status ? String(data.status) : 'Pending',
    priority: data?.priority ? String(data.priority) : 'Medium',
    assignedTo: Array.isArray(data?.assignedTo) ? data.assignedTo : (data?.assignedTo ? [data.assignedTo] : []),
    timeline: Array.isArray(data?.timeline) ? data.timeline : (data?.timeline ? [data.timeline] : []),
    attachments: Array.isArray(data?.attachments) ? data.attachments : (data?.attachments ? [data.attachments] : []),
    officerStatuses: typeof data?.officerStatuses === 'object' && data?.officerStatuses !== null ? data.officerStatuses : {},
    personalDetails: {
      name: pd.name ? String(pd.name) : 'Unknown',
      mobileNumber: pd.mobileNumber ? String(pd.mobileNumber) : '',
      whatsappNumber: pd.whatsappNumber ? String(pd.whatsappNumber) : '',
      designation: pd.designation ? String(pd.designation) : '',
    },
    createdAt: data?.createdAt ? String(data.createdAt) : new Date().toISOString(),
  } as Task;
};

export default function App() {
  const [fbUser, setFbUser] = useState<any>(null);
  const [pdfProgress, setPdfProgress] = useState<{current: number, total: number} | null>(null);
  const [users, setUsers] = useState<UserType[]>(DEFAULT_USERS);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<UserType | null>(null);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const hasFetchedArchive = useRef(false);
  const [isFetchingArchive, setIsFetchingArchive] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [designations, setDesignations] = useState<string[]>(DEFAULT_DESIGNATIONS);
  const [templates, setTemplates] = useState<string[]>([]);
  
  const [backupMeta, setBackupMeta] = useState<BackupMeta>({ 
    lastBackup: null, 
    lastBackupType: null, 
    lastImport: null 
  });
  
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({ 
    dateRange: '7days', 
    status: 'Active', 
    applicationMode: 'All' 
  });
  
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ 
    isOpen: false, 
    title: '', 
    message: '', 
    onConfirm: null, 
    confirmText: 'Confirm', 
    cancelText: 'Cancel', 
    isDanger: false, 
    showInput: false, 
    inputPlaceholder: '', 
    inputValue: '' 
  });

  const triggerConfirm = useCallback((
    title: string, 
    message: string, 
    onConfirm: (val: string) => void, 
    isDanger = false, 
    confirmText = 'Confirm', 
    showInput = false, 
    inputPlaceholder = ''
  ) => { 
    setConfirmModal({ 
      isOpen: true, 
      title, 
      message, 
      onConfirm: (val: string) => { 
        onConfirm(val); 
        setConfirmModal(prev => ({ ...prev, isOpen: false })); 
      }, 
      confirmText, 
      cancelText: 'Cancel', 
      isDanger, 
      showInput, 
      inputPlaceholder, 
      inputValue: '' 
    }); 
  }, []);

  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [taskToPrint, setTaskToPrint] = useState<Task | null>(null);
  const [taskToDownload, setTaskToDownload] = useState<Task | null>(null);
  const [taskDetailsToDownload, setTaskDetailsToDownload] = useState<Task | null>(null);
  const [masterReportConfigToDownload, setMasterReportConfigToDownload] = useState<ReportConfig | null>(null);
  const [citizenDirectoryToDownload, setCitizenDirectoryToDownload] = useState<any[] | null>(null);
  const [officerReportToDownload, setOfficerReportToDownload] = useState<ReportConfig | null>(null);
  const [updationReportToDownload, setUpdationReportToDownload] = useState<UpdationReportConfig | null>(null);
  const [recentUpdationsReportToDownload, setRecentUpdationsReportToDownload] = useState<any>(null);

  useEffect(() => { 
    const initAuth = async () => { 
      try { 
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token); 
        } else {
          await signInAnonymously(auth); 
        }
      } catch (err) { 
        console.error("Firebase Auth Error:", err); 
      } 
    }; 
    initAuth(); 
    return onAuthStateChanged(auth, setFbUser); 
  }, []);

  const loadArchive = useCallback(async () => { 
    if (hasFetchedArchive.current || isFetchingArchive) return; 
    setIsFetchingArchive(true); 
    try { 
      const snap = await getDocs(getColRef('archived_tasks')); 
      setArchivedTasks(snap.docs.map(d => sanitizeTask(d.data()))); 
      hasFetchedArchive.current = true; 
    } catch (e) { 
      console.error("Failed to load archive:", e); 
    } 
    setIsFetchingArchive(false); 
  }, [isFetchingArchive]);

  useEffect(() => { 
    if (globalFilters.status !== 'Active' || globalFilters.dateRange === 'all' || globalFilters.dateRange === '1year' || globalFilters.dateRange === '6months') { 
      loadArchive(); 
    } 
  }, [globalFilters.status, globalFilters.dateRange, loadArchive]);

  useEffect(() => {
    if (!fbUser) return;
    const savedUser = localStorage.getItem('mla_currentUser'); 
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    const unsubTasks = onSnapshot(getColRef('tasks'), (snap) => {
      setActiveTasks(snap.docs.map(docSnapshot => sanitizeTask(docSnapshot.data())));
    }, (err) => console.error(err));
    
    const unsubUsers = onSnapshot(getColRef('users'), (snap) => { 
      if (snap.empty) { 
        const batch = writeBatch(db); 
        DEFAULT_USERS.forEach(u => batch.set(getDocRef('users', u.id), u)); 
        batch.commit().catch(e => console.error("Batch init error", e)); 
      } else {
        const docUsers = snap.docs.map(docSnapshot => docSnapshot.data() as UserType);
        setUsers(docUsers);
      }
    }, (err) => console.error(err));
    
    const unsubSettings = onSnapshot(getDocRef('settings', 'globals'), (snap) => { 
      if (!snap.exists()) {
        setDoc(getDocRef('settings', 'globals'), { 
          categories: DEFAULT_CATEGORIES, 
          designations: DEFAULT_DESIGNATIONS 
        }).catch(e => console.error(e)); 
      } else { 
        const data = snap.data();
        if(data.categories) setCategories(data.categories); 
        if(data.designations) setDesignations(data.designations); 
        if(data.templates) setTemplates(data.templates);
      } 
    });
    
    const unsubBackupMeta = onSnapshot(getDocRef('settings', 'backupMeta'), (snap) => { 
      if (snap.exists()) setBackupMeta(snap.data() as BackupMeta); 
    });
    
    return () => { 
      unsubTasks(); 
      unsubUsers(); 
      unSettings(); 
      unsubBackupMeta(); 
    };

    function unSettings() { unsubSettings(); }
  }, [fbUser]);

  const allTasks = useMemo(() => { 
    const taskMap = new Map<string, Task>(); 
    archivedTasks.forEach(t => taskMap.set(t.id, t)); 
    activeTasks.forEach(t => taskMap.set(t.id, t)); 
    return Array.from(taskMap.values()); 
  }, [activeTasks, archivedTasks]);

  useEffect(() => { 
    if (taskToPrint) { 
      const timer = setTimeout(() => window.print(), 300); 
      return () => clearTimeout(timer); 
    } 
  }, [taskToPrint]);

  useEffect(() => { 
    const h = () => setTaskToPrint(null); 
    window.addEventListener('afterprint', h); 
    return () => window.removeEventListener('afterprint', h); 
  }, []);

  useEffect(() => {
    const downloadState = taskToDownload || taskDetailsToDownload || masterReportConfigToDownload || citizenDirectoryToDownload || officerReportToDownload || updationReportToDownload || recentUpdationsReportToDownload;
    if (!downloadState) return;
    const isCompletionLetter = taskDetailsToDownload && taskDetailsToDownload.isCompletionLetter;
    
    const targetId = taskToDownload 
      ? 'dl-ack-slip' 
      : isCompletionLetter 
        ? 'dl-completion-letter' 
        : taskDetailsToDownload 
          ? 'dl-details-report' 
          : masterReportConfigToDownload 
            ? 'dl-master-report' 
            : officerReportToDownload 
              ? 'dl-officer-report' 
              : citizenDirectoryToDownload 
                ? 'dl-citizen-dir' 
                : updationReportToDownload
                  ? 'dl-updation-report'
                  : recentUpdationsReportToDownload
                    ? 'dl-recent-updations-report'
                    : null;
    
    const filename = taskToDownload 
      ? `Acknowledge_${taskToDownload.id}` 
      : isCompletionLetter 
        ? `Completion_Letter_${taskDetailsToDownload!.id}` 
        : taskDetailsToDownload 
          ? `Detailed_Report_${taskDetailsToDownload.id}` 
          : masterReportConfigToDownload 
            ? `Master_Performance_Report` 
            : officerReportToDownload 
              ? `Officer_Report_${officerReportToDownload.officer.name}` 
              : citizenDirectoryToDownload 
                ? `Citizen_Directory` 
                : updationReportToDownload
                  ? `Updation_Report_${updationReportToDownload.dateRange}`
                  : recentUpdationsReportToDownload
                    ? `Recent_Updations_Report`
                    : 'Document';

    const generatePDF = () => { 
      const el = document.getElementById(targetId as string); 
      if(!el) { 
        cleanDownloadState(); 
        setPdfProgress(null);
        return; 
      } 
      
      setTimeout(async () => { 
        try { 
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          const pages = Array.from(el.querySelectorAll('.pdf-page-chunk')) as HTMLElement[];
          
          if (pages.length > 0) {
            setPdfProgress({ current: 0, total: pages.length });
            for (let i = 0; i < pages.length; i++) {
              setPdfProgress({ current: i + 1, total: pages.length });
              await new Promise(resolve => setTimeout(resolve, 50));
              
              const pageEl = pages[i];
              const dataUrl = await htmlToImage.toJpeg(pageEl, {
                quality: 0.95,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                style: { margin: '0' }
              });
              const pdfHeight = (pageEl.offsetHeight * pdfWidth) / pageEl.offsetWidth;
              if (i > 0) pdf.addPage();
              pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }
          } else {
            setPdfProgress({ current: 0, total: 1 });
            await new Promise(resolve => setTimeout(resolve, 50));
            const dataUrl = await htmlToImage.toJpeg(el, {
              quality: 0.95,
              pixelRatio: 2,
              backgroundColor: '#ffffff',
              style: { margin: '0' }
            });
            setPdfProgress({ current: 1, total: 1 });
            const pdfHeight = (el.offsetHeight * pdfWidth) / el.offsetWidth;
            
            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
              position = position - pageHeight;
              pdf.addPage();
              pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, pdfHeight);
              heightLeft -= pageHeight;
            }
          }

          pdf.save(`${filename}.pdf`);
          
        } catch (error: any) { 
          console.error("PDF Generation Failed:", error); 
          alert("Failed to generate PDF. Error: " + (error.message || String(error)));
        } finally {
          document.querySelectorAll('.html2canvas-container').forEach(c => c.remove());
          setPdfProgress(null);
          cleanDownloadState(); 
        }
      }, 100); 
    }; 
    
    const cleanDownloadState = () => { 
      setTaskToDownload(null); 
      setTaskDetailsToDownload(null); 
      setMasterReportConfigToDownload(null); 
      setCitizenDirectoryToDownload(null); 
      setOfficerReportToDownload(null);
      setUpdationReportToDownload(null);
      setRecentUpdationsReportToDownload(null);
      setCitizenDirectoryToDownload(null);
    }; 
    
    generatePDF(); 
  }, [taskToDownload, taskDetailsToDownload, masterReportConfigToDownload, officerReportToDownload, updationReportToDownload, recentUpdationsReportToDownload, citizenDirectoryToDownload, users, categories]);

  const handleLogin = (user: UserType) => { 
    setCurrentUser(user); 
    localStorage.setItem('mla_currentUser', JSON.stringify(user)); 
  };

  const handleLogout = () => { 
    setCurrentUser(null); 
    setImpersonatedUser(null); 
    localStorage.removeItem('mla_currentUser'); 
  };

  const addTask = useCallback(async (newTask: Task) => { 
    if (newTask.status === 'Local Work') {
      newTask.assignedTo = [];
      newTask.officerStatuses = {};
    }
    await setDoc(getDocRef('tasks', newTask.id), newTask); 
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const currentTask = allTasks.find(t => t.id === taskId); 
    if (!currentTask) return;
    const merged = { ...currentTask, ...updates } as Task;
    
    // Automatically clear assignments if marked as Local Work
    if (merged.status === 'Local Work') {
      merged.assignedTo = [];
      merged.officerStatuses = {};
    }
    
    const wasArchived = currentTask.status === 'Completed' || currentTask.status === 'Unsolved';
    const willBeArchived = merged.status === 'Completed' || merged.status === 'Unsolved';
    
    if (!wasArchived && willBeArchived) { 
      await setDoc(getDocRef('archived_tasks', taskId), merged); 
      await deleteDoc(getDocRef('tasks', taskId)); 
      setArchivedTasks(prev => [...prev, merged]); 
    } else if (wasArchived && !willBeArchived) { 
      await setDoc(getDocRef('tasks', taskId), merged); 
      await deleteDoc(getDocRef('archived_tasks', taskId)); 
      setArchivedTasks(prev => prev.filter(t => t.id !== taskId)); 
    } else { 
      const targetCol = willBeArchived ? 'archived_tasks' : 'tasks'; 
      await setDoc(getDocRef(targetCol, taskId), merged); // Using setDoc for safe updates
      if (willBeArchived) {
        setArchivedTasks(prev => prev.map(t => t.id === taskId ? merged : t)); 
      }
    }
  }, [allTasks]);
  
  const deleteTask = useCallback(async (taskId: string) => { 
    const currentTask = allTasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const isArchived = archivedTasks.some(t => t.id === taskId); 
    
    if (!currentTask.isTrashed) {
      // Soft Delete
      triggerConfirm(
        "Move to Trash", 
        "Are you sure you want to move this task to the trash? It will be hidden from normal views.", 
        async () => { 
          try { 
            const updates = { isTrashed: true };
            const merged = { ...currentTask, ...updates };
            await setDoc(getDocRef(isArchived ? 'archived_tasks' : 'tasks', taskId), merged);
            if (isArchived) {
              setArchivedTasks(prev => prev.map(t => t.id === taskId ? merged : t));
            } else {
              setActiveTasks(prev => prev.map(t => t.id === taskId ? merged : t));
            }
            setViewingTask(null); 
          } catch (err) { 
            console.error("Move to trash failed:", err); 
          } 
        }, 
        true, 
        "Move to Trash"
      ); 
    } else {
      // Hard Delete
      triggerConfirm(
        "CRITICAL: Permanently Delete Task", 
        "Are you absolutely sure you want to completely delete this task record? This cannot be undone.", 
        async () => { 
          try { 
            await deleteDoc(getDocRef(isArchived ? 'archived_tasks' : 'tasks', taskId)); 
            if (isArchived) setArchivedTasks(prev => prev.filter(t => t.id !== taskId)); 
            setViewingTask(null); 
          } catch (err) { 
            console.error("Delete task failed:", err); 
          } 
        }, 
        true, 
        "Delete Task"
      );
    }
  }, [allTasks, archivedTasks, triggerConfirm]);

  const updateUserDoc = async (userId: string, field: string, value: any) => {
    await setDoc(getDocRef('users', userId), { [field]: value }, { merge: true });
  };

  const addCategory = async (newCat: string) => {
    await setDoc(getDocRef('settings', 'globals'), { categories: [...categories, newCat] }, { merge: true });
  };

  const addDesignation = async (newDesig: string) => { 
    if (designations.includes(newDesig)) return;
    const newDesignations = [...designations, newDesig]; 
    setDesignations(newDesignations); 
    await setDoc(getDocRef('settings', 'globals'), { designations: newDesignations }, { merge: true }); 
  };

  const addTemplate = async (newTemplate: string) => { 
    if (templates.includes(newTemplate)) return;
    const newTemplates = [...templates, newTemplate]; 
    setTemplates(newTemplates); 
    await setDoc(getDocRef('settings', 'globals'), { templates: newTemplates }, { merge: true }); 
  };

  const updateBackupMeta = async (updates: Partial<BackupMeta>) => {
    await setDoc(getDocRef('settings', 'backupMeta'), updates, { merge: true });
  };

  const addUser = async (newUser: UserType) => {
    await setDoc(getDocRef('users', newUser.id), newUser);
  };

  const deleteUserAcct = (userId: string) => { 
    triggerConfirm(
      "CRITICAL: Delete Officer Profile", 
      `Are you sure you want to permanently delete this profile?`, 
      async () => { 
        try { 
          await deleteDoc(getDocRef('users', userId)); 
        } catch (err) { 
          console.error(err); 
        } 
      }, 
      true, 
      "Delete Officer"
    ); 
  };

  const liveCurrentUser = currentUser ? users.find(u => u.id === currentUser.id) : null;
  
  useEffect(() => { 
    if (currentUser && liveCurrentUser && !liveCurrentUser.enabled && liveCurrentUser.role !== 'admin') { 
      handleLogout(); 
      triggerConfirm("Account Suspended", "Your account has been temporarily disabled.", () => {}, true, "Okay"); 
    } 
  }, [liveCurrentUser, currentUser, triggerConfirm]);

  const activeUser = impersonatedUser || liveCurrentUser;
  const isImpersonating = !!impersonatedUser;

  if (!activeUser) return <LoginScreen onLogin={handleLogin} users={users} />;

  const GlobalFilterBar = () => (
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center w-fit mb-6 text-sm">
       <span className="font-bold text-slate-800 flex items-center gap-1.5">&#x1F50E; View Mode:</span>
       <select 
         value={globalFilters.status} 
         onChange={e => setGlobalFilters(p => ({...p, status: e.target.value}))} 
         className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 outline-none bg-white focus:border-indigo-500 transition-all font-sans"
       >
         <option value="Active">Active Actions</option>
         <option value="Pending">Pending Only</option>
         <option value="In Progress">In Progress Only</option>
         <option value="Completed">Completed Only</option>
         <option value="Draft">Drafts Only</option>
         <option value="Trash">Trash</option>
         <option value="All">All Statuses</option>
       </select>
       <select 
         value={globalFilters.dateRange} 
         onChange={e => setGlobalFilters(p => ({...p, dateRange: e.target.value}))} 
         className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 outline-none bg-white focus:border-indigo-500 transition-all font-sans"
       >
         <option value="today">Today Only</option>
         <option value="yesterday">Yesterday Only</option>
         <option value="7days">Last 7 Days</option>
         <option value="1month">Last Month</option>
         <option value="6months">Last 6 Months</option>
         <option value="1year">Last Year</option>
         <option value="all">All Time</option>
         <option value="custom">Custom Single Date</option>
         <option value="custom_range">Custom Date Range</option>
       </select>
       {globalFilters.dateRange === 'custom' && (
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 py-1">
            <input 
              type="date" 
              value={globalFilters.customStartDate || ''} 
              onChange={e => setGlobalFilters(p => ({...p, customStartDate: e.target.value, customEndDate: e.target.value}))} 
              className="text-sm font-bold text-slate-700 outline-none bg-transparent" 
            />
          </div>
       )}
       {globalFilters.dateRange === 'custom_range' && (
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2 py-1">
            <input 
              type="date" 
              value={globalFilters.customStartDate || ''} 
              onChange={e => setGlobalFilters(p => ({...p, customStartDate: e.target.value}))} 
              className="text-sm font-bold text-slate-700 outline-none bg-transparent" 
            />
            <span className="text-xs font-bold text-slate-400">to</span>
            <input 
              type="date" 
              value={globalFilters.customEndDate || ''} 
              onChange={e => setGlobalFilters(p => ({...p, customEndDate: e.target.value}))} 
              className="text-sm font-bold text-slate-700 outline-none bg-transparent" 
            />
          </div>
       )}
       <select 
         value={globalFilters.applicationMode} 
         onChange={e => setGlobalFilters(p => ({...p, applicationMode: e.target.value}))} 
         className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 outline-none bg-yellow-50 focus:border-yellow-500 transition-all font-sans"
       >
         <option value="All">All Application Modes</option>
         <option value="Citizen">Citizen Registrations Only</option>
         <option value="Self">Self Mode Only (No Citizen)</option>
       </select>
       {activeUser?.name === 'KM Shaji (MLA)' && (
         <select
           value={globalFilters.followUpFrequency || 'All'}
           onChange={e => setGlobalFilters(p => ({...p, followUpFrequency: e.target.value}))}
           className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 outline-none bg-blue-50 focus:border-purple-500 transition-all font-sans"
         >
           <option value="All">All Follow-ups</option>
           <option value="1W">1 Week</option>
           <option value="2W">2 Weeks</option>
           <option value="1M">1 Month</option>
           <option value="2M">2 Months</option>
           <option value="3M">3 Months</option>
         </select>
       )}
       {isFetchingArchive && (
         <span className="text-xs font-bold text-indigo-500 animate-pulse ml-2 flex items-center gap-1">
           <Database size={14}/> Fetching Archive...
         </span>
       )}
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&family=Noto+Serif+Malayalam:wght@400;500;600;700;800;900&family=Scheherazade+New:wght@400;700&family=Sora:wght@400;500;600;700&display=swap');
          @media print { @page { margin: 0; size: A4 portrait; } body, html { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Inter', sans-serif; background: white; margin: 0; padding: 0; } .print-hidden { display: none !important; } .print-block { display: block !important; } .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; } }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      ` }} />

      {taskToPrint && <div className="hidden print:block w-full bg-white text-black font-sans"><PrintAcknowledgeSlip task={taskToPrint} /></div>}
      {taskToDownload && <PDFCaptureWrapper id="dl-ack-slip" progress={pdfProgress}><PrintAcknowledgeSlip task={taskToDownload} /></PDFCaptureWrapper>}
      
      {taskDetailsToDownload && (
        taskDetailsToDownload.isCompletionLetter ? (
          <PDFCaptureWrapper id="dl-completion-letter" progress={pdfProgress}>
            <PrintCompletionLetter task={taskDetailsToDownload} />
          </PDFCaptureWrapper>
        ) : (
          <PDFCaptureWrapper id="dl-details-report" progress={pdfProgress}>
            <PrintTaskDetailsReport task={taskDetailsToDownload} users={users} />
          </PDFCaptureWrapper>
        )
      )}
      
      {masterReportConfigToDownload && (
        <PDFCaptureWrapper id="dl-master-report" progress={pdfProgress}>
          <PrintMasterReport 
            config={masterReportConfigToDownload} 
            tasks={allTasks} 
            users={users} 
            categories={categories} 
          />
        </PDFCaptureWrapper>
      )}
      
      {officerReportToDownload && (
        <PDFCaptureWrapper id="dl-officer-report" progress={pdfProgress}>
          <PrintOfficerReport config={officerReportToDownload} tasks={allTasks} />
        </PDFCaptureWrapper>
      )}
      
      {citizenDirectoryToDownload && (
        <PDFCaptureWrapper id="dl-citizen-dir" progress={pdfProgress}>
          <PrintCitizenDirectory citizens={citizenDirectoryToDownload} />
        </PDFCaptureWrapper>
      )}

      {updationReportToDownload && (
        <PDFCaptureWrapper id="dl-updation-report" progress={pdfProgress}>
          <PrintUpdationReport config={updationReportToDownload} tasks={allTasks} users={users} />
        </PDFCaptureWrapper>
      )}

      {recentUpdationsReportToDownload && (
        <PDFCaptureWrapper id="dl-recent-updations-report" progress={pdfProgress}>
          <PrintRecentUpdationsReport config={recentUpdationsReportToDownload} />
        </PDFCaptureWrapper>
      )}

      {viewingTask && !taskToPrint && (
        <TaskDetailsModal 
          task={allTasks.find(t => t.id === viewingTask.id) || viewingTask} 
          onClose={() => setViewingTask(null)} 
          updateTask={updateTask} 
          deleteTask={deleteTask} 
          users={users} 
          categories={categories} 
          triggerDetailsPrint={(task) => setTaskDetailsToDownload(task)} 
          triggerDownloadPDF={setTaskDetailsToDownload} 
          currentUser={activeUser} 
          triggerConfirm={triggerConfirm} 
          templates={templates}
          addTemplate={addTemplate}
        />
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-5 print-hidden">
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full shrink-0 ${confirmModal.isDanger ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {confirmModal.isDanger ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                </div>
                <h3 className="text-xl font-bold text-slate-800 leading-tight">{confirmModal.title}</h3>
              </div>
              <p className="text-sm font-medium text-slate-600 mb-6 leading-relaxed">{confirmModal.message}</p>
              {confirmModal.showInput && ( 
                <textarea 
                  autoFocus 
                  value={confirmModal.inputValue} 
                  onChange={(e) => setConfirmModal(prev => ({ ...prev, inputValue: e.target.value }))} 
                  placeholder={confirmModal.inputPlaceholder} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-2xl font-medium outline-none focus:border-indigo-500 h-24 mb-6 text-sm bg-white text-slate-800"
                ></textarea> 
              )}
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition-colors"
                >
                  {confirmModal.cancelText || 'Cancel'}
                </button>
                <button 
                  onClick={() => confirmModal.onConfirm!(confirmModal.inputValue)} 
                  className={`px-5 py-2.5 text-white text-sm font-bold rounded-2xl transition-colors ${confirmModal.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {confirmModal.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`min-h-screen bg-slate-100 font-sans text-slate-800 flex-col print-hidden relative z-10 ${taskToPrint ? 'hidden' : 'flex'}`}>
        <header className={`${isImpersonating ? 'bg-gradient-to-r from-red-900 to-orange-800' : 'bg-gradient-to-r from-[#3B0764] via-[#581C87] to-[#2E1065]'} text-white shadow-sm transition-colors`}>
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
                {isImpersonating ? <Shield size={20} className="text-white animate-pulse" /> : <User size={20} className="text-white" />}
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight tracking-wide">MLA Squad</h1>
                <p className="text-xs text-blue-100 font-medium tracking-wider uppercase">
                  {isImpersonating ? `ACTING AS: ${activeUser.name}` : activeUser.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {isImpersonating && (
                <button 
                  onClick={() => setImpersonatedUser(null)} 
                  className="hidden sm:flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded border border-white/30 transition-colors font-bold"
                >
                  Exit Profile
                </button>
              )}
              <div className="hidden md:flex items-center text-sm text-blue-100 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                <LiveClock />
              </div>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 text-sm bg-red-500/90 hover:bg-red-600 transition-colors px-4 py-2 rounded-lg font-bold shadow-sm"
              >
                <LogOut size={16} /> 
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <GlobalFilterBar />
          {activeUser.role === 'admin' ? (
            <AdminDashboard 
              currentUser={activeUser}
              tasks={allTasks} 
              updateTask={updateTask} 
              deleteTask={deleteTask} 
              categories={categories} 
              designations={designations} 
              users={users} 
              updateUserDoc={updateUserDoc} 
              addUser={addUser} 
              deleteUser={deleteUserAcct} 
              setImpersonatedUser={setImpersonatedUser} 
              triggerPrint={setTaskToPrint} 
              triggerDownloadPDF={setTaskToDownload} 
              triggerDetailsPrint={(task) => setTaskDetailsToDownload(task)} 
              triggerDetailsDownload={setTaskDetailsToDownload} 
              triggerViewDetails={setViewingTask} 
              addTask={addTask} 
              addCategory={addCategory} 
              addDesignation={addDesignation} 
              triggerMasterReport={(config) => setMasterReportConfigToDownload(config)} 
              triggerMasterDownload={setMasterReportConfigToDownload} 
              triggerOfficerReport={setOfficerReportToDownload} 
              triggerOfficerDownload={setOfficerReportToDownload} 
              triggerUpdationDownload={setUpdationReportToDownload}
              triggerRecentUpdationsDownload={setRecentUpdationsReportToDownload}
              backupMeta={backupMeta} 
              updateBackupMeta={updateBackupMeta} 
              triggerCitizenPrint={(data) => setCitizenDirectoryToDownload(data)} 
              triggerCitizenDownload={setCitizenDirectoryToDownload} 
              triggerConfirm={triggerConfirm} 
              globalFilters={globalFilters} 
              setGlobalFilters={setGlobalFilters}
              loadArchive={loadArchive} 
            />
          ) : (
            <OfficerDashboard 
              user={activeUser} 
              tasks={allTasks} 
              updateTask={updateTask} 
              deleteTask={deleteTask} 
              categories={categories} 
              designations={designations} 
              users={users} 
              addTask={addTask} 
              addCategory={addCategory} 
              addDesignation={addDesignation} 
              triggerPrint={setTaskToPrint} 
              triggerDownloadPDF={setTaskToDownload} 
              triggerDetailsPrint={(task) => setTaskDetailsToDownload(task)} 
              triggerDetailsDownload={setTaskDetailsToDownload} 
              triggerViewDetails={setViewingTask} 
              triggerUpdationDownload={setUpdationReportToDownload}
              triggerRecentUpdationsDownload={setRecentUpdationsReportToDownload}
              isAdminOverride={currentUser!.role === 'admin'} 
              triggerConfirm={triggerConfirm} 
              globalFilters={globalFilters} 
              setGlobalFilters={setGlobalFilters}
              loadArchive={loadArchive} 
            />
          )}
        </main>
        <footer className="pb-6 pt-2 text-center text-[10px] font-bold text-slate-400 tracking-widest uppercase">&copy; {new Date().getFullYear()} MLA Squad Management System. All Rights Reserved.</footer>
      </div>
    </>
  );
}
