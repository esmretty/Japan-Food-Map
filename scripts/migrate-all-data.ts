import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, query, limit, startAfter } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const dbSource = getFirestore(app, 'ai-studio-bc0e6d4f-21a6-4300-bf9a-32b2ad436b61'); // Old database
const dbDest = getFirestore(app, 'japan-food-map-db'); // New database

async function copyCollection(collectionPath: string, skipCheck: boolean = false) {
  console.log(`\n--- Copying collection: ${collectionPath} ---`);
  
  let existingIds = new Set<string>();
  if (!skipCheck) {
    console.log(`Fetching existing IDs from new database to skip...`);
    const destDocs = await getDocs(collection(dbDest, collectionPath));
    existingIds = new Set(destDocs.docs.map(d => d.id));
    console.log(`Found ${existingIds.size} existing records in ${collectionPath}.`);
  }

  const CHUNK_SIZE = 400; 
  let successCount = 0;
  let skippedCount = 0;
  let lastDoc = null;
  let hasMore = true;

  while (hasMore) {
    let q = query(collection(dbSource, collectionPath), limit(CHUNK_SIZE));
    if (lastDoc) {
      q = query(collection(dbSource, collectionPath), startAfter(lastDoc), limit(CHUNK_SIZE));
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
        const docRef = doc(dbDest, collectionPath, d.id);
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
      console.error(`Error copying chunk for ${collectionPath}:`, error);
      break;
    }
  }

  console.log(`Finished ${collectionPath}! Copied: ${successCount}, Skipped: ${skippedCount}`);
  return successCount;
}

async function copyUserData() {
  console.log('\n--- Fetching users ---');
  const usersSnapshot = await getDocs(collection(dbSource, 'users'));
  console.log(`Found ${usersSnapshot.docs.length} users.`);

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;
    console.log(`\nProcessing user: ${userId}`);
    
    // Copy user document itself
    await writeBatch(dbDest).set(doc(dbDest, 'users', userId), userDoc.data()).commit();

    // Copy user restaurants
    await copyCollection(`users/${userId}/restaurants`, true);
    
    // Copy user preferences
    await copyCollection(`users/${userId}/preferences`, true);
  }
}

async function runAll() {
  try {
    await copyUserData();
    await copyCollection('tokyoLines');
    await copyCollection('tokyoStations');
    await copyCollection('restaurants');
    console.log('\n✅ All data migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
  process.exit(0);
}

runAll();
