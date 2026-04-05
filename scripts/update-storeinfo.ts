import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const CONCURRENCY = 20;

async function fetchStoreInfo(url: string, id: string) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const storeInfo: Record<string, string> = {};
    
    $('.rstinfo-table tr').each((_, el) => {
      const th = $(el).find('th').text().trim();
      if (th) {
        let td = $(el).find('td').text().trim();
        // If it's homepage, try to get the href
        if (th.includes('ホームページ')) {
          const a = $(el).find('td a').attr('href');
          if (a && !a.includes('tabelog.com')) {
            td = a;
          } else {
             // Sometimes it's a redirect link, or just text
             const textLink = $(el).find('td').text().trim();
             if (textLink.startsWith('http')) {
               td = textLink;
             }
          }
        }
        storeInfo[th] = td.replace(/\s+/g, ' ');
      }
    });

    return { id, storeInfo };
  } catch (err) {
    console.error(`Error fetching ${url}:`, err);
    return { id, storeInfo: {} };
  }
}

async function run() {
  console.log('Fetching store info for official websites...');
  
  const dataPath = path.join(process.cwd(), 'public', 'restaurants.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  const results: Record<string, Record<string, string>> = {};
  
  for (let i = 0; i < data.length; i += CONCURRENCY) {
    const chunk = data.slice(i, i + CONCURRENCY);
    console.log(`Fetching details ${i + 1} to ${i + chunk.length}...`);
    const promises = chunk.map((r: any) => fetchStoreInfo(r.url, r.id));
    const chunkResults = await Promise.all(promises);
    for (const res of chunkResults) {
      results[res.id] = res.storeInfo;
    }
  }
  
  let updated = 0;
  for (const restaurant of data) {
    if (results[restaurant.id] && Object.keys(results[restaurant.id]).length > 0) {
      restaurant.storeInfo = results[restaurant.id];
      
      // Also update googleMapUrl to be more accurate
      restaurant.googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`;
      updated++;
    }
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`Updated ${updated} restaurants with storeInfo and better Google Maps links.`);
}

run();
