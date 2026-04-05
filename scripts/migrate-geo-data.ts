import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function migrateGeoData() {
  console.log('Starting geo data migration...');
  
  // 1. Migrate Lines
  const linesPath = join(process.cwd(), 'public', 'tokyo-lines.json');
  const linesData = JSON.parse(readFileSync(linesPath, 'utf8'));
  
  let batch = writeBatch(db);
  let count = 0;
  
  for (const feature of linesData.features) {
    // Sanitize ID (e.g., "relation/404834" -> "relation_404834")
    const safeId = feature.id.replace(/\//g, '_');
    const docRef = doc(db, 'tokyoLines', safeId);
    
    // Stringify geometry to bypass nested array limitation
    const featureToSave = {
      ...feature,
      geometry: JSON.stringify(feature.geometry)
    };
    
    batch.set(docRef, featureToSave);
    count++;
    
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`Migrated ${count} lines...`);
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
  }
  console.log(`Finished migrating ${count} lines.`);
  
  // 2. Migrate Stations
  const stationsPath = join(process.cwd(), 'public', 'tokyo-stations.json');
  const stationsData = JSON.parse(readFileSync(stationsPath, 'utf8'));
  
  batch = writeBatch(db);
  count = 0;
  
  for (const feature of stationsData.features) {
    const safeId = `station_${count}`;
    const docRef = doc(db, 'tokyoStations', safeId);
    
    // Stringify geometry to bypass nested array limitation
    const featureToSave = {
      ...feature,
      geometry: JSON.stringify(feature.geometry)
    };
    
    batch.set(docRef, featureToSave);
    count++;
    
    if (count % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      console.log(`Migrated ${count} stations...`);
    }
  }
  if (count % 400 !== 0) {
    await batch.commit();
  }
  console.log(`Finished migrating ${count} stations.`);
  
  console.log('Geo data migration complete!');
  process.exit(0);
}

migrateGeoData().catch(console.error);
