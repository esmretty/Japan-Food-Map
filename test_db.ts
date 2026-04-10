import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  const q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'), limit(5));
  const snap = await getDocs(q);
  snap.docs.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}
test();
