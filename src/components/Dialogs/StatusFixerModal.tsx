import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Task } from '../../types';

interface StatusFixerModalProps {
  tasks: Task[];
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onClose: () => void;
}

export function StatusFixerModal({ tasks, updateTask, onClose }: StatusFixerModalProps) {
  const [search, setSearch] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, {status?: string, freq?: string}>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredTasks = tasks.filter(t => 
    t.id.toLowerCase().includes(search.toLowerCase()) || 
    t.subject.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const numA = parseInt(a.id.match(/\d+$/)?.[0] || '0', 10);
    const numB = parseInt(b.id.match(/\d+$/)?.[0] || '0', 10);
    return numB - numA;
  });

  const handleStatusChange = (taskId: string, newStatus: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], status: newStatus }
    }));
  };

  const handleFrequencyChange = (taskId: string, newFreq: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], freq: newFreq }
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    for (const taskId of Object.keys(pendingChanges)) {
      const updates: Partial<Task> = {};
      if (pendingChanges[taskId].status) {
        updates.status = pendingChanges[taskId].status;
        if (updates.status === 'Local Work') {
          updates.assignedTo = [];
          updates.officerStatuses = {};
        }
      }
      if (pendingChanges[taskId].freq) updates.followUpFrequency = pendingChanges[taskId].freq;
      if (Object.keys(updates).length > 0) {
        await updateTask(taskId, updates);
      }
    }
    setPendingChanges({});
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center sm:p-5">
      <div className="bg-white rounded-t-3xl md:rounded-[20px] w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] flex flex-col shadow-md animate-in slide-in-from-bottom md:zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-[#F4F7FB] rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800">Quick Status</h2>
          <div className="flex items-center gap-5">
            {Object.keys(pendingChanges).length > 0 && (
              <button 
                onClick={handleSaveAll} 
                disabled={isSaving} 
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow transition-all"
              >
                {isSaving ? 'Saving...' : `Save ${Object.keys(pendingChanges).length} Changes`}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <X size={20}/>
            </button>
          </div>
        </div>
        
        <div className="p-5 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input 
              type="text" 
              placeholder="Search by ID or Subject..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 custom-scrollbar safe-pb">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 text-xs font-bold text-slate-500 uppercase w-32">Task ID</th>
                <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Subject</th>
                <th className="pb-3 text-xs font-bold text-slate-500 uppercase w-48">Status</th>
                <th className="pb-3 text-xs font-bold text-slate-500 uppercase">Follow-up Freq</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(t => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-[#F4F7FB]">
                  <td className="py-3 text-xs font-bold text-slate-600">{t.id}</td>
                  <td className="py-3 text-[11px] font-bold text-slate-800 pr-4 leading-tight">{t.subject}</td>
                  <td className="py-3 pr-4">
                    <select 
                      value={pendingChanges[t.id]?.status || t.status || 'Pending'} 
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className="px-2 py-1 w-full bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="D Finished">D Finished</option>
                      <option value="Draft">Draft</option>
                      <option value="Local Work">Local Work</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <select 
                      value={pendingChanges[t.id]?.freq || t.followUpFrequency || 'None'} 
                      onChange={(e) => handleFrequencyChange(t.id, e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                    >
                      <option value="None">None</option>
                      <option value="1W">1 Week</option>
                      <option value="2W">2 Weeks</option>
                      <option value="1M">1 Month</option>
                      <option value="2M">2 Months</option>
                      <option value="3M">3 Months</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTasks.length === 0 && (
            <div className="text-center py-10 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">No tasks found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
