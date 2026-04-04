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

function extractId(url) {
  return url.split('/').filter(Boolean).pop();
}

async function updateNames() {
  const dataPath = 'src/data/restaurants.ts';
  let content = fs.readFileSync(dataPath, 'utf-8');
  
  const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
  if (!jsonMatch) {
    console.error("Could not find restaurants array");
    return;
  }
  
  let restaurants = JSON.parse(jsonMatch[1]);
  
  const jpNames = new Map();
  const twNames = new Map();
  
  console.log("Fetching JP names...");
  for (let page = 1; page <= 60; page++) {
    const url = `https://tabelog.com/tokyo/rstLst/${page}/?SrtT=rt&Srt=D&sort_mode=1`;
    const html = await fetchPage(url);
    if (!html) continue;
    const $ = cheerio.load(html);
    $('.list-rst__rst-name-target').each((_, el) => {
      const href = $(el).attr('href');
      const name = $(el).text().trim();
      if (href) jpNames.set(extractId(href), name);
    });
    await sleep(1000);
  }
  
  console.log("Fetching TW names...");
  for (let page = 1; page <= 60; page++) {
    const url = `https://tabelog.com/tw/tokyo/rstLst/${page}/?SrtT=rt&Srt=D&sort_mode=1`;
    const html = await fetchPage(url);
    if (!html) continue;
    const $ = cheerio.load(html);
    $('.list-rst__rst-name-target').each((_, el) => {
      const href = $(el).attr('href');
      const name = $(el).text().trim();
      if (href) twNames.set(extractId(href), name);
    });
    await sleep(1000);
  }
  
  let updatedCount = 0;
  for (let r of restaurants) {
    const id = extractId(r.url);
    const jpName = jpNames.get(id) || r.name.split(' / ')[0].split(' (')[0].trim(); // fallback
    const twName = twNames.get(id);
    
    if (twName && twName !== jpName) {
      r.name = `${jpName} / ${twName}`;
    } else {
      r.name = jpName;
    }
    updatedCount++;
  }
  
  console.log(`Updated names for ${updatedCount} restaurants.`);
  
  const newJson = JSON.stringify(restaurants, null, 2);
  const newContent = `import { Restaurant } from '../types/restaurant';\n\nexport const tokyoRestaurants: Restaurant[] = ${newJson};\n`;
  fs.writeFileSync(dataPath + '.tmp', newContent);
  fs.renameSync(dataPath + '.tmp', dataPath);
  console.log("Saved restaurants.ts");
}

updateNames();
