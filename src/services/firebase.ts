import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc } from "firebase/firestore";
import { fallbackConfig } from "../utils/constants";

declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;

let parsedConfig = fallbackConfig;

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    parsedConfig = JSON.parse(__firebase_config);
  } else if (typeof window !== 'undefined' && window.__firebase_config) {
    parsedConfig = JSON.parse(window.__firebase_config);
  }
} catch (e) {
  console.error("Error parsing firebase config, using fallback", e);
}

export const app = initializeApp(parsedConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const appId = (typeof __app_id !== 'undefined' && __app_id) || 
                     (typeof window !== 'undefined' && window.__app_id) || 
                     'ma-razak-master-office';

export function getColRef(colName: string) {
  return collection(db, 'artifacts', appId, 'public', 'data', colName);
}

export function getDocRef(colName: string, docId: string) {
  return doc(db, 'artifacts', appId, 'public', 'data', colName, docId);
}
