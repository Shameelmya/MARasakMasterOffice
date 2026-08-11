import { useState } from 'react';
import { X, FileOutput, Printer, Download } from 'lucide-react';
import { ReportConfig } from '../Prints/PrintComponents';
import { User, UpdationReportConfig } from '../../types';

interface ReportConfigModalProps {
  onClose: () => void;
  onGenerate: (config: ReportConfig) => void;
  triggerDownloadPDF: (config: ReportConfig) => void;
  loadArchive: () => Promise<void>;
}

export function ReportConfigModal({ onClose, onGenerate, triggerDownloadPDF, loadArchive }: ReportConfigModalProps) {
  const [range, setRange] = useState('1week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleGenerate = async (isDownload: boolean) => {
    if (range !== '1week') {
      await loadArchive();
    }
    const conf: ReportConfig = { range, customStart, customEnd };
    if (isDownload) triggerDownloadPDF(conf);
    else onGenerate(conf);
  };

  return (
    <div id="report-config-modal" className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center sm:p-5">
      <div className="bg-white rounded-t-3xl md:rounded-[20px] shadow-md w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95">
        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2"><FileOutput size={20}/> Generate Master Report</h3>
          <button onClick={onClose} className="text-white hover:text-slate-350 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Time Duration</label>
            <select 
              value={range} 
              onChange={e => setRange(e.target.value)} 
              className="w-full px-4 py-3 bg-[#F4F7FB] border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="1week">Last 1 Week</option>
              <option value="1month">Last 1 Month</option>
              <option value="6months">Last 6 Months</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
          {range === 'custom' && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">From</label>
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)} 
                  className="w-full border p-2 rounded-lg font-bold text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">To</label>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)} 
                  className="w-full border p-2 rounded-lg font-bold text-sm bg-white"
                />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button 
              onClick={() => handleGenerate(false)} 
              className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-2xl hover:bg-purple-700 flex items-center justify-center gap-2 shadow transition-colors"
            >
              <Printer size={18}/> Print
            </button>
            <button 
              onClick={() => handleGenerate(true)} 
              className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-2xl hover:bg-black flex items-center justify-center gap-2 shadow transition-colors"
            >
              <Download size={18}/> PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OfficerReportConfigModalProps {
  officer: User;
  onClose: () => void;
  onGenerate: (config: ReportConfig) => void;
  triggerDownloadPDF: (config: ReportConfig) => void;
  loadArchive: () => Promise<void>;
}

export function OfficerReportConfigModal({ officer, onClose, onGenerate, triggerDownloadPDF, loadArchive }: OfficerReportConfigModalProps) {
  const [range, setRange] = useState('1week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleGenerate = async (isDownload: boolean) => {
    if (range !== '1week') {
      await loadArchive();
    }
    const conf: ReportConfig = { officer, range, customStart, customEnd };
    if (isDownload) triggerDownloadPDF(conf);
    else onGenerate(conf);
  };

  return (
    <div id="officer-report-config-modal" className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center sm:p-5">
      <div className="bg-white rounded-t-3xl md:rounded-[20px] shadow-md w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95">
        <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2"><FileOutput size={20}/> Officer Report: {officer.name}</h3>
          <button onClick={onClose} className="text-white hover:text-slate-350 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-8 space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Time Duration</label>
            <select 
              value={range} 
              onChange={e => setRange(e.target.value)} 
              className="w-full px-4 py-3 bg-[#F4F7FB] border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="1week">Last 1 Week</option>
              <option value="1month">Last 1 Month</option>
              <option value="6months">Last 6 Months</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
          {range === 'custom' && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">From</label>
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)} 
                  className="w-full border p-2 rounded-lg font-bold text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">To</label>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)} 
                  className="w-full border p-2 rounded-lg font-bold text-sm bg-white"
                />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button 
              onClick={() => handleGenerate(false)} 
              className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-2xl hover:bg-purple-700 flex items-center justify-center gap-2 shadow transition-colors"
            >
              <Printer size={18}/> Print
            </button>
            <button 
              onClick={() => handleGenerate(true)} 
              className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-2xl hover:bg-black flex items-center justify-center gap-2 shadow transition-colors"
            >
              <Download size={18}/> PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UpdationReportConfigModalProps {
  onClose: () => void;
  onGenerate: (config: UpdationReportConfig) => void;
  users: User[];
}

export function UpdationReportConfigModal({ onClose, onGenerate, users }: UpdationReportConfigModalProps) {
  const [status, setStatus] = useState('Active');
  const [dateRange, setDateRange] = useState('7days');
  const [assignedOfficer, setAssignedOfficer] = useState('All');
  const [addUpdations, setAddUpdations] = useState(true);
  const [maxUpdations, setMaxUpdations] = useState(3);
  const [addDescriptions, setAddDescriptions] = useState(true);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [followUpFrequency, setFollowUpFrequency] = useState('All');

  const handleGenerate = () => {
    onGenerate({
      status,
      dateRange,
      assignedOfficer,
      addUpdations,
      maxUpdations,
      addDescriptions,
      customStartDate,
      customEndDate,
      followUpFrequency
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center sm:p-5">
      <div className="bg-white rounded-t-3xl md:rounded-[20px] shadow-md w-full max-w-md overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 max-h-[95vh] overflow-y-auto">
        <div className="bg-emerald-900 p-5 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center gap-2"><FileOutput size={20}/> Updation Report Configuration</h3>
          <button onClick={onClose} className="text-white hover:text-slate-350 transition-colors"><X size={20}/></button>
        </div>
        <div className="p-8 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Status</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)} 
              className="w-full px-3 py-2 bg-[#F4F7FB] border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Active">Active Actions</option>
              <option value="Completed">Completed</option>
              <option value="Partially Completed">Partially Completed</option>
              <option value="Draft">Drafts</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Unsolved">Unsolved</option>
              <option value="Local Work">Local Work</option>
              <option value="All">All Statuses</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Time Period</label>
            <select 
              value={dateRange} 
              onChange={e => setDateRange(e.target.value)} 
              className="w-full px-3 py-2 bg-[#F4F7FB] border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="1month">Last 1 Month</option>
              <option value="6months">Last 6 Months</option>
              <option value="1year">Last 1 Year</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">From Date</label>
                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full px-3 py-2 bg-[#F4F7FB] border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">To Date</label>
                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full px-3 py-2 bg-[#F4F7FB] border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Assigned Officer</label>
            <select 
              value={assignedOfficer} 
              onChange={e => setAssignedOfficer(e.target.value)} 
              className="w-full px-3 py-2 bg-[#F4F7FB] border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Officers</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Follow-up Freq</label>
              <select 
                value={followUpFrequency} 
                onChange={e => setFollowUpFrequency(e.target.value)} 
                className="w-full px-3 py-2 bg-[#F4F7FB] border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">All Follow-ups</option>
                <option value="1W">1 Week</option>
                <option value="2W">2 Weeks</option>
                <option value="1M">1 Month</option>
                <option value="2M">2 Months</option>
                <option value="3M">3 Months</option>
              </select>
            </div>
          </div>
          {status !== 'Local Work' && (
            <div className="flex gap-5 items-center justify-between border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="checkbox" 
                  id="addUpdationsCheck" 
                  checked={addUpdations} 
                  onChange={e => setAddUpdations(e.target.checked)} 
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="addUpdationsCheck" className="text-sm font-bold text-slate-700 cursor-pointer transition-all duration-300 hover:bg-slate-50">Add Updations</label>
              </div>
              {addUpdations && (
              <div className="pl-6">
                <select 
                  value={maxUpdations} 
                  onChange={e => setMaxUpdations(Number(e.target.value))} 
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded font-bold text-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={3}>Up to 3 updations</option>
                  <option value={2}>Up to 2 updations</option>
                  <option value={1}>Up to 1 updation</option>
                </select>
              </div>
            )}
            </div>
          )}

          <div className="bg-[#F4F7FB] p-3 rounded-lg border border-slate-200 mt-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="addDescriptionsCheck" 
                checked={addDescriptions} 
                onChange={e => setAddDescriptions(e.target.checked)} 
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="addDescriptionsCheck" className="text-sm font-bold text-slate-700 cursor-pointer transition-all duration-300 hover:bg-slate-50">Add Descriptions</label>
            </div>
          </div>

          <div className="flex pt-4">
            <button 
              onClick={handleGenerate} 
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-2xl hover:bg-emerald-700 flex items-center justify-center gap-2 shadow transition-colors"
            >
              <Download size={18}/> Generate Report PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

