import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getCountFromServer } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const dbNew = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const dbOld = getFirestore(app, 'ai-studio-bc0e6d4f-21a6-4300-bf9a-32b2ad436b61');

async function run() {
  try {
    const collNew = collection(dbNew, 'restaurants');
    const snapshotNew = await getCountFromServer(collNew);
    console.log('Total records in new DB:', snapshotNew.data().count);
  } catch (e) {
    console.error('Error counting new DB:', e);
  }

  try {
    const collOld = collection(dbOld, 'restaurants');
    const snapshotOld = await getCountFromServer(collOld);
    console.log('Total records in old DB:', snapshotOld.data().count);
  } catch (e) {
    console.error('Error counting old DB:', e);
  }
  process.exit(0);
}
run();
