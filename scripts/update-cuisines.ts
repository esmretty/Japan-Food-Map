import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const MAX_PAGES = 60;
const CONCURRENCY = 10;

async function fetchListCuisines(page: number) {
  const url = `https://tabelog.com/tokyo/rstLst/${page}/?SrtT=rt&Srt=D&sort_mode=1`;
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: Record<string, string> = {};
    
    $('.list-rst').each((_, el) => {
      const url = $(el).find('.list-rst__rst-name-target').attr('href') || '';
      const id = url.split('/').filter(Boolean).pop();
      const areaCuisine = $(el).find('.list-rst__area-genre').text().trim();
      const parts = areaCuisine.split(' / ');
      const cuisine = parts.length > 1 ? parts[1].trim() : areaCuisine;
      
      if (id) {
        results[id] = cuisine;
      }
    });
    return results;
  } catch (e) {
    console.error(`Error fetching page ${page}:`, e);
    return {};
  }
}

async function run() {
  console.log('Fetching list pages to update cuisines...');
  const allCuisines: Record<string, string> = {};
  
  for (let i = 1; i <= MAX_PAGES; i += CONCURRENCY) {
    const chunk = Array.from({ length: Math.min(CONCURRENCY, MAX_PAGES - i + 1) }, (_, idx) => i + idx);
    console.log(`Fetching pages ${chunk[0]} to ${chunk[chunk.length - 1]}...`);
    const promises = chunk.map(page => fetchListCuisines(page));
    const results = await Promise.all(promises);
    for (const res of results) {
      Object.assign(allCuisines, res);
    }
  }
  
  console.log(`Fetched cuisines for ${Object.keys(allCuisines).length} restaurants.`);
  
  const dataPath = path.join(process.cwd(), 'public', 'restaurants.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  let updated = 0;
  for (const restaurant of data) {
    if (allCuisines[restaurant.id]) {
      restaurant.cuisine = allCuisines[restaurant.id];
      updated++;
    }
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`Updated ${updated} restaurants with cuisine data.`);
}

run();
