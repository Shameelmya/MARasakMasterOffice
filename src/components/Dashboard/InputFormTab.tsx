import React, { useState, FormEvent, createRef } from 'react';
import { 
  Plus, Filter, FileText, User, ExternalLink, CalendarPlus, Users, 
  Clock, Send, Check, CheckCircle, Printer, Download, MessageSquare, X 
} from 'lucide-react';
import { Task, User as UserType, GlobalFilters, Attachment } from '../../types';
import { SearchableCategorySelect } from '../Forms/SearchableCategorySelect';
import { SearchableSelect } from '../Forms/SearchableSelect';
import { FileUploadButton } from '../Shared/FileUploadButton';
import { deleteFromGoogleDrive } from '../../utils/fileUpload';
import { 
  generateId, generateUid, getNow, getNextDayISO, 
  formatDate, formatTime, formatWhatsAppNumber 
} from '../../utils/formatters';
import { EXT_LINKS, INPUT_TYPES } from '../../utils/constants';
import { WARD_DATA, LOCAL_BODIES as WARD_LOCAL_BODIES, WARD_TO_LOCAL_BODY } from '../../data/wardsData';

interface InputFormTabProps {
  tasks: Task[];
  addTask: (newTask: Task) => Promise<void>;
  categories: string[];
  designations: string[];
  inputTypes: string[];
  addCategory: (cat: string) => void;
  addDesignation: (desig: string) => void;
  addInputType: (type: string) => void;
  users: UserType[];
  triggerPrint: (task: Task) => void;
  triggerDownloadPDF: (task: Task) => void;
  creator: UserType;
}

interface FormState {
  isSelfMode: boolean;
  types: string[];
  category: string;
  newCategory: string;
  programDate: string;
  subject: string;
  customDeadline: string;
  attachments: (string | Attachment)[];
  personal: {
    name: string;
    designation: string;
    newDesignation: string;
    gender: string;
    referralPerson: string;
    mobileNumber: string;
    whatsappNumber: string;
    houseName: string;
    place: string;
    postOffice: string;
    pinCode: string;
    localBody: string;
    otherLocalBody: string;
    wardNumber: string;
    otherWard: string;
    otherGender: string;
  };
  description: string;
  assignedTo: string[];
  isLocalWork?: boolean;
  newInputType: string;
}

export function InputFormTab({
  tasks,
  addTask,
  categories,
  designations,
  inputTypes,
  addCategory,
  addDesignation,
  addInputType,
  users,
  triggerPrint,
  triggerDownloadPDF,
  creator
}: InputFormTabProps) {
  const initForm: FormState = {
    isSelfMode: false,
    isLocalWork: false,
    types: ['Letter'],
    category: '',
    newCategory: '',
    programDate: '',
    subject: '',
    customDeadline: '',
    attachments: [],
    personal: {
      name: '',
      designation: '',
      newDesignation: '',
      gender: '',
      referralPerson: '',
      mobileNumber: '',
      whatsappNumber: '',
      houseName: '',
      place: '',
      postOffice: '',
      pinCode: '',
      localBody: '',
      otherLocalBody: '',
      wardNumber: '',
      otherWard: '',
      otherGender: ''
    },
    description: '',
    assignedTo: [],
    newInputType: ''
  };

  const [form, setForm] = useState<FormState>(initForm);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewDesig, setShowNewDesig] = useState(false);
  const [showNewLocalBody, setShowNewLocalBody] = useState(false);
  const [showNewWard, setShowNewWard] = useState(false);
  const [showNewGender, setShowNewGender] = useState(false);
  const [showNewInputType, setShowNewInputType] = useState(false);
  const [sendWaMsg, setSendWaMsg] = useState(true);
  const [sendWaMsgSame, setSendWaMsgSame] = useState(false);
  const [lastTask, setLastTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFilledMessage, setAutoFilledMessage] = useState('');
  const [formError, setFormError] = useState({ field: '', msg: '' });
  const [addLinkLater, setAddLinkLater] = useState(false);

  const isInvitation = form.category === 'Invitation';

  const scrollToField = (id: string, msg: string) => {
    setFormError({ field: id, msg });
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-red-400', 'rounded-2xl', 'transition-all');
      setTimeout(() => el.classList.remove('ring-2', 'ring-red-400', 'rounded-2xl'), 3000);
    }
    setTimeout(() => setFormError({ field: '', msg: '' }), 5000);
  };

  const handleWardChange = (val: string) => {
    const updates: any = { wardNumber: val };
    if (WARD_TO_LOCAL_BODY[val]) {
      updates.localBody = WARD_TO_LOCAL_BODY[val];
    }
    setForm(f => ({
      ...f,
      personal: { ...f.personal, ...updates }
    }));
  };

  const handlePersChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = {
        ...prev,
        personal: { ...prev.personal, [name]: value }
      };
      if (name === 'mobileNumber' && sendWaMsgSame) {
        updated.personal.whatsappNumber = value;
      }
      return updated;
    });
  };

  const handleMobileBlur = () => {
    if (form.isSelfMode) return;
    const clean = form.personal.mobileNumber.replace(/\D/g, '');
    if (clean.length >= 10) {
      const matchingTasks = [...tasks]
        .filter(t => t.personalDetails?.mobileNumber?.replace(/\D/g, '') === clean)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      if (matchingTasks.length > 0) {
        const match = matchingTasks[matchingTasks.length - 1];
        
        setForm(f => {
          const aggregated = { ...f.personal };
          for (const t of matchingTasks) {
            if (t.personalDetails.name) aggregated.name = t.personalDetails.name;
            if (t.personalDetails.designation) aggregated.designation = t.personalDetails.designation;
            if (t.personalDetails.gender) aggregated.gender = t.personalDetails.gender;
            if (t.personalDetails.houseName) aggregated.houseName = t.personalDetails.houseName;
            if (t.personalDetails.place) aggregated.place = t.personalDetails.place;
            if (t.personalDetails.postOffice) aggregated.postOffice = t.personalDetails.postOffice;
            if (t.personalDetails.pinCode) aggregated.pinCode = t.personalDetails.pinCode;
            if (t.personalDetails.localBody) aggregated.localBody = t.personalDetails.localBody;
            if (t.personalDetails.wardNumber) aggregated.wardNumber = t.personalDetails.wardNumber;
            if (t.personalDetails.whatsappNumber) aggregated.whatsappNumber = t.personalDetails.whatsappNumber;
          }
          return {
            ...f,
            personal: aggregated
          };
        });
        setAutoFilledMessage(`✓ Data loaded from previous visit on ${formatDate(match.createdAt)}`);
        setTimeout(() => setAutoFilledMessage(''), 5000);
      }
    }
  };
  
  const handleAddCustomCategory = async () => {
    if (form.newCategory && !categories.includes(form.newCategory)) {
      await addCategory(form.newCategory);
      setForm(f => ({ ...f, category: form.newCategory }));
      setShowNewCat(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError({ field: '', msg: '' });
    if(isSubmitting) return;

    if (!form.isSelfMode && form.types.length === 0) {
      return scrollToField('field-types', 'Please select an Input Type.');
    }

    let finalCat = form.category;
    if (showNewCat && form.newCategory) {
      if (!categories.includes(form.newCategory)) {
        await addCategory(form.newCategory);
      }
      finalCat = form.newCategory;
    }
    if (!finalCat) {
      return scrollToField('field-category', 'Please select a Category.');
    }

    if (!form.isSelfMode) {
      if (!form.personal.mobileNumber) return scrollToField('field-mobileNumber', 'Mobile Number is mandatory.');
      if (!form.personal.name) return scrollToField('field-name', 'Full Name is mandatory.');
    }

    if (!form.subject.trim()) {
      return scrollToField('field-subject', 'Subject is mandatory.');
    }

    if (form.attachments.length === 0 && !addLinkLater) {
      return scrollToField('field-attachments', 'Please attach a document or link, or check the box to add it later.');
    }

    const finalLocalBody = showNewLocalBody ? form.personal.otherLocalBody : form.personal.localBody;
    const finalWard = showNewWard ? form.personal.otherWard : form.personal.wardNumber;
    const finalGender = showNewGender ? form.personal.otherGender : form.personal.gender;
    const finalTypes = showNewInputType ? [form.newInputType] : form.types;
    
    let finalAssignedTo = form.assignedTo;
    if(isInvitation) {
      finalAssignedTo = ['admin'];
    }
    if (form.isLocalWork) {
      finalAssignedTo = [];
    } else if (finalAssignedTo.length === 0) {
      return scrollToField('field-assignedTo', 'Please assign this to at least one officer.');
    }

    let finalDesig = form.personal.designation;
    if (showNewDesig && form.personal.newDesignation) {
      if (!designations.includes(form.personal.newDesignation)) {
        await addDesignation(form.personal.newDesignation);
      }
      finalDesig = form.personal.newDesignation;
    }

    setIsSubmitting(true);
    const taskId = generateId(tasks);
    const finalPersonalDetails = { 
      ...form.personal, 
      designation: finalDesig, 
      localBody: finalLocalBody,
      wardNumber: finalWard
    };
    
    delete (finalPersonalDetails as any).newDesignation;
    delete (finalPersonalDetails as any).otherLocalBody;
    delete (finalPersonalDetails as any).otherWard;
    delete (finalPersonalDetails as any).otherGender;

    if (form.isSelfMode) {
      finalPersonalDetails.name = 'Self Application';
      finalPersonalDetails.mobileNumber = 'N/A';
    }

    const defaultDeadline = getNextDayISO();
    const finalDeadline = form.customDeadline ? new Date(form.customDeadline).toISOString() : defaultDeadline;
    const deadlineMsg = form.customDeadline 
      ? `Custom deadline set to ${formatDate(finalDeadline)} ${formatTime(finalDeadline)}` 
      : `Default deadline set to ${formatDate(defaultDeadline)} ${formatTime(defaultDeadline)}`;
    
    const attachmentsData = form.attachments.map((att, idx) => {
      if (typeof att === 'string') {
        let finalUrl = att.trim();
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
          finalUrl = 'https://' + finalUrl;
        }
        return { name: `Attached Link ${idx + 1}`, url: finalUrl, type: 'link' };
      }
      return att;
    });

    const newTask: Task = {
      id: taskId,
      types: finalTypes,
      category: finalCat,
      personalDetails: { ...finalPersonalDetails, gender: finalGender },
      taskType: 'input',
      isSelfMode: form.isSelfMode,
      subject: form.subject,
      description: form.description,
      assignedTo: finalAssignedTo,
      deadline: finalDeadline,
      programDate: isInvitation ? form.programDate : null,
      status: form.isLocalWork ? 'Local Work' : 'Pending',
      priority: 'Medium',
      officerStatuses: {},
      isSignedByMLA: false,
      attachment: null,
      attachments: attachmentsData,
      createdAt: getNow(),
      createdBy: creator.name,
      createdByUid: creator.id,
      timeline: [{
        id: generateUid(),
        type: 'created',
        time: getNow(),
        by: creator.name,
        text: `Input Registered. ${deadlineMsg}`
      }]
    };

    await addTask(newTask);
    setIsSubmitting(false);
    setLastTask(newTask);

    if (!form.isSelfMode && sendWaMsg && (finalPersonalDetails.whatsappNumber || finalPersonalDetails.mobileNumber)) {
      const waNum = formatWhatsAppNumber(finalPersonalDetails.whatsappNumber || finalPersonalDetails.mobileNumber);
      if (waNum) {
        const waMessage = `പ്രിയപ്പെട്ട ${finalPersonalDetails.name},\n\nതാങ്കൾ എം.എ. റസാഖ് മാസ്റ്റർ എം.എൽ.എ യുടെ ഓഫീസുമായി ബന്ധപ്പെട്ടതിന് നന്ദി. നിങ്ങളുടെ അപേക്ഷ/പരാതി ഔദ്യോഗികമായി രേഖപ്പെടുത്തിയിട്ടുണ്ട്.\n\n*വിഷയം:* ${form.subject}\n*റഫറൻസ് ഐഡി:* ${taskId}\n\n\nസ്നേഹത്തോടെ,\nഎം.എൽ.എ ഓഫീസ്, കുന്ദമംഗലം.ഫോൺ: 9037032002`;
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(waMessage)}`, '_blank');
      }
    }
  };

  if (lastTask) {
    return (
      <div className="bg-white p-10 rounded-[20px] shadow-sm text-center max-w-2xl mx-auto border border-green-200 animate-in zoom-in-95">
        <CheckCircle size={60} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-green-800 mb-2">Input Registered Successfully</h2>
        <div className="bg-[#F4F7FB] p-4 md:p-8 rounded-2xl my-6 inline-block border border-slate-200">
          <p className="text-sm font-bold text-slate-500 uppercase">Reference ID</p>
          <p className="text-4xl font-bold text-slate-800 tracking-widest">{lastTask.id}</p>
        </div>
        <div className="flex flex-wrap gap-5 justify-center mt-4">
          <button 
            onClick={() => triggerPrint(lastTask)} 
            className="px-5 py-3 bg-slate-800 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-slate-900 transition-colors"
          >
            <Printer size={18}/> Print Slip
          </button>
          <button 
            onClick={() => triggerDownloadPDF(lastTask)} 
            className="px-5 py-3 bg-purple-600 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <Download size={18}/> Download PDF
          </button>
          <button 
            onClick={() => { setLastTask(null); setForm(initForm); setSendWaMsgSame(false); }} 
            className="px-5 py-3 bg-purple-600 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300 transition-colors"
          >
            <Plus size={18}/> Register New Input
          </button>
        </div>
      </div>
    );
  }

  return (
    <form 
      onSubmit={handleSubmit} 
      noValidate 
      className={`bg-white rounded-[20px] shadow-sm border overflow-hidden ${form.isSelfMode ? 'border-yellow-300' : 'border-slate-200'}`}
    >
      <div className="bg-white/90 backdrop-blur-xl px-4 sm:px-10 py-3 sm:py-4 flex flex-col sm:flex-row justify-center sm:justify-between items-center text-slate-800 border-b border-slate-200 shadow-sm gap-2 sm:gap-0">
        <h2 className="hidden sm:flex font-bold text-lg items-center gap-2"><Plus size={20}/> New Registration</h2>
        <div className="flex gap-2 w-full sm:w-auto justify-center">
          <label className="flex items-center justify-center gap-1.5 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white shadow-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-[14px] sm:rounded-2xl border border-slate-600 transition-colors w-full sm:w-auto">
            <input 
              type="checkbox" 
              checked={form.isSelfMode} 
              onChange={(e) => setForm(f => ({ ...f, isSelfMode: e.target.checked }))} 
              className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 rounded focus:ring-yellow-500 bg-slate-900" 
            />
            <span className="font-bold text-xs sm:text-sm text-white">Self App Mode (No Citizen)</span>
          </label>
        </div>
      </div>

      <div className={`p-4 md:p-8 border-b border-slate-100 bg-[#F4F7FB]/50 grid ${form.isSelfMode ? 'grid-cols-1 max-w-3xl' : 'md:grid-cols-2'} gap-6 md:gap-10`}>
        {!form.isSelfMode && (
          <div id="field-types" className="p-2 -m-2">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
              <Filter className="text-purple-600"/> Input Type * 
              {formError.field === 'field-types' && (
                <span className="text-red-500 text-xs animate-pulse bg-red-100 px-2 py-1 rounded ml-auto">
                  {formError.msg}
                </span>
              )}
            </h3>
            {!showNewInputType ? (
              <SearchableSelect 
                options={inputTypes}
                value={form.types[0] || ''}
                onChange={(val) => setForm(f => ({ ...f, types: [val] }))}
                placeholder="Select Input Type..."
                onAddNewClick={() => setShowNewInputType(true)}
              />
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  name="newInputType" 
                  placeholder="Enter Custom Input Type" 
                  value={form.newInputType} 
                  onChange={(e) => setForm(f => ({ ...f, newInputType: e.target.value }))} 
                  className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none text-slate-800" 
                />
                <button 
                  type="button" 
                  onClick={() => {
                    if (form.newInputType.trim()) {
                      addInputType(form.newInputType.trim());
                      setForm(f => ({ ...f, types: [form.newInputType.trim()] }));
                    }
                    setShowNewInputType(false);
                    setForm(f => ({ ...f, newInputType: '' }));
                  }} 
                  className="px-3 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-100 transition-colors flex items-center justify-center"
                >
                  <Plus size={16}/>
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNewInputType(false);
                    setForm(f => ({ ...f, newInputType: '' }));
                  }} 
                  className="px-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center"
                >
                  <X size={16}/>
                </button>
              </div>
            )}
          </div>
        )}
        <div id="field-category" className="p-2 -m-2">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
            <FileText className="text-purple-600"/> Category * 
            {formError.field === 'field-category' && (
              <span className="text-red-500 text-xs animate-pulse bg-red-100 px-2 py-1 rounded ml-auto">
                {formError.msg}
              </span>
            )}
          </h3>
          {!showNewCat ? (
            <SearchableCategorySelect 
              categories={categories} 
              selected={form.category} 
              onChange={(value) => setForm(f => ({ ...f, category: value }))} 
              onAddNewClick={() => setShowNewCat(true)} 
            />
          ) : (
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                autoFocus 
                placeholder="Type new category name..." 
                value={form.newCategory} 
                onChange={(e) => setForm(f => ({ ...f, newCategory: e.target.value }))} 
                className="w-full px-4 py-3 border border-slate-300 rounded-2xl font-bold outline-none focus:border-purple-500 bg-white" 
              />
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={handleAddCustomCategory} 
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Save & Select
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowNewCat(false)} 
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`p-4 md:p-8 border-b border-slate-100 relative ${form.isSelfMode ? 'bg-yellow-50/50' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
            <User className="text-purple-600"/> {form.isSelfMode ? 'Application Details' : 'Citizen Details'}
          </h3>
          {autoFilledMessage && (
            <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full animate-in fade-in">
              {autoFilledMessage}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {!form.isSelfMode && (
            <>
              <div id="field-mobileNumber" className="p-2 -m-2">
                <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <span>Mobile Number *</span>
                  {formError.field === 'field-mobileNumber' && (
                    <span className="text-red-500 normal-case tracking-normal font-bold animate-pulse">{formError.msg}</span>
                  )}
                </label>
                <input 
                  type="number"
                  required 
                  name="mobileNumber" 
                  value={form.personal.mobileNumber} 
                  onChange={handlePersChange} 
                  onBlur={handleMobileBlur} 
                  className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none transition-all text-slate-800" 
                  placeholder="Enter to auto-fill..." 
                />
              </div>
              <div id="field-name" className="p-2 -m-2">
                <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <span>Full Name *</span>
                  {formError.field === 'field-name' && (
                    <span className="text-red-500 normal-case tracking-normal font-bold animate-pulse">{formError.msg}</span>
                  )}
                </label>
                <input 
                  required 
                  name="name" 
                  value={form.personal.name} 
                  onChange={handlePersChange} 
                  className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none transition-all text-slate-800" 
                />
              </div>
              <div>
                <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <span>WhatsApp Number</span>
                  <label className="flex items-center gap-1 cursor-pointer transition-all duration-300 hover:bg-slate-50 text-purple-600 normal-case tracking-normal text-[10px] font-bold">
                    <input 
                      type="checkbox" 
                      checked={sendWaMsgSame} 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSendWaMsgSame(checked);
                        if (checked) {
                          setForm(f => ({
                            ...f,
                            personal: { ...f.personal, whatsappNumber: f.personal.mobileNumber }
                          }));
                        }
                      }} 
                      className="rounded w-3 h-3 text-purple-600 bg-white"
                    /> 
                    Same as Mobile
                  </label>
                </label>
                <input 
                  type="number"
                  name="whatsappNumber" 
                  value={form.personal.whatsappNumber} 
                  onChange={handlePersChange} 
                  disabled={sendWaMsgSame} 
                  className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none transition-all disabled:opacity-60 text-slate-800" 
                />
              </div>
              <div>
                <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <span>Gender</span>
                </label>
                {!showNewGender ? (
                  <SearchableSelect 
                    options={['Male', 'Female', 'Other']}
                    value={form.personal.gender}
                    onChange={(val) => setForm(f => ({ ...f, personal: { ...f.personal, gender: val } }))}
                    placeholder="Select Gender..."
                    onAddNewClick={() => setShowNewGender(true)}
                  />
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      name="otherGender" 
                      placeholder="Enter Custom Gender" 
                      value={form.personal.otherGender} 
                      onChange={handlePersChange} 
                      className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none text-slate-800" 
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowNewGender(false);
                        setForm(f => ({ ...f, personal: { ...f.personal, otherGender: '' } }));
                      }} 
                      className="px-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                    >
                      <X size={16}/>
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">House Name</label>
                <input 
                  name="houseName" 
                  value={form.personal.houseName} 
                  onChange={handlePersChange} 
                  className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none transition-all text-slate-800" 
                />
              </div>
            </>
          )}
          {!form.isSelfMode && (
            <div>
              <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <span>Designation</span>
              </label>
              {!showNewDesig ? (
                <SearchableSelect 
                  options={designations}
                  value={form.personal.designation}
                  onChange={(val) => setForm(f => ({ ...f, personal: { ...f.personal, designation: val } }))}
                  placeholder="Select Designation..."
                  onAddNewClick={() => setShowNewDesig(true)}
                />
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    name="newDesignation" 
                    placeholder="Enter Custom Designation" 
                    value={form.personal.newDesignation} 
                    onChange={handlePersChange} 
                    className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none text-slate-800" 
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowNewDesig(false);
                      setForm(f => ({ ...f, personal: { ...f.personal, newDesignation: '' } }));
                    }} 
                    className="px-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                  >
                    <X size={16}/>
                  </button>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              <span>Referral Person (Optional)</span>
            </label>
            <input 
              name="referralPerson" 
              value={form.personal.referralPerson} 
              onChange={handlePersChange} 
              className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none transition-all text-slate-800" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Place Name</label>
            <input 
              name="place" 
              value={form.personal.place} 
              onChange={handlePersChange} 
              className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none transition-all text-slate-800" 
            />
          </div>
          <div>
            <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              <span>Local Body</span>
            </label>
            {!showNewLocalBody ? (
              <SearchableSelect 
                options={WARD_LOCAL_BODIES}
                value={form.personal.localBody}
                onChange={(val) => setForm(f => ({ ...f, personal: { ...f.personal, localBody: val } }))}
                placeholder="Select Local Body..."
                onAddNewClick={() => setShowNewLocalBody(true)}
              />
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  name="otherLocalBody" 
                  placeholder="Enter Custom Local Body" 
                  value={form.personal.otherLocalBody} 
                  onChange={handlePersChange} 
                  className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none text-slate-800" 
                />
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNewLocalBody(false);
                    setForm(f => ({ ...f, personal: { ...f.personal, otherLocalBody: '' } }));
                  }} 
                  className="px-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                >
                  <X size={16}/>
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              <span>Ward Number / Name</span>
            </label>
            {!showNewWard ? (
              <SearchableSelect 
                options={form.personal.localBody && WARD_DATA[form.personal.localBody] ? WARD_DATA[form.personal.localBody] : Object.values(WARD_DATA).flat()}
                value={form.personal.wardNumber}
                onChange={handleWardChange}
                placeholder="Select Ward..."
                onAddNewClick={() => setShowNewWard(true)}
              />
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  name="otherWard" 
                  placeholder="Enter Custom Ward" 
                  value={form.personal.otherWard} 
                  onChange={handlePersChange} 
                  className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none text-slate-800" 
                />
                <button 
                  type="button" 
                  onClick={() => {
                    setShowNewWard(false);
                    setForm(f => ({ ...f, personal: { ...f.personal, otherWard: '' } }));
                  }} 
                  className="px-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"
                >
                  <X size={16}/>
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Post Office (Optional)</label>
            <input 
              name="postOffice" 
              value={form.personal.postOffice} 
              onChange={handlePersChange} 
              className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none transition-all text-slate-800" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">PIN Code (Optional)</label>
            <input 
              name="pinCode" 
              value={form.personal.pinCode} 
              onChange={handlePersChange} 
              className="w-full px-4 py-2.5 bg-[#F4F7FB] border border-slate-200 rounded-2xl text-sm font-semibold focus:bg-white focus:border-purple-500 outline-none transition-all text-slate-800" 
            />
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 bg-[#F4F7FB]/50">
        <div className="grid lg:grid-cols-2 gap-10">
          <div>
            <div id="field-subject" className="mb-6 p-2 -m-2">
              <h3 className="font-bold text-slate-800 mb-2 flex justify-between items-center text-lg">
                <span className="flex items-center gap-2"><MessageSquare className="text-purple-600"/> Subject (Short) *</span>
                {formError.field === 'field-subject' && (
                  <span className="text-red-500 text-xs animate-pulse bg-red-100 px-2 py-1 rounded">
                    {formError.msg}
                  </span>
                )}
              </h3>
              <input 
                required 
                value={form.subject} 
                onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} 
                className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-bold outline-none focus:border-purple-500 bg-white text-slate-800" 
                placeholder="Briefly state the subject..." 
              />
            </div>
            <div className="mb-6">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-lg">
                <FileText className="text-purple-600"/> Detailed Description (Optional)
              </h3>
              <textarea 
                value={form.description} 
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} 
                className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-medium h-32 outline-none focus:border-purple-500 bg-white text-slate-850" 
                placeholder="Write full details here if necessary..."
              ></textarea>
            </div>
            
            <div className="mb-6 p-5 bg-white border border-slate-300 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <ExternalLink className="text-indigo-600"/> Attach Documents (Optional)
                </h3>
              </div>
              <div className="space-y-3 mb-4">
                {form.attachments.map((att, idx) => {
                  const isString = typeof att === 'string';
                  const name = isString ? `Link ${idx + 1}` : att.name;
                  const url = isString ? att : att.url;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#F4F7FB] border border-slate-200 rounded-2xl">
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[60%]">{name}</span>
                      <div className="flex gap-2">
                        <a href={url} target="_blank" rel="noreferrer" className="p-2 text-purple-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                          <ExternalLink size={16}/>
                        </a>
                        <button 
                          type="button"
                          onClick={async () => {
                            if (!isString && att.driveId) {
                              if (!confirm("Are you sure you want to permanently delete this file?")) return;
                              await deleteFromGoogleDrive(att.driveId);
                            }
                            const newAtts = form.attachments.filter((_, i) => i !== idx);
                            setForm(f => ({ ...f, attachments: newAtts }));
                          }}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X size={16}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <FileUploadButton 
                uploaderId={creator.id}
                onUploadSuccess={(att) => setForm(f => ({ ...f, attachments: [...f.attachments, att] }))}
                onManualLinkAdd={(url) => setForm(f => ({ ...f, attachments: [...f.attachments, url] }))}
              />
              {form.attachments.length === 0 && (
                <label className="mt-3 flex items-center gap-2 cursor-pointer transition-all duration-300 hover:bg-slate-50 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                  <input 
                    type="checkbox" 
                    checked={addLinkLater}
                    onChange={(e) => setAddLinkLater(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-slate-600">I will add the document/link later</span>
                </label>
              )}
            </div>

            {isInvitation && (
              <div className="mt-4 p-5 bg-blue-50 border border-blue-200 rounded-2xl">
                <label className="block text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <CalendarPlus size={16}/> Program Date
                </label>
                <input 
                  type="datetime-local" 
                  required 
                  value={form.programDate} 
                  onChange={(e) => setForm(f => ({ ...f, programDate: e.target.value }))} 
                  className="w-full px-4 py-3 border border-blue-300 rounded-2xl font-bold outline-none focus:border-purple-500 bg-white text-slate-800" 
                />
              </div>
            )}
          </div>

          <div className="flex flex-col h-full">
            <div id="field-assignedTo" className="p-2 -m-2 mb-auto">
              <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center text-lg">
                <span className="flex items-center gap-2"><Users className="text-purple-600"/> Assign To *</span>
                {formError.field === 'field-assignedTo' && (
                  <span className="text-red-500 text-xs animate-pulse bg-red-100 px-2 py-1 rounded">
                    {formError.msg}
                  </span>
                )}
              </h3>
              {form.isLocalWork ? (
                <div className="bg-green-50 border border-green-200 p-5 rounded-2xl flex items-center gap-3 text-green-800 font-bold mb-6">
                  <Plus size={24} className="text-green-600"/> Local Work: No officers assigned.
                </div>
              ) : isInvitation ? (
                <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl flex items-center gap-3 text-indigo-800 font-bold mb-6">
                  <Plus size={24} className="text-indigo-600"/> Auto-Assigned exclusively to M. A. Razak Master (MLA)
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {users.map(u => (
                    <label 
                      key={u.id} 
                      className={`flex items-center gap-3 cursor-pointer transition-all duration-300 hover:bg-slate-50 p-3 rounded-2xl border transition-all font-bold text-sm ${form.assignedTo.includes(u.id) ? 'bg-indigo-50 border-indigo-400 text-indigo-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      <input 
                        type="checkbox" 
                        checked={form.assignedTo.includes(u.id)} 
                        onChange={() => setForm(f => ({
                          ...f,
                          assignedTo: f.assignedTo.includes(u.id) 
                            ? f.assignedTo.filter(id => id !== u.id) 
                            : [...f.assignedTo, u.id]
                        }))} 
                        className="w-4 h-4 text-indigo-600 rounded bg-white" 
                      />
                      {u.name}
                    </label>
                  ))}
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
                <label className="block text-xs font-bold text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Clock size={16}/> Target Deadline (Optional)
                </label>
                <input 
                  type="datetime-local" 
                  value={form.customDeadline} 
                  onChange={(e) => setForm(f => ({ ...f, customDeadline: e.target.value }))} 
                  className="w-full px-4 py-3 border border-amber-300 rounded-2xl font-bold outline-none focus:border-amber-500 bg-white text-sm text-slate-800" 
                />
                <p className="text-[10px] font-bold text-amber-600 mt-2">
                  If left blank, deadline defaults to exactly 24 hours from now.
                </p>
              </div>
            </div>

            {EXT_LINKS[form.category] && (
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-[20px] p-4 md:p-8 text-center shadow-sm">
                <h4 className="text-blue-900 font-bold mb-2 flex items-center justify-center gap-2">Official Portal Registration</h4>
                <p className="text-blue-700 text-sm font-medium mb-4">Ensure this request is also registered on the official {form.category} website if required.</p>
                <a 
                  href={EXT_LINKS[form.category]} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300 transition-colors shadow-sm"
                >
                  <ExternalLink size={18}/> Go to {form.category} Official Portal
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 border-t border-slate-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
        {!form.isSelfMode ? (
          <label className="flex items-center gap-3 cursor-pointer transition-all duration-300 hover:bg-slate-50 bg-green-50 px-5 py-3 rounded-2xl border border-green-200">
            <input 
              type="checkbox" 
              checked={sendWaMsg} 
              onChange={(e) => setSendWaMsg(e.target.checked)} 
              className="w-5 h-5 text-green-600 rounded bg-white" 
            />
            <span className="font-bold text-green-800 flex items-center gap-2">
              <Send size={16}/> Auto-Send Malayalam WhatsApp
            </span>
          </label>
        ) : (
          <div className="text-sm font-bold text-slate-400 italic">WhatsApp updates disabled in Self Mode.</div>
        )}
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className={`w-full md:w-auto font-bold py-4 px-10 rounded-2xl shadow-sm transition-transform transform ${isSubmitting ? 'bg-slate-500 cursor-not-allowed opacity-80' : 'bg-slate-900 hover:bg-black hover:-translate-y-1'} text-white text-lg flex items-center justify-center gap-2`}
        >
          {isSubmitting ? 'Uploading & Submitting...' : <><Check size={24} /> Submit Input</>}
        </button>
      </div>
    </form>
  );
}
