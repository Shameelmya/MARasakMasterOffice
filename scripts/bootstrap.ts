import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, setDoc, doc, writeBatch } from "firebase/firestore";

// The config is assumed to be copied from src/services/firebase.ts for this local script.
// Please paste your actual config below if you run this manually, 
// but we will read it directly from the local file for execution.
import { firebaseConfig } from '../src/services/firebase';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function bootstrap() {
  console.log("Bootstrapping initial MLA/SuperAdmin test account...");
  try {
    const cred = await createUserWithEmailAndPassword(auth, "testmla@marazak.local", "123456");
    const uid = cred.user.uid;
    console.log("Created Auth User with UID:", uid);

    const adminProfile = {
      id: "admin",
      name: "TEST MLA",
      role: "admin",
      email: "testmla@marazak.local",
      enabled: true,
      canInput: true,
      canSeeReports: true,
      canSeeGlobal: true,
      canSeeGlobalOverview: true,
      canSeeDraftsView: true,
      canEditGlobalOverview: true,
      canEditOwnInputs: true,
      canReassign: true,
      canGenerateUpdationReport: true,
      canSeeRecentUpdations: true,
      authUid: uid
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'artifacts/ma-razak-master-office/public/data/users', uid), adminProfile);
    batch.set(doc(db, 'artifacts/ma-razak-master-office/public/data/meta', 'login_roster'), {
      "admin": { id: "admin", name: "TEST MLA", enabled: true }
    }, { merge: true });

    await batch.commit();
    console.log("Successfully bootstrapped the database! You can now log in with testmla@marazak.local / 123456");
    process.exit(0);
  } catch (err) {
    console.error("Bootstrap failed:", err);
    process.exit(1);
  }
}

bootstrap();
