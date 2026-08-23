import { useMemo } from 'react';
import { Task, GlobalFilters } from '../types';

export const useFilteredTasks = (
  allTasks: Task[],
  globalFilters: GlobalFilters,
  searchStr: string,
  catFilter: string | null = null,
  officerFilter: string | null = null
): Task[] => {
  return useMemo(() => {
    let result = allTasks;
    
    if (searchStr) {
      const exactMatch = result.find(t => t.id.toLowerCase() === searchStr.trim().toLowerCase());
      if (exactMatch) return [exactMatch];
    }
    
    if (globalFilters.status === 'Trash') {
      result = result.filter(t => t.isTrashed);
    } else {
      result = result.filter(t => !t.isTrashed);
      
      if (globalFilters.status === 'Active') {
        result = result.filter(t => t.status === 'Pending' || t.status === 'In Progress');
      } else if (globalFilters.status !== 'All') {
        result = result.filter(t => t.status === globalFilters.status);
      }
    }

    if (!searchStr) {
      if (globalFilters.dateRange === 'custom' || globalFilters.dateRange === 'custom_range') {
        if (globalFilters.customStartDate) {
          const start = new Date(globalFilters.customStartDate);
          start.setHours(0,0,0,0);
          result = result.filter(t => new Date(t.createdAt) >= start);
        }
        if (globalFilters.customEndDate) {
          const end = new Date(globalFilters.customEndDate);
          end.setHours(23,59,59,999);
          result = result.filter(t => new Date(t.createdAt) <= end);
        }
      } else if (globalFilters.dateRange !== 'all') {
        const cutoff = new Date();
        if (globalFilters.dateRange === 'today') {
          cutoff.setHours(0,0,0,0);
          result = result.filter(t => new Date(t.createdAt) >= cutoff);
        } else if (globalFilters.dateRange === 'yesterday') {
          const start = new Date();
          start.setDate(start.getDate() - 1);
          start.setHours(0,0,0,0);
          const end = new Date();
          end.setDate(end.getDate() - 1);
          end.setHours(23,59,59,999);
          result = result.filter(t => new Date(t.createdAt) >= start && new Date(t.createdAt) <= end);
        } else {
          if (globalFilters.dateRange === '7days') cutoff.setDate(cutoff.getDate() - 7);
          else if (globalFilters.dateRange === '1month') cutoff.setMonth(cutoff.getMonth() - 1);
          else if (globalFilters.dateRange === '6months') cutoff.setMonth(cutoff.getMonth() - 6);
          else if (globalFilters.dateRange === '1year') cutoff.setFullYear(cutoff.getFullYear() - 1);
          result = result.filter(t => new Date(t.createdAt) >= cutoff);
        }
      }
    }

    if (globalFilters.applicationMode === 'Self') {
      result = result.filter(t => t.isSelfMode);
    } else if (globalFilters.applicationMode === 'Citizen') {
      result = result.filter(t => !t.isSelfMode && t.taskType !== 'direct');
    }

    if (globalFilters.followUpFrequency && globalFilters.followUpFrequency !== 'All') {
      result = result.filter(t => t.followUpFrequency === globalFilters.followUpFrequency);
    }

    if (globalFilters.waSentStatus && globalFilters.waSentStatus !== 'All') {
      if (globalFilters.waSentStatus === 'Sent') {
        result = result.filter(t => t.isWASent);
      } else if (globalFilters.waSentStatus === 'Unsent') {
        result = result.filter(t => !t.isWASent);
      }
    }

    if (catFilter && catFilter !== 'All') {
      if (catFilter === 'Direct Assignment') result = result.filter(t => t.taskType === 'direct');
      else result = result.filter(t => t.category === catFilter);
    }
    
    if (officerFilter && officerFilter !== 'All') {
      result = result.filter(t => t.assignedTo.includes(officerFilter));
    }

    if (searchStr) {
      const searchWords = searchStr.toLowerCase().split(/\s+/).filter(w => w);
      result = result.filter(t => {
        const id = t.id.toLowerCase();
        const name = (t.personalDetails?.name || '').toLowerCase();
        const subject = (t.subject || '').toLowerCase();
        const mobile = t.personalDetails?.mobileNumber || '';
        const combinedText = `${id} ${name} ${subject} ${mobile}`;
        return searchWords.every(word => combinedText.includes(word));
      });
    }
    return [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allTasks, globalFilters, searchStr, catFilter, officerFilter]);
};
