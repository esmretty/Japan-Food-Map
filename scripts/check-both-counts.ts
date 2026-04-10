import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getCountFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Connect to both databases
const dbNew = getFirestore(app, 'japan-food-map-db');
const dbOld = getFirestore(app, 'ai-studio-bc0e6d4f-21a6-4300-bf9a-32b2ad436b61');

async function checkCounts() {
  try {
    const snapNew = await getCountFromServer(collection(dbNew, 'restaurants'));
    console.log('New DB (japan-food-map-db) count:', snapNew.data().count);
    
    const snapOld = await getCountFromServer(collection(dbOld, 'restaurants'));
    console.log('Old DB (ai-studio-...) count:', snapOld.data().count);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

checkCounts();
