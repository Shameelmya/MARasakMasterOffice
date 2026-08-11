import React from 'react';
import { Eye, Trash2, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Attachment, User } from '../../types';
import { deleteFromGoogleDrive } from '../../utils/fileUpload';

interface AttachmentRendererProps {
  key?: React.Key;
  attachment: string | Attachment;
  currentUser: User;
  onDeleteSuccess?: () => void;
  index: number;
}

export function AttachmentRenderer({ attachment, currentUser, onDeleteSuccess, index }: AttachmentRendererProps) {
  if (!attachment) return null;
  const isString = typeof attachment === 'string';
  let rawName = isString ? `Doc. ${index + 1}` : String(attachment.name || `Doc. ${index + 1}`);
  const name = String(rawName).replace('External Document Link', 'Doc.');
  const url = isString ? attachment : attachment.url;
  const isImage = !isString && (attachment.type || '').startsWith('image/');
  const driveId = !isString ? attachment.driveId : undefined;
  
  let canDelete = false;
  if (!isString && driveId) {
    if (currentUser?.role === 'admin' && currentUser?.name === 'M. A. Razak Master (MLA)') {
      canDelete = true;
    } else if (attachment.uploaderId === currentUser?.id && attachment.uploadedAt) {
      // Check if within 24 hours
      const uploadTime = new Date(attachment.uploadedAt).getTime();
      const now = new Date().getTime();
      if (now - uploadTime <= 24 * 60 * 60 * 1000) {
        canDelete = true;
      }
    }
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to permanently delete this file?")) {
      if (driveId) {
        await deleteFromGoogleDrive(driveId);
        if (onDeleteSuccess) onDeleteSuccess();
      }
    }
  };

  return (
    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg shrink-0">
      <ExternalLink size={12} className="text-indigo-400" />
      <span className="text-xs font-bold text-indigo-800 truncate max-w-[150px]" title={name}>
        {name}
      </span>
      <div className="flex gap-1 ml-2 pl-2 border-l border-indigo-200">
        <a 
          href={url} 
          target="_blank" 
          rel="noreferrer" 
          className="text-white bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
          title="View"
        >
          <Eye size={10} /> View
        </a>
        {canDelete && (
          <button 
            type="button"
            onClick={handleDelete}
            className="text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
            title="Delete File"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
