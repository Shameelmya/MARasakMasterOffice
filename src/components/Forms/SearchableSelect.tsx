import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onAddNewClick?: () => void;
  addLabel?: string;
}

export const SearchableSelect = React.memo(({
  options,
  value,
  onChange,
  placeholder = "Select...",
  onAddNewClick,
  addLabel = "Add Custom"
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const sortedAndFiltered = useMemo(() => {
    return options
      .filter(c => c.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  }, [options, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl font-semibold text-slate-800 cursor-pointer transition-all hover:bg-white focus:bg-white hover:border-purple-500 flex justify-between items-center text-sm"
      >
        <span className={value ? "text-slate-800" : "text-slate-400 font-normal"}>
          {value || placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-600" />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100">
          <div className="p-2 border-b border-slate-100 bg-[#F4F7FB]">
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search..." 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold outline-none focus:border-purple-500 bg-white" 
              onClick={e => e.stopPropagation()} 
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {sortedAndFiltered.map(c => (
              <div 
                key={c} 
                onClick={() => { 
                  onChange(c); 
                  setIsOpen(false); 
                  setSearch(''); 
                }} 
                className={`px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center ${value === c ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <span>{c}</span>
                {value === c && <Check size={14} className="text-purple-600" />}
              </div>
            ))}
            {sortedAndFiltered.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-400 font-medium text-center">
                No results found
              </div>
            )}
          </div>
          {onAddNewClick && (
            <div className="p-2 border-t border-slate-100 bg-[#F4F7FB] flex justify-center">
              <button 
                type="button" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onAddNewClick(); 
                  setIsOpen(false); 
                }} 
                className="w-full text-xs font-bold text-purple-600 flex items-center justify-center gap-1 hover:text-blue-800 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Plus size={14}/> {addLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SearchableSelect.displayName = 'SearchableSelect';
