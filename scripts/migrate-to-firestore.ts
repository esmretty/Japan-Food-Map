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
    const dataPath = join(process.cwd(), 'src', 'data', `tabelog_retry_part${i}.json`);
    if (existsSync(dataPath)) {
      console.log(`Parsing part ${i}...`);
      try {
        const partData = JSON.parse(readFileSync(dataPath, 'utf8'));
        data = data.concat(partData);
        console.log(`Loaded part ${i}: ${partData.length} records`);
      } catch (e) {
        console.error(`Error parsing part ${i}:`, e);
        process.exit(1);
      }
    } else {
      console.log(`File not found: ${dataPath}`);
    }
  }
  
  if (data.length === 0) {
    console.log('No data found to migrate. Please upload the files first.');
    process.exit(0);
  }
  
  console.log(`Total records to migrate: ${data.length}`);
  
  const CHUNK_SIZE = 250; // Reduced chunk size for stability
  
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const START_INDEX = 0;
  let successCount = START_INDEX;
  console.log(`Resuming migration from index ${START_INDEX}...`);

  for (let i = START_INDEX; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    
    chunk.forEach((restaurant: any) => {
      const docRef = doc(db, 'restaurants', restaurant.id);
      batch.set(docRef, restaurant);
    });
    
    try {
      await batch.commit();
      successCount += chunk.length;
      console.log(`Successfully migrated ${successCount} / ${data.length} restaurants`);
    } catch (error) {
      console.error(`Error migrating chunk starting at index ${i}:`, error);
    }
    await delay(500); 
  }
  
  console.log(`Migration complete! Successfully processed ${successCount} records.`);
  process.exit(0);
}

migrate().catch(console.error);
