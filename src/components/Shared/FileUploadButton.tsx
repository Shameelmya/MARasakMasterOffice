import React, { useRef, useState } from 'react';
import { UploadCloud, Link as LinkIcon, Loader2, File, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadToGoogleDrive } from '../../utils/fileUpload';
import { Attachment } from '../../types';
import { generateUid, getNow } from '../../utils/formatters';

interface FileUploadButtonProps {
  onUploadSuccess: (attachment: Attachment) => void;
  onManualLinkAdd: (url: string) => void;
  uploaderId: string;
}

export function FileUploadButton({ onUploadSuccess, onManualLinkAdd, uploaderId }: FileUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [useManualFallback, setUseManualFallback] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');

    try {
      const result = await uploadToGoogleDrive(file);
      onUploadSuccess({
        fileId: result.fileId,
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
        sourceProject: result.sourceProject,
        uploaderId: uploaderId,
        uploadedAt: getNow(),
        url: result.url
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed. Please try again or use Plan B.');
      setUseManualFallback(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualAdd = () => {
    if (manualUrl.trim()) {
      onManualLinkAdd(manualUrl.trim());
      setManualUrl('');
      setUseManualFallback(false);
    }
  };

  if (useManualFallback) {
    return (
      <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-widest">
          <AlertCircle size={14}/> 
          Plan B: Manual Link Input
        </div>
        {errorMsg && <p className="text-xs text-red-500 font-medium">{errorMsg}</p>}
        <div className="flex gap-2">
          <input 
            type="url" 
            placeholder="Paste Google Drive / Any Link Here..." 
            value={manualUrl}
            onChange={e => setManualUrl(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-red-200 rounded-lg outline-none focus:border-red-400"
          />
          <button 
            type="button"
            onClick={handleManualAdd}
            className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
          >
            Add Link
          </button>
        </div>
        <button 
          type="button"
          onClick={() => { setUseManualFallback(false); setErrorMsg(''); }}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 underline text-left"
        >
          Try File Upload Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/jpeg, image/png, application/pdf"
        />
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-2xl font-bold text-sm transition-all ${
            isUploading 
              ? 'border-blue-300 bg-blue-50 text-purple-500 cursor-wait' 
              : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-purple-600 bg-[#F4F7FB]/50'
          }`}
        >
          {isUploading ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading...</>
          ) : (
            <><UploadCloud size={16} /> Click to Upload File (PDF/Image)</>
          )}
        </button>
        <button
          type="button"
          title="Use Manual Link (Plan B)"
          disabled={isUploading}
          onClick={() => setUseManualFallback(true)}
          className="p-2.5 rounded-2xl border-2 border-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <LinkIcon size={16} />
        </button>
      </div>
      <p className="text-[10px] font-medium text-slate-500 px-1 leading-relaxed">
        Supports Images (JPEG/PNG) and PDFs. Large files are supported.
      </p>
    </div>
  );
}
