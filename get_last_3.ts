import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'), limit(3));
  const snap = await getDocs(q);
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- 餐廳名稱: ${data.name}`);
    console.log(`  地址: ${data.address}`);
    console.log(`  加入時間: ${data.createdAt}`);
    console.log(`  Tabelog網址: ${data.url || data.tabelogUrl || '無'}`);
    console.log('---');
  });
  process.exit(0);
}
run();
