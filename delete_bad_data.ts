import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const ids = ['WDOHBLHPO2debwjpNcFU', 'KMGHFQlQxrHiQktq4Msg', 'C0YMhu4dvbxVCb5H7IEE'];
  for (const id of ids) {
    await deleteDoc(doc(db, 'restaurants', id));
    console.log('Deleted', id);
  }
  process.exit(0);
}
run();
