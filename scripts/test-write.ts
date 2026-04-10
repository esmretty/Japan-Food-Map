import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // default database

async function testWrite() {
  console.log('Testing write to default database...');
  try {
    await setDoc(doc(db, 'test', 'quota-check'), { timestamp: new Date().toISOString() });
    console.log('Write successful!');
  } catch (error) {
    console.error('Write failed:', error);
  }
  process.exit(0);
}

testWrite();
