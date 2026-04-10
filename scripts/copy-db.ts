import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, query, limit, startAfter, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const dbSource = getFirestore(app, 'ai-studio-bc0e6d4f-21a6-4300-bf9a-32b2ad436b61'); // Old database
const dbDest = getFirestore(app, 'japan-food-map-db'); // New database

async function copyData() {
  console.log('Fetching all IDs from new database to skip existing...');
  const destDocs = await getDocs(collection(dbDest, 'restaurants'));
  const existingIds = new Set(destDocs.docs.map(d => d.id));
  console.log(`Found ${existingIds.size} existing records in new database.`);

  console.log('Fetching restaurants from source database in chunks...');
  const CHUNK_SIZE = 400; 
  let successCount = 0;
  let skippedCount = 0;
  let lastDoc = null;
  let hasMore = true;

  while (hasMore) {
    let q = query(collection(dbSource, 'restaurants'), limit(CHUNK_SIZE));
    if (lastDoc) {
      q = query(collection(dbSource, 'restaurants'), startAfter(lastDoc), limit(CHUNK_SIZE));
    }

    const snapshot = await getDocs(q);
    const docs = snapshot.docs;

    if (docs.length === 0) {
      hasMore = false;
      break;
    }

    const batch = writeBatch(dbDest);
    let batchCount = 0;

    docs.forEach(d => {
      if (!existingIds.has(d.id)) {
        const docRef = doc(dbDest, 'restaurants', d.id);
        batch.set(docRef, d.data());
        batchCount++;
      } else {
        skippedCount++;
      }
    });

    try {
      if (batchCount > 0) {
        await batch.commit();
        successCount += batchCount;
        console.log(`Copied ${successCount} new records... (Skipped ${skippedCount} total)`);
      } else {
        console.log(`Skipped all ${docs.length} records in this chunk... (Skipped ${skippedCount} total)`);
      }
      lastDoc = docs[docs.length - 1];
    } catch (error) {
      console.error(`Error copying chunk:`, error);
      break;
    }
  }

  console.log(`Copy complete! Total copied: ${successCount}, Total skipped: ${skippedCount}`);
  process.exit(0);
}

copyData().catch(console.error);
