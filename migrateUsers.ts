import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, deleteDoc, doc } from "firebase/firestore";
import { firebaseConfig } from "./src/services/firebase";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  const usersRef = collection(db, "artifacts/ma-razak-master-office/public/data/users");
  const snap = await getDocs(usersRef);
  let count = 0;
  
  for (const d of snap.docs) {
    const data = d.data();
    if (data.authUid && d.id !== data.authUid) {
      // Create new doc with authUid as ID
      await setDoc(doc(db, "artifacts/ma-razak-master-office/public/data/users", data.authUid), data);
      // Delete old doc
      await deleteDoc(doc(db, "artifacts/ma-razak-master-office/public/data/users", d.id));
      console.log(`Migrated ${d.id} to ${data.authUid}`);
      count++;
    }
  }
  console.log(`Migrated ${count} users.`);
}

migrate().catch(console.error).finally(() => process.exit(0));
