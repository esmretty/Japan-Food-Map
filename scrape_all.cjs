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

async function scrapeStoreInfo() {
  const dataPath = 'src/data/restaurants.ts';
  let content = fs.readFileSync(dataPath, 'utf-8');
  
  const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
  if (!jsonMatch) {
    console.error("Could not find restaurants array");
    return;
  }
  
  let restaurants = JSON.parse(jsonMatch[1]);
  let toScrape = restaurants.filter(r => !r.storeInfo);
  console.log(`Found ${toScrape.length} restaurants left to scrape.`);
  
  const CONCURRENCY = 10; // 10 concurrent requests
  let count = 0;

  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    const batch = toScrape.slice(i, i + CONCURRENCY);
    console.log(`Processing batch ${Math.floor(i/CONCURRENCY) + 1}/${Math.ceil(toScrape.length/CONCURRENCY)}...`);
    
    await Promise.all(batch.map(async (r) => {
      try {
        const html = await fetchPage(r.url);
        if (!html) return;
        const $ = cheerio.load(html);
        
        const storeInfo = {};
        $('.rstinfo-table tr').each((_, el) => {
          const th = $(el).find('th').text().trim();
          const td = $(el).find('td').text().trim().replace(/\s+/g, ' ');
          if (th && td) {
            storeInfo[th] = td;
          }
        });
        
        r.storeInfo = storeInfo;
        count++;
      } catch (e) {
        console.error(`Failed to scrape ${r.name}:`, e.message);
      }
    }));
    
    // Save progress
    let currentContent = fs.readFileSync(dataPath, 'utf-8');
    const match = currentContent.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
    if (match) {
      const newJson = JSON.stringify(restaurants, null, 2);
      const newContent = currentContent.replace(match[1], newJson);
      fs.writeFileSync(dataPath, newContent);
    }
    
    await sleep(1000);
  }
  
  console.log(`Finished! Updated ${count} restaurants.`);
}

scrapeStoreInfo();
