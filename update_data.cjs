const fs = require('fs');
const cheerio = require('cheerio');
const { tokyoRestaurants } = require('./src/data/restaurants.ts');

async function updateRestaurants() {
  const BATCH_SIZE = 50;
  let updatedCount = 0;

  for (let i = 0; i < tokyoRestaurants.length; i += BATCH_SIZE) {
    const batch = tokyoRestaurants.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (r) => {
      let modified = false;

      // Fix cuisine
      if (r.storeInfo && r.storeInfo['ジャンル']) {
        const genre = r.storeInfo['ジャンル'].replace(/、/g, '、').trim();
        if (r.cuisine !== genre) {
          r.cuisine = genre;
          modified = true;
        }
      }

      // Fetch TW name if not present
      if (!r.twName) {
        try {
          const twUrl = r.url.replace('tabelog.com/tokyo', 'tabelog.com/tw/tokyo');
          const res = await fetch(twUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);
            const title = $('title').text();
            const twName = title.split(' - ')[0].trim();
            if (twName) {
              r.twName = twName;
              
              // Remove Romaji from name if it exists
              // The user said: "把所有翻譯都砍掉"
              // Romaji was added like "Name (Romaji)"
              const romajiMatch = r.name.match(/^(.*?) \([A-Za-z\s・-]+\)$/);
              if (romajiMatch) {
                r.name = romajiMatch[1].trim();
              }
              
              modified = true;
            }
          }
        } catch (e) {
          console.error(`Failed to fetch TW name for ${r.id}:`, e.message);
        }
      }

      return modified;
    });

    const results = await Promise.all(promises);
    const batchModifiedCount = results.filter(Boolean).length;
    updatedCount += batchModifiedCount;
    
    console.log(`Processed batch ${i / BATCH_SIZE + 1}/${Math.ceil(tokyoRestaurants.length / BATCH_SIZE)}. Modified: ${batchModifiedCount}`);
    
    // Save progress after each batch
    if (batchModifiedCount > 0) {
      saveData();
    }
    
    // Sleep a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Finished. Total updated: ${updatedCount}`);
}

function saveData() {
  const content = `export interface Restaurant {
  id: string;
  name: string;
  twName?: string;
  score: number;
  cuisine: string;
  lat: number;
  lng: number;
  url: string;
  businessHours?: string;
  awards?: string[];
  hyakumeiten?: string[];
  photos?: string[];
  description?: string;
  storeInfo?: Record<string, string>;
  address?: string;
}

export const tokyoRestaurants: Restaurant[] = ${JSON.stringify(tokyoRestaurants, null, 2)};
`;
  fs.writeFileSync('./src/data/restaurants.ts', content, 'utf8');
}

updateRestaurants();
