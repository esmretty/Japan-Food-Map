import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function migrate() {
  console.log('Starting migration...');
  const dataPath = join(process.cwd(), 'public', 'restaurants.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  
  const CHUNK_SIZE = 400; // Firestore batch limit is 500
  
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    
    chunk.forEach((restaurant: any) => {
      const docRef = doc(db, 'restaurants', restaurant.id);
      batch.set(docRef, restaurant);
    });
    
    await batch.commit();
    console.log(`Migrated ${i + chunk.length} / ${data.length} restaurants`);
  }
  
  console.log('Migration complete!');
  process.exit(0);
}

migrate().catch(console.error);
