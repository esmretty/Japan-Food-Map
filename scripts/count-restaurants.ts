import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getCountFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function count() {
  const coll = collection(db, 'restaurants');
  const snapshot = await getCountFromServer(coll);
  console.log('Total restaurants in Firestore:', snapshot.data().count);
  process.exit(0);
}

count().catch(console.error);
