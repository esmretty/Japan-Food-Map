import { writeFileSync } from 'fs';
import { join } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function backup() {
  console.log('Starting backup...');
  const snapshot = await getDocs(collection(db, 'restaurants'));
  const data = snapshot.docs.map(doc => doc.data());
  
  const backupPath = join(process.cwd(), 'src', 'data', 'restaurants_backup.json');
  writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log(`Backup complete! Saved ${data.length} restaurants to ${backupPath}`);
  process.exit(0);
}

backup().catch(console.error);
