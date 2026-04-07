import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function enrichDescriptions() {
  console.log('Starting description enrichment...');
  const snapshot = await getDocs(collection(db, 'restaurants'));
  const restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  
  console.log(`Found ${restaurants.length} restaurants.`);
  
  // For safety and rate limits, we process in small batches.
  // You can change this limit to process more.
  const limit = 5; 
  let processed = 0;

  for (const restaurant of restaurants) {
    if (processed >= limit) break;
    
    // Skip if it already has a description (unless we want to overwrite all of them)
    // The user said: "如果是已經有抓到tabelog文字的，可以把它濃縮成兩行重點，並翻譯成繁體中文... 如果是沒抓到的..."
    // So we process all of them.
    
    console.log(`\nProcessing [${processed + 1}/${limit}]: ${restaurant.name}`);
    
    try {
      let prompt = '';
      let tools: any[] = [];
      let toolConfig: any = undefined;

      if (restaurant.description && restaurant.description.length > 20) {
        // Case 1: Already has Tabelog PR text
        prompt = `請將以下這家位於東京的餐廳「${restaurant.name}」的日文介紹，濃縮成大約 30~50 字（約兩行）的精華重點，並翻譯成繁體中文。語氣要吸引人。
餐廳料理種類：${restaurant.cuisine}
Tabelog分數：${restaurant.score}

日文介紹：
${restaurant.description}`;
      } else {
        // Case 2: No description, use Google Search
        prompt = `請幫我寫一段關於東京餐廳「${restaurant.name}」的繁體中文介紹，大約 30~50 字（約兩行）。
這家餐廳的料理種類是：${restaurant.cuisine}，Tabelog分數為：${restaurant.score}。
請利用 Google 搜尋這家餐廳的食記或評價，擷取最吸引人的特色（例如必點菜色、氣氛等）來撰寫。如果真的找不到資訊，請根據它的料理種類和高分數，寫一段通用的優質推薦文字。`;
        tools = [{ googleSearch: {} }];
        toolConfig = { includeServerSideToolInvocations: true };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: toolConfig,
        config: {
          temperature: 0.7,
        }
      });

      const newDescription = response.text?.trim();
      
      if (newDescription) {
        console.log(`Old Description: ${restaurant.description ? restaurant.description.substring(0, 50) + '...' : 'None'}`);
        console.log(`New Description: ${newDescription}`);
        
        // Update Firestore
        const docRef = doc(db, 'restaurants', restaurant.id);
        await updateDoc(docRef, { description: newDescription });
        console.log(`✅ Updated ${restaurant.name}`);
      } else {
        console.log(`❌ Failed to generate description for ${restaurant.name}`);
      }
      
      processed++;
      
      // Wait a bit to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`Error processing ${restaurant.name}:`, error);
    }
  }
  
  console.log('\nEnrichment batch complete!');
  process.exit(0);
}

enrichDescriptions().catch(console.error);
