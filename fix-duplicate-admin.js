import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDlWgaEm8v3k0tmapwa9Q4Fbx-D0_YXD_A",
  authDomain: "ma-razak-master-office.firebaseapp.com",
  projectId: "ma-razak-master-office",
  storageBucket: "ma-razak-master-office.firebasestorage.app",
  messagingSenderId: "743153965338",
  appId: "1:743153965338:web:5212b3ab18dc57376a74a3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  try {
    await signInWithEmailAndPassword(auth, 'admin@marazak.local', 'Master@2026');
    const usersSnap = await getDocs(collection(db, 'users'));
    let adminDocs = [];
    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.role === 'admin') {
        adminDocs.push({ id: docSnap.id, email: data.email, data });
      }
    });

    console.log("Found " + adminDocs.length + " admin profiles.");
    
    for (const admin of adminDocs) {
        console.log("Deleting admin doc with UID: " + admin.id);
        await deleteDoc(doc(db, 'users', admin.id));
    }
    
    console.log("Done deleting all admin profiles. The correct one will be auto-healed on next login.");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
