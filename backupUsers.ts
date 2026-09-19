import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as fs from 'fs';
import { firebaseConfig } from "./src/services/firebase";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function backup() {
  const usersRef = collection(db, "artifacts/ma-razak-master-office/public/data/users");
  const snap = await getDocs(usersRef);
  const data = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  fs.writeFileSync('users_backup.json', JSON.stringify(data, null, 2));
  console.log(`Backed up ${data.length} users.`);
}

backup().catch(console.error).finally(() => process.exit(0));
