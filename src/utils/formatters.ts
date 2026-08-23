import { Task } from '../types';

export const generateId = (tasksList: Task[] = []): string => {
  const tanIds = tasksList
    .map(t => t.id)
    .filter(id => /^KGM30\d+$/.test(id))
    .map(id => parseInt(id.replace('KGM30', ''), 10));
  if (tanIds.length === 0) return 'KGM30001';
  const maxId = Math.max(...tanIds);
  const nextId = maxId + 1;
  const paddedNum = String(nextId).padStart(3, '0');
  return `KGM30${paddedNum}`;
};

export const generateUid = (): string => Math.random().toString(36).substring(2, 9);

export const getNow = (): string => new Date().toISOString();

export const getNextDayISO = (): string => new Date(Date.now() + 86400000).toISOString();

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatMalayalamDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const months = ['ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മെയ്', 'ജൂൺ', 'ജൂലൈ', 'ഓഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ'];
  const days = ['ഞായറാഴ്ച', 'തിങ്കളാഴ്ച', 'ചൊവ്വാഴ്ച', 'ബുധനാഴ്ച', 'വ്യാഴാഴ്ച', 'വെള്ളിയാഴ്ച', 'ശനിയാഴ്ച'];
  return `${date.getFullYear()} ${months[date.getMonth()]} ${date.getDate()} ${days[date.getDay()]}`;
};

export const formatLetterSendingDate = (): string => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatWhatsAppNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
};
