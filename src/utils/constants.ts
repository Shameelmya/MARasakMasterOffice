import { User } from '../types';

export const fallbackConfig = {
  apiKey: "AIzaSyDlWgaEm8v3k0tmapwa9Q4Fbx-D0_YXD_A",
  authDomain: "ma-razak-master-office.firebaseapp.com",
  projectId: "ma-razak-master-office",
  storageBucket: "ma-razak-master-office.firebasestorage.app",
  messagingSenderId: "743153965338",
  appId: "1:743153965338:web:5212b3ab18dc57376a74a3"
};

export const DEFAULT_CATEGORIES = [
  'CMDRF',
  'NORKA Santhwana',
  'tgrantz',
  'Invitation',
  'Road Complaint',
  'Help Request',
  'Personal Complaint',
  'Confidential Info'
];

export const DEFAULT_DESIGNATIONS = [
  'Citizen',
  'Panchayath President',
  'Panchayath Secretary',
  'Ward Member',
  'Asha Worker',
  'Political Leader',
  'Others'
];

export const INPUT_TYPES = [
  'Letter',
  'Phone Call',
  'Direct Visit',
  'WhatsApp Message',
  'Email',
  'Others'
];

export const LOCAL_BODIES = [
  'Chathamangalam Panchayath',
  'Kunnamangalam Panchayath',
  'Mavoor Panchayath',
  'Olavanna Panchayath',
  'Perumanna Panchayath',
  'Peruvayal Panchayath',
  'Other'
];

export const EXT_LINKS: Record<string, string> = {
  'CMDRF': 'https://donation.cmdrf.kerala.gov.in/',
  'NORKA Santhwana': 'https://sso.norkaroots.kerala.gov.in/login?ref=main&client_id=99dd0c83-dad4-4cb7-90e4-19e9f1ffe7e5',
  'tgrantz': 'https://tgrantz.kerala.gov.in/'
};

export const DEFAULT_USERS: User[] = [
  { id: 'admin', name: 'M. A. Razak Master (MLA)', role: 'admin', pass: 'Master@2026', enabled: true, canInput: true, canSeeReports: true, canSeeGlobal: true, canSeeGlobalOverview: true, canSeeDraftsView: true, canEditGlobalOverview: true, canEditOwnInputs: true, canReassign: true, canGenerateUpdationReport: true, canSeeRecentUpdations: true, phone: '', whatsapp: '' }
];

export const ISLAMIC_QUOTES = [
  {
    arabic: "إِنَّ اللَّهَ يَأْمُرُكُمْ أَنْ تُؤَدُّوا الْأَمَانَاتِ إِلَىٰ أَهْلِهَا وَإِذَا حَكَمْتُمْ بَيْنَ النَّاسِ أَنْ تَحْكُمُوا بِالْعَدْلِ ۚ",
    malayalam: "തീർച്ചയായും അമാനത്തുകൾ (ബാധ്യതകൾ) അതിൻ്റെ അവകാശികൾക്ക് കൊടുത്തു വീട്ടണമെന്നും, ജനങ്ങൾക്കിടയിൽ തീർപ്പുകൽപ്പിക്കുകയാണെങ്കിൽ നീതിയോടെ വേണം തീർപ്പുകൽപ്പിക്കാനെന്നും അല്ലാഹു നിങ്ങളോട് കൽപ്പിക്കുന്നു. (ഖുർആൻ 4:58)"
  },
  {
    arabic: "اعْدِلُوا هُوَ أَقْرَبُ لِلتَّقْوَىٰ ۖ",
    malayalam: "നിങ്ങൾ നീതി പാലിക്കുക; അതാണ് ഭക്തിയോട് ഏറ്റവും അടുത്തത്. (ഖുർആൻ 5:8)"
  },
  {
    arabic: "خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ",
    malayalam: "ജനങ്ങളിൽ ഏറ്റവും ഉത്തമൻ ജനങ്ങൾക്ക് ഏറ്റവും ഉപകാരം ചെയ്യുന്നവനാണ്. (ഹദീസ്)"
  }
];
