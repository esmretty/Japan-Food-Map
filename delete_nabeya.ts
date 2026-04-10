import { initializeApp } from 'firebase/app';
import { getFirestore, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  await deleteDoc(doc(db, 'restaurants', '8LV8af3FFzkCWIpu2JbQ'));
  console.log('Deleted 隠れ家ダイニングなべや 新橋');
  process.exit(0);
}
run();
