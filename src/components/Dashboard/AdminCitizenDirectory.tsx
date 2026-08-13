import { useState, useMemo } from 'react';
import { Users, List, Printer, Download, Search, Phone, MessageSquare, Filter } from 'lucide-react';
import { Task, PersonalDetails } from '../../types';
import { formatDate } from '../../utils/formatters';

interface AdminCitizenDirectoryProps {
  tasks: Task[];
  triggerDownloadPDF: (citizens: any[]) => void;
  onCitizenClick?: (phone: string) => void;
}

interface CitizenEntry extends PersonalDetails {
  visits: number;
  lastVisit: string;
}

export function AdminCitizenDirectory({
  tasks,
  triggerCitizenPrint,
  triggerDownloadPDF,
  onCitizenClick
}: AdminCitizenDirectoryProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('visits');
  const [visibleCount, setVisibleCount] = useState(50);
  
  const citizensData = useMemo(() => {
    const map = new Map<string, CitizenEntry>();
    tasks.forEach(t => {
      if (t.taskType === 'direct' || t.isSelfMode) return;
      const phone = t.personalDetails?.mobileNumber;
      if (!phone) return;
      
      if (!map.has(phone)) {
        map.set(phone, { 
          ...t.personalDetails, 
          visits: 1, 
          lastVisit: t.createdAt 
        });
      } else {
        const ex = map.get(phone)!;
        ex.visits += 1;
        if (new Date(t.createdAt).getTime() > new Date(ex.lastVisit).getTime()) {
          ex.lastVisit = t.createdAt;
        }
      }
    });

    return Array.from(map.values())
      .sort((a, b) => {
        if (sortBy === 'visits') return b.visits - a.visits;
        if (sortBy === 'recent') return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
        return a.name.localeCompare(b.name);
      })
      .filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.mobileNumber.includes(search) || 
        (c.place || '').toLowerCase().includes(search.toLowerCase())
      );
  }, [tasks, search, sortBy]);

  const displayed = useMemo(() => citizensData.slice(0, visibleCount), [citizensData, visibleCount]);

  const handleDownloadCSV = () => {
    const headers = [
      'Name', 'Designation', 'Gender', 'Mobile Number', 'WhatsApp', 
      'House Name', 'Place', 'Post Office', 'PIN Code', 'Local Body', 
      'Ward', 'Total Visits', 'Last Visit'
    ];
    const rows = citizensData.map(c => [
      c.name, 
      c.designation || '-', 
      c.gender || '-', 
      c.mobileNumber, 
      c.whatsappNumber || '-', 
      c.houseName || '-', 
      c.place || '-', 
      c.postOffice || '-', 
      c.pinCode || '-', 
      (c.localBody || '-'), 
      c.wardNumber || '-', 
      c.visits, 
      formatDate(c.lastVisit)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(f => `"${f}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Citizen_Directory_${new Date().toISOString()}.csv`);
    link.click();
  };

  const formatWhatsAppNo = (phone: string | null | undefined): string => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  };

  return (
    <div id="admin-citizen-directory" className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-teal-600"/> Citizen Visit Directory
          </h2>
          <p className="text-slate-500 font-medium mt-1">Track frequency of citizen visits based on registered mobile numbers.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleDownloadCSV} 
            className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors border border-teal-200"
          >
            <List size={16}/> Export CSV
          </button>
          <button 
            onClick={() => triggerCitizenPrint(citizensData)} 
            className="bg-purple-600 text-white hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300 shadow-sm px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Printer size={16}/> Print
          </button>
          <button 
            onClick={() => triggerDownloadPDF(citizensData)} 
            className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Download size={16}/> PDF
          </button>
        </div>
      </div>
      <div className="flex gap-2 sm:gap-5 mb-4 sm:mb-6 bg-[#F4F7FB] p-3 sm:p-5 rounded-[16px] sm:rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by Name, Mobile, Place..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 bg-white border border-slate-200 rounded-[10px] sm:rounded-lg text-sm sm:text-base font-medium outline-none focus:border-teal-500 text-slate-800" 
          />
        </div>
        <div className="relative shrink-0 flex items-center bg-white border border-slate-200 rounded-[10px] sm:rounded-lg focus-within:border-teal-500 overflow-hidden">
          <div className="pl-3 pr-1 py-2 text-slate-500 pointer-events-none">
            <Filter size={18} />
          </div>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)} 
            className="bg-transparent pl-1 pr-3 py-2 font-bold text-[11px] sm:text-sm text-slate-700 outline-none cursor-pointer appearance-none text-center"
            title="Sort By"
          >
            <option value="visits">Visits</option>
            <option value="recent">Recent</option>
            <option value="name">A-Z</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700 whitespace-nowrap">
          <thead className="bg-slate-100 border-y border-slate-200 text-slate-500 uppercase text-xs tracking-widest font-bold">
            <tr>
              <th className="px-4 py-3">Citizen Name & Desig.</th>
              <th className="px-4 py-3">Contact Info</th>
              <th className="px-4 py-3">Location / Address</th>
              <th className="px-4 py-3 text-center">Total Visits</th>
              <th className="px-4 py-3">Last Visit Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayed.map((c, i) => (
              <tr key={i} className="hover:bg-[#F4F7FB]">
                <td className="px-4 py-3">
                  <span className="font-bold text-slate-800 text-base">{c.name}</span>
                  {c.gender && <span className="text-[10px] text-slate-500 ml-2">({c.gender})</span>}
                  {c.designation && (
                    <span className="block text-xs text-teal-600 font-bold uppercase tracking-wider">{c.designation}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-600">
                  <span className="flex items-center gap-1.5"><Phone size={12}/> {c.mobileNumber}</span>
                  {c.whatsappNumber && (
                    <span className="flex items-center gap-1.5 mt-1 text-green-600">
                      <MessageSquare size={12}/> {c.whatsappNumber}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-slate-500">
                  <span className="block text-slate-700 font-bold">
                    {c.place || '-'}, PO: {c.postOffice || '-'}, PIN: {c.pinCode || '-'}, {c.localBody || '-'}
                  </span>
                  {c.houseName && <span>{c.houseName} </span>} 
                  {c.wardNumber && <span>(Ward: {c.wardNumber})</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <button 
                    onClick={() => onCitizenClick?.(c.mobileNumber)}
                    className="bg-purple-600 hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300 text-white shadow-sm hover:scale-105 active:scale-95 transition-all text-white font-bold px-3 py-1 rounded-full cursor-pointer transition-all duration-300 hover:bg-slate-50 shadow-sm"
                    title="View inputs by this citizen"
                  >
                    {c.visits}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs font-bold text-slate-500">{formatDate(c.lastVisit)}</td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-500 font-medium">
                  No citizens match search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {visibleCount < citizensData.length && (
          <div className="py-4 text-center">
            <button 
              onClick={() => setVisibleCount(v => v + 50)} 
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-sm transition-colors shadow-sm"
            >
              Load More Directory ({citizensData.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
