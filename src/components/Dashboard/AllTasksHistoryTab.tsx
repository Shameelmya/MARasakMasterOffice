import { useState, useMemo } from 'react';
import { 
  Search, Eye, Send, Printer, Download, Trash2, Filter 
} from 'lucide-react';
import { Task, User, GlobalFilters } from '../../types';
import { useFilteredTasks } from '../../hooks/useFilteredTasks';
import { formatDate, formatWhatsAppNumber } from '../../utils/formatters';

interface AllTasksHistoryTabProps {
  tasks: Task[];
  globalFilters: GlobalFilters;
  categories: string[];
  triggerPrint: (task: Task) => void;
  triggerDownloadPDF: (task: Task) => void;
  triggerDetailsPrint: (task: Task) => void;
  triggerDetailsDownload: (task: Task) => void;
  triggerViewDetails: (task: Task) => void;
  currentUser: User;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => void;
  users: User[];
}

export function AllTasksHistoryTab({
  tasks,
  globalFilters,
  categories,
  triggerPrint,
  triggerDownloadPDF,
  triggerDetailsPrint,
  triggerDetailsDownload,
  triggerViewDetails,
  currentUser,
  updateTask,
  deleteTask,
  users
}: AllTasksHistoryTabProps) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(50);
  
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.localeCompare(b));
  }, [categories]);

  const filtered = useFilteredTasks(tasks, globalFilters, search, catFilter, null);
  const displayed = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  
  const handleSendWA = (t: Task) => {
    if (t.isSelfMode) return;
    const num = t.personalDetails?.whatsappNumber || t.personalDetails?.mobileNumber;
    const waNum = formatWhatsAppNumber(num);
    if (!waNum) {
      alert('No valid mobile number found for this citizen.');
      return;
    }
    const waMessage = `പ്രിയപ്പെട്ട ${t.personalDetails.name},\n\nതാങ്കൾ പി.കെ നവാസ് എം.എൽ.എ യുടെ ഓഫീസുമായി ബന്ധപ്പെട്ടതിന് നന്ദി. നിങ്ങളുടെ അപേക്ഷ/പരാതി ഔദ്യോഗികമായി രേഖപ്പെടുത്തിയിട്ടുണ്ട്.\n\n*വിഷയം:* ${t.subject}\n*റഫറൻസ് ഐഡി:* ${t.id}\n\n\nസ്നേഹത്തോടെ,\nഎം.എൽ.എ ഓഫീസ്, താനൂർ.ഫോൺ: 9037032002`;
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(waMessage)}`, '_blank');
  };

  return (
    <div id="all-tasks-history-tab" className="bg-white rounded-[20px] shadow-sm border border-slate-200 p-8 space-y-6">
      <div className="flex gap-2 sm:gap-5">
        <div className="relative flex-1 min-w-0">
          <Search size={18} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search history by Subject, Name, ID, Mobile..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full pl-9 sm:pl-12 pr-4 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-[12px] sm:rounded-2xl font-medium outline-none focus:border-purple-500 text-slate-800 text-[11px] sm:text-base" 
          />
        </div>
        <div className="relative inline-block shrink-0">
          <div className="flex items-center justify-center w-[36px] h-[36px] sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 border border-slate-300 rounded-[12px] sm:rounded-2xl font-medium outline-none bg-white font-bold text-slate-700">
            <span className="sm:hidden"><Filter size={18} className={catFilter !== 'All' ? 'text-purple-600' : 'text-slate-500'}/></span>
            <span className="hidden sm:inline">{catFilter === 'All' ? 'All Categories' : catFilter}</span>
          </div>
          <select 
            value={catFilter} 
            onChange={e => setCatFilter(e.target.value)} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            <option value="All">All Categories</option>
            {sortedCategories.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="Direct Assignment">Direct Assignments</option>
          </select>
        </div>
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700 whitespace-nowrap">
          <thead className="bg-[#F4F7FB] border-y border-slate-200 text-slate-500 uppercase text-xs tracking-widest font-bold">
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
                  <span className="font-bold text-slate-800 max-w-[200px] truncate block">{t.subject || '-'}</span>
                  <span className="text-xs text-slate-500">{t.personalDetails.name} • {t.personalDetails.mobileNumber}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700">{t.category}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${t.status==='Completed'?'bg-green-100 text-green-700':t.status==='In Progress'?'bg-amber-100 text-amber-700':t.status==='Draft'?'bg-purple-100 text-purple-700':t.status==='Unsolved'?'bg-slate-200 text-slate-500':'bg-red-100 text-red-700'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex items-center gap-2">
                  <button 
                    onClick={() => triggerViewDetails(t)} 
                    title="Detailed Report" 
                    className="touch-target flex items-center justify-center text-slate-600 hover:bg-slate-200 p-2 rounded-lg transition-colors bg-slate-100"
                  >
                    <Eye size={16}/>
                  </button>
                  {!t.isSelfMode && (
                    <button 
                      onClick={() => handleSendWA(t)} 
                      title="Send WhatsApp Acknowledgement" 
                      className="touch-target flex items-center justify-center text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors bg-green-50"
                    >
                      <Send size={16}/>
                    </button>
                  )}
                  <button 
                    onClick={() => triggerPrint(t)} 
                    title="Print Slip" 
                    className="touch-target flex items-center justify-center text-purple-600 hover:bg-blue-100 p-2 rounded-lg transition-colors bg-blue-50"
                  >
                    <Printer size={16}/>
                  </button>
                  <button 
                    onClick={() => triggerDownloadPDF(t)} 
                    title="Download Slip PDF" 
                    className="touch-target flex items-center justify-center text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg transition-colors bg-indigo-50"
                  >
                    <Download size={16}/>
                  </button>
                  {(currentUser.role === 'admin' || t.status === 'Pending') && (
                    <button 
                      onClick={() => deleteTask(t.id)} 
                      title="Delete Input" 
                      className="touch-target flex items-center justify-center text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors bg-red-50"
                    >
                      <Trash2 size={16}/>
                    </button>
                  )}
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

      <div className="md:hidden grid grid-cols-1 gap-4">
        {displayed.map((t, idx) => (
          <div key={`${t.id}-${idx}-mobile`} className={`bg-white border rounded-[20px] p-4 shadow-sm ${t.isSelfMode ? 'border-yellow-200 bg-yellow-50/50' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-slate-800 text-sm">
                {t.id} 
                {t.isSelfMode && <span className="bg-yellow-300 text-yellow-900 px-1 py-0.5 rounded text-[10px] font-bold uppercase ml-2">Self</span>}
              </span>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.status==='Completed'?'bg-green-100 text-green-700':t.status==='In Progress'?'bg-amber-100 text-amber-700':t.status==='Draft'?'bg-purple-100 text-purple-700':t.status==='Unsolved'?'bg-slate-200 text-slate-500':'bg-red-100 text-red-700'}`}>
                {t.status}
              </span>
            </div>
            <p className="font-bold text-slate-800 text-sm mb-1">{t.subject || '-'}</p>
            <p className="text-xs text-slate-500 mb-3">{t.personalDetails.name} • {t.personalDetails.mobileNumber}</p>
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs text-slate-400 font-bold">{formatDate(t.createdAt)}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700 font-medium">{t.category}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => triggerViewDetails(t)} 
                title="Detailed Report" 
                className="flex-1 touch-target flex items-center justify-center text-slate-600 hover:bg-slate-200 p-2 rounded-lg transition-colors bg-slate-100"
              >
                <Eye size={16}/>
              </button>
              {!t.isSelfMode && (
                <button 
                  onClick={() => handleSendWA(t)} 
                  title="Send WhatsApp Acknowledgement" 
                  className="flex-1 touch-target flex items-center justify-center text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors bg-green-50"
                >
                  <Send size={16}/>
                </button>
              )}
              <button 
                onClick={() => triggerPrint(t)} 
                title="Print Slip" 
                className="flex-1 touch-target flex items-center justify-center text-purple-600 hover:bg-blue-100 p-2 rounded-lg transition-colors bg-blue-50"
              >
                <Printer size={16}/>
              </button>
              <button 
                onClick={() => triggerDownloadPDF(t)} 
                title="Download Slip PDF" 
                className="flex-1 touch-target flex items-center justify-center text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg transition-colors bg-indigo-50"
              >
                <Download size={16}/>
              </button>
              {(currentUser.role === 'admin' || t.status === 'Pending') && (
                <button 
                  onClick={() => deleteTask(t.id)} 
                  title="Delete Input" 
                  className="flex-1 touch-target flex items-center justify-center text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors bg-red-50"
                >
                  <Trash2 size={16}/>
                </button>
              )}
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <div className="text-center py-8 text-slate-500 bg-white rounded-[20px] border border-slate-200 shadow-sm">
            No records found.
          </div>
        )}
      </div>

      {visibleCount < filtered.length && (
        <div className="py-4 text-center">
          <button 
            onClick={() => setVisibleCount(v => v + 50)} 
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-sm transition-colors shadow-sm"
          >
            Load More Records ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
