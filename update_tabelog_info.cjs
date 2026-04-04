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
  throw new Error(`Failed to fetch ${url}`);
}

async function scrapeStoreInfo() {
  const dataPath = 'src/data/restaurants.ts';
  let content = fs.readFileSync(dataPath, 'utf-8');
  
  // Extract the JSON part
  const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
  if (!jsonMatch) {
    console.error("Could not find restaurants array");
    return;
  }
  
  let restaurants = JSON.parse(jsonMatch[1]);
  console.log(`Found ${restaurants.length} restaurants.`);
  
  // We will only scrape the first 5 for demonstration to avoid timeout
  // In a real scenario, we'd loop through all.
  let count = 0;
  for (let r of restaurants) {
    if (r.storeInfo) continue; // Skip if already scraped
    if (count >= 5) break; // LIMIT TO 5 FOR NOW
    
    console.log(`Fetching store info for ${r.name}...`);
    try {
      const html = await fetchPage(r.url);
      const $ = cheerio.load(html);
      
      const storeInfo = {};
      $('.rstinfo-table tr').each((i, el) => {
        const th = $(el).find('th').text().trim();
        const td = $(el).find('td').text().trim().replace(/\s+/g, ' ');
        if (th && td) {
          storeInfo[th] = td;
        }
      });
      
      r.storeInfo = storeInfo;
      count++;
      await sleep(2000); // Respectful delay
    } catch (e) {
      console.error(`Failed to scrape ${r.name}:`, e.message);
    }
  }
  
  // Update the file
  const newJson = JSON.stringify(restaurants, null, 2);
  content = content.replace(jsonMatch[1], newJson);
  
  // Add storeInfo to interface if not exists
  if (!content.includes('storeInfo?: Record<string, string>;')) {
    content = content.replace(
      'description?: string;',
      'description?: string;\n  storeInfo?: Record<string, string>;'
    );
  }
  
  fs.writeFileSync(dataPath, content);
  console.log(`Updated ${count} restaurants with store info.`);
}

scrapeStoreInfo();
