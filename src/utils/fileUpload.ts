import imageCompression from 'browser-image-compression';

// 1. Google Drive Fallback URL (Legacy)
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx-4DqUgj-AfOhN1alKAy3FplLiDbUJnGFR-DXiHjhFRpNk65cKEiyCcSn4O_35W9uKw/exec";

// 2. New Local Server URL (Configured via Vercel Environment Variables)
// During local testing, this will be undefined, so we can also check for a hardcoded localhost if needed.
const LOCAL_SERVER_URL = (import.meta as any).env.VITE_UPLOAD_SERVER_URL;

export const MAX_FILE_SIZE_MB = 10; // Increased to 10MB since we own the storage now
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

export const uploadToGoogleDrive = async (file: File): Promise<{ url: string, id: string, name: string }> => {
  let fileToUpload = file;

  // Compress images larger than 500KB
  if (file.type.startsWith('image/') && file.size > 500 * 1024) {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true
    };
    try {
      fileToUpload = await imageCompression(file, options);
    } catch (e) {
      console.error("Image compression failed, proceeding with original", e);
    }
  }

  if (fileToUpload.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size must be less than ${MAX_FILE_SIZE_MB}MB. Current size: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
  }

  // ============================================================================
  // ROUTING LOGIC: Determine which server to use
  // ============================================================================
  
  // If the Vercel environment variable is set (Cloudflare Tunnel), OR we are explicitly testing locally
  // We use the new Node.js server. 
  // If NOT set, we safely fall back to the old Google Drive script.
  const isTestingLocally = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const targetServerUrl = LOCAL_SERVER_URL || (isTestingLocally ? 'http://localhost:4000' : null);

  if (targetServerUrl) {
    // ---------------------------------------------------------
    // NEW NODE.JS UPLOAD LOGIC
    // ---------------------------------------------------------
    const formData = new FormData();
    formData.append('file', fileToUpload, fileToUpload.name);

    try {
      const response = await fetch(`${targetServerUrl}/upload`, {
        method: "POST",
        body: formData, // FormData automatically sets the correct multipart/form-data boundary
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Upload failed on local server");
      }

      return {
        url: data.url,
        id: data.id,
        name: data.name
      };
    } catch (e) {
      console.warn("Local server upload failed, probably offline. Falling back to Google Drive storage.", e);
      // Fallback to Google Drive will execute below
    }
  }

  // ---------------------------------------------------------
  // LEGACY GOOGLE DRIVE UPLOAD LOGIC (FALLBACK)
  // ---------------------------------------------------------
  if (!targetServerUrl) {
    console.warn("VITE_UPLOAD_SERVER_URL is not set. Falling back to Google Drive storage.");
  }
  const base64 = await convertBase64(fileToUpload);

    const payload = {
      action: "upload",
      filename: fileToUpload.name,
      mimeType: fileToUpload.type,
      base64: base64
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      }
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Upload failed on Google Drive");
    }

    return {
      url: data.url,
      id: data.id,
      name: data.name
    };
};

export const deleteFromGoogleDrive = async (fileId: string, fileUrl?: string): Promise<boolean> => {
  // If it's a URL pointing to Google Drive, use legacy delete.
  // Otherwise, hit our local server delete endpoint.
  const isGoogleDriveFile = fileUrl && fileUrl.includes("drive.google.com");
  
  const isTestingLocally = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const targetServerUrl = LOCAL_SERVER_URL || (isTestingLocally ? 'http://localhost:4000' : null);

  if (!isGoogleDriveFile && targetServerUrl) {
    try {
      const response = await fetch(`${targetServerUrl}/delete/${fileId}`, {
        method: "DELETE",
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
