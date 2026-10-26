import imageCompression from 'browser-image-compression';
import { getDoc } from 'firebase/firestore';
import { getDocRef, auth } from '../services/firebase';

// 1. Google Drive Fallback URL (Legacy)
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx-4DqUgj-AfOhN1alKAy3FplLiDbUJnGFR-DXiHjhFRpNk65cKEiyCcSn4O_35W9uKw/exec";

// 2. New Local Server URL (Configured via Vercel Environment Variables)
// During local testing, this will be undefined, so we can also check for a hardcoded localhost if needed.
const LOCAL_SERVER_URL = (import.meta as any).env.VITE_UPLOAD_SERVER_URL;

export const MAX_FILE_SIZE_MB = 10; // Increased to 10MB since we own the storage now
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ============================================================================
// SHARED HELPER: Resolves the current live file-server URL.
// Priority: Firestore globals/settings > VITE env var > localhost fallback.
// This must be used for ALL server operations so that a Cloudflare tunnel
// URL change doesn't break file access.
// ============================================================================
const getCurrentServerUrl = async (): Promise<string | null> => {
  let serverUrl = LOCAL_SERVER_URL || null;

  try {
    const settingsDoc = await getDoc(getDocRef('globals', 'settings'));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      if (data.localServerUrl) {
        serverUrl = data.localServerUrl;
      }
    }
  } catch (err) {
    console.warn('[FileUpload] Failed to fetch dynamic server URL from Firebase', err);
  }

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!serverUrl && isLocal) {
    serverUrl = 'http://localhost:4000';
  }

  // Ensure no trailing slash
  return serverUrl ? serverUrl.replace(/\/+$/, '') : null;
};

// Extracts the path portion from a saved file URL (e.g. /api/files/xyz.pdf)
const extractFilePath = (url: string): string | null => {
  try {
    return new URL(url).pathname;
  } catch {
    // Fallback: regex extraction for malformed URLs
    const match = url.match(/(\/api\/files\/[^\s?#]+|\/uploads\/[^\s?#]+)/);
    return match ? match[1] : null;
  }
};

const convertBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const uploadToGoogleDrive = async (file: File): Promise<{ url: string, fileId: string, originalName: string, name?: string, mimeType: string, size: number, sourceProject: string }> => {
  let fileToUpload = file;

  // ============================================================================
  // ROUTING LOGIC: Determine which server to use
  // ============================================================================
  
  let targetServerUrl = LOCAL_SERVER_URL || null;

  try {
    const settingsDoc = await getDoc(getDocRef('globals', 'settings'));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      if (data.localServerUrl) {
        targetServerUrl = data.localServerUrl;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch dynamic server URL from Firebase", err);
  }

  const isTestingLocally = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!targetServerUrl && isTestingLocally) {
    targetServerUrl = 'http://localhost:4000';
  }

  if (targetServerUrl) {
    // ---------------------------------------------------------
    // NEW NODE.JS UPLOAD LOGIC
    // ---------------------------------------------------------
    const formData = new FormData();
    formData.append('file', fileToUpload, fileToUpload.name);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be logged in to upload files.");
      const token = await user.getIdToken();

      const response = await fetch(`${targetServerUrl}/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Upload failed on local server.");
      }

      return {
        url: data.url,
        fileId: data.id,
        originalName: data.name,
        name: data.name,
        mimeType: fileToUpload.type,
        size: fileToUpload.size,
        sourceProject: data.sourceProject
      };
    } catch (e) {
      console.error("Local server upload failed, probably offline.", e);
      throw new Error("File saving server is not connected. (Error Code: SERVER_OFFLINE)");
    }
  } else {
    throw new Error("File saving server is not connected. (Error Code: NO_SERVER_URL)");
  }
};

export const deleteFromGoogleDrive = async (fileId: string, fileUrl?: string): Promise<boolean> => {
  // If it's a URL pointing to Google Drive, use legacy delete.
  // Otherwise, hit our local server delete endpoint.
  const isGoogleDriveFile = fileUrl && fileUrl.includes("drive.google.com");
  
  // Always resolve the CURRENT live server URL (handles tunnel URL changes)
  const targetServerUrl = await getCurrentServerUrl();

  if (!isGoogleDriveFile && targetServerUrl) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be logged in to delete files.");
      const token = await user.getIdToken();

      const response = await fetch(`${targetServerUrl}/delete/${fileId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data.success;
    } catch (e) {
      console.error("Local delete failed", e);
      return false;
    }
  } else {
    // Legacy Google Drive Delete
    const payload = {
      action: "delete",
      fileId: fileId
    };

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        }
      });

      const data = await response.json();
      return data.success;
    } catch (e) {
      console.error("Google Drive delete failed", e);
      return false;
    }
  }
};
export const viewProtectedAttachment = async (url: string) => {
  // 1. Legacy external links — open directly, no auth needed
  if (url.includes('drive.google.com') || url.includes('script.google.com') || url.includes('wa.me')) {
    window.open(url, '_blank');
    return;
  }

  // 2. Non-server URLs — open directly
  if (!url || (!url.includes('/api/files/') && !url.includes('/uploads/'))) {
    if (url) window.open(url, '_blank');
    return;
  }

  // 3. Server-hosted files — resolve the CURRENT live server URL
  //    The saved URL in Firestore may contain a stale Cloudflare tunnel domain
  //    (e.g. old-name.trycloudflare.com) that no longer exists.
  //    We extract just the path and prepend the current live server URL.
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    const token = await user.getIdToken();

    // Resolve the current live server URL from Firestore settings
    const currentServerUrl = await getCurrentServerUrl();
    if (!currentServerUrl) {
      throw new Error('File server is not configured. Please contact the administrator.');
    }

    // Extract path from the saved (possibly stale) URL and rebuild with the live domain
    const filePath = extractFilePath(url);
    const resolvedUrl = filePath ? `${currentServerUrl}${filePath}` : url;

    console.log('[FileView] Resolved URL:', resolvedUrl);

    const res = await fetch(resolvedUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error(`Failed to load file. Status: ${res.status}`);

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank');

    // Clean up the blob URL after 1 minute to free memory
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (err) {
    console.error('Failed to fetch protected file:', err);
    alert('Failed to securely open file. You may not be logged in or lack permission.');
  }
};
