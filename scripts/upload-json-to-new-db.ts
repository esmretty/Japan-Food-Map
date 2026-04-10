import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const dbDest = getFirestore(app, 'japan-food-map-db'); // New database

async function uploadData() {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  const files = [
    'tabelog_retry_part1.json',
    'tabelog_retry_part2.json',
    'tabelog_retry_part3.json',
    'tabelog_retry_part4.json'
  ];

  let totalUploaded = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    console.log(`\nReading ${file}...`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      continue;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const restaurants = JSON.parse(rawData);
    console.log(`Found ${restaurants.length} restaurants in ${file}.`);

    const CHUNK_SIZE = 400; // Firestore batch limit is 500
    for (let i = 0; i < restaurants.length; i += CHUNK_SIZE) {
      const chunk = restaurants.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(dbDest);

      chunk.forEach((restaurant: any) => {
        const docRef = doc(dbDest, 'restaurants', restaurant.id);
        batch.set(docRef, restaurant);
      });

      try {
        await batch.commit();
        totalUploaded += chunk.length;
        console.log(`Uploaded ${totalUploaded} restaurants so far...`);
      } catch (error) {
        console.error(`Error uploading chunk starting at index ${i}:`, error);
      }
    }
  }

  console.log(`\n✅ Finished uploading! Total restaurants uploaded: ${totalUploaded}`);
  process.exit(0);
}

uploadData().catch(console.error);
