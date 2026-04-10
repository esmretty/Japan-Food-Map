import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'), limit(5));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    console.log(`Found: ${d.data().name} (ID: ${d.id})`);
  }
  process.exit(0);
}
run();
