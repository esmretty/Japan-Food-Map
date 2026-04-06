import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function migrate() {
  console.log('Starting migration...');
  let data: any[] = [];
  
  for (let i = 1; i <= 4; i++) {
    const dataPath = join(process.cwd(), 'src', 'data', `tabelog_part${i}.json`);
    if (existsSync(dataPath)) {
      const partData = JSON.parse(readFileSync(dataPath, 'utf8'));
      data = data.concat(partData);
      console.log(`Loaded part ${i}: ${partData.length} records`);
    }
  }
  
  if (data.length === 0) {
    console.log('No data found to migrate. Please run the scraper first.');
    process.exit(0);
  }
  
  console.log(`Total records to migrate: ${data.length}`);
  
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
