import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, doc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'), limit(2));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const data = d.data();
    console.log(`Deleting: ${data.name} (ID: ${d.id})`);
    await deleteDoc(doc(db, 'restaurants', d.id));
  }
  console.log('Deleted successfully.');
  process.exit(0);
}
run();
