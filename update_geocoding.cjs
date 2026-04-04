const fs = require('fs');
const cheerio = require('cheerio');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (e) {
      console.log(`Error fetching ${url}: ${e.message}. Retrying...`);
      await sleep(2000);
    }
  }
  return null;
}

async function updateGeocoding() {
  const dataPath = 'src/data/restaurants.ts';
  let content = fs.readFileSync(dataPath, 'utf-8');
  
  const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
  if (!jsonMatch) {
    console.error("Could not find restaurants array");
    return;
  }
  
  let restaurants = JSON.parse(jsonMatch[1]);
  
  let toUpdate = restaurants.filter(r => r.lat === 0 || !r.googleMapUrl);
  console.log(`Found ${toUpdate.length} restaurants to geocode.`);
  
  const CONCURRENCY = 15;
  let count = 0;

  for (let i = 0; i < toUpdate.length; i += CONCURRENCY) {
    const batch = toUpdate.slice(i, i + CONCURRENCY);
    console.log(`Processing batch ${Math.floor(i/CONCURRENCY) + 1}/${Math.ceil(toUpdate.length/CONCURRENCY)}...`);
    
    await Promise.all(batch.map(async (r) => {
      try {
        const html = await fetchPage(r.url);
        if (!html) return;
        
        // Extract lat/lng
        const mapData = html.match(/"latitude":([0-9.]+),"longitude":([0-9.]+)/);
        if (mapData) {
          r.lat = parseFloat(mapData[1]);
          r.lng = parseFloat(mapData[2]);
        }
        
        // Clean address
        if (r.storeInfo && r.storeInfo['住所']) {
          let addr = r.storeInfo['住所'];
          addr = addr.split('大きな地図を見る')[0].trim();
          r.address = addr;
        }
        
        // Generate Google Maps URL
        const query = encodeURIComponent(`${r.name.split(' / ')[0]} ${r.address}`);
        r.googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
        
        count++;
      } catch (e) {
        console.error(`Failed to geocode ${r.name}:`, e.message);
      }
    }));
    
    // Save progress safely
    try {
      const newJson = JSON.stringify(restaurants, null, 2);
      const newContent = `export interface Restaurant {\n  id: string;\n  name: string;\n  score: number;\n  cuisine: string;\n  url: string;\n  lat: number;\n  lng: number;\n  businessHours: string;\n  awards: string[];\n  hyakumeiten: string[];\n  photos: string[];\n  description: string;\n  storeInfo?: Record<string, string>;\n  address: string;\n  googleMapUrl?: string;\n}\n\nexport const tokyoRestaurants: Restaurant[] = ${newJson};\n`;
      fs.writeFileSync(dataPath + '.tmp', newContent);
      fs.renameSync(dataPath + '.tmp', dataPath);
    } catch (e) {
      console.error("Failed to save progress:", e.message);
    }
    
    await sleep(500);
  }
  
  console.log(`Finished! Geocoded ${count} restaurants.`);
}

updateGeocoding();
