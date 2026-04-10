import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, getDocs, getDocsFromCache, writeBatch, doc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase apps
const app = initializeApp(firebaseConfig);

// Initialize old database with persistent cache to access previously cached data
const dbSource = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, 'ai-studio-bc0e6d4f-21a6-4300-bf9a-32b2ad436b61'); 

const dbDest = getFirestore(app, 'japan-food-map-db'); // New database

export async function exportAllRestaurantsFromOldDBCache() {
  try {
    console.log("Attempting to read ALL restaurants from old DB cache...");
    const restaurantsSnap = await getDocsFromCache(collection(dbSource, 'restaurants'));
    
    if (restaurantsSnap.empty) {
      throw new Error("本機快取中沒有找到餐廳資料。");
    }

    const restaurants: any[] = [];
    restaurantsSnap.forEach(doc => {
      restaurants.push({ id: doc.id, ...doc.data() });
    });

    console.log(`Found ${restaurants.length} restaurants in cache.`);
    return restaurants;
  } catch (error: any) {
    console.error("Error exporting all restaurants from cache:", error);
    throw new Error(error.message || "無法從快取讀取餐廳資料。");
  }
}

export async function importRestaurantsToNewDB(restaurants: any[]) {
  try {
    console.log(`Importing ${restaurants.length} restaurants to new DB...`);
    const CHUNK_SIZE = 200; // Reduced chunk size to prevent overloading
    
    for (let i = 0; i < restaurants.length; i += CHUNK_SIZE) {
      const chunk = restaurants.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(dbDest);
      
      chunk.forEach(restaurant => {
        const { id, ...restData } = restaurant;
        if (id) {
          const docRef = doc(dbDest, 'restaurants', id);
          batch.set(docRef, restData);
        }
      });
      
      await batch.commit();
      console.log(`Imported chunk ${i} to ${i + chunk.length}`);
      
      // Add a small delay between batches to prevent write stream exhaustion
      if (i + CHUNK_SIZE < restaurants.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log("Finished importing all restaurants.");
  } catch (error: any) {
    console.error("Error importing restaurants:", error);
    throw new Error("寫入新資料庫失敗，請稍後再試。");
  }
}

export async function exportUserDataFromOldDB(userId: string) {
  const data: any = {
    restaurants: [],
    preferences: []
  };

  try {
    console.log("Attempting to read from cache due to quota limits...");
    // Fetch restaurants from cache
    try {
      const restaurantsSnap = await getDocsFromCache(collection(dbSource, `users/${userId}/restaurants`));
      restaurantsSnap.forEach(doc => {
        data.restaurants.push({ id: doc.id, ...doc.data() });
      });
    } catch (e) {
      console.warn("Could not read restaurants from cache:", e);
    }

    // Fetch preferences from cache
    try {
      const preferencesSnap = await getDocsFromCache(collection(dbSource, `users/${userId}/preferences`));
      preferencesSnap.forEach(doc => {
        data.preferences.push({ id: doc.id, ...doc.data() });
      });
    } catch (e) {
      console.warn("Could not read preferences from cache:", e);
    }

    if (data.restaurants.length === 0 && data.preferences.length === 0) {
      throw new Error("本機快取中沒有找到您的資料。由於舊資料庫額度已滿，目前無法從伺服器下載。請等候至明天下午 3 點額度重置後再試。");
    }

    return data;
  } catch (error: any) {
    console.error("Error exporting user data:", error);
    throw new Error(error.message || "無法從舊資料庫讀取您的資料，請確認您已登入。");
  }
}

export async function importUserDataToNewDB(userId: string, data: any) {
  try {
    const batch = writeBatch(dbDest);

    // Import restaurants
    if (data.restaurants && Array.isArray(data.restaurants)) {
      data.restaurants.forEach((item: any) => {
        const { id, ...restData } = item;
        if (id) {
          const docRef = doc(dbDest, `users/${userId}/restaurants`, id);
          batch.set(docRef, restData);
        }
      });
    }

    // Import preferences
    if (data.preferences && Array.isArray(data.preferences)) {
      data.preferences.forEach((item: any) => {
        const { id, ...prefData } = item;
        if (id) {
          const docRef = doc(dbDest, `users/${userId}/preferences`, id);
          batch.set(docRef, prefData);
        }
      });
    }

    await batch.commit();
  } catch (error) {
    console.error("Error importing user data:", error);
    throw new Error("寫入新資料庫失敗，請稍後再試。");
  }
}
