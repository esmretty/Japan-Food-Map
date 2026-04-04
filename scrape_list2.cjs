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

async function scrapeList() {
  const dataPath = 'src/data/restaurants.ts';
  let content = fs.readFileSync(dataPath, 'utf-8');
  
  const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
  if (!jsonMatch) {
    console.error("Could not find restaurants array");
    return;
  }
  
  let restaurants = JSON.parse(jsonMatch[1]);
  const existingUrls = new Set(restaurants.map(r => r.url));
  let newRestaurants = [];
  
  // Continue from page 31
  for (let page = 31; page <= 60; page++) {
    console.log(`Fetching page ${page}...`);
    const url = `https://tabelog.com/tokyo/rstLst/${page}/?SrtT=rt&Srt=D&sort_mode=1`;
    
    const html = await fetchPage(url);
    if (!html) continue;
    
    const $ = cheerio.load(html);
    const items = $('.list-rst');
    
    if (items.length === 0) break;
    
    let foundBelowRange = false;

    items.each((_, el) => {
      const $el = $(el);
      const name = $el.find('.list-rst__rst-name-target').text().trim();
      const rstUrl = $el.find('.list-rst__rst-name-target').attr('href');
      const scoreStr = $el.find('.list-rst__rating-val').text().trim();
      const score = parseFloat(scoreStr);
      
      if (score >= 3.80 && score <= 3.84) {
        if (rstUrl && !existingUrls.has(rstUrl)) {
          const cuisine = $el.find('.list-rst__area-genre').text().trim().split(' / ')[1] || '其他';
          const address = $el.find('.list-rst__address').text().trim();
          
          newRestaurants.push({
            id: rstUrl.split('/').filter(Boolean).pop() || Math.random().toString(36).substring(7),
            name,
            url: rstUrl,
            score,
            cuisine,
            address,
            lat: 0,
            lng: 0,
            photos: [],
            awards: [],
            hyakumeiten: []
          });
          existingUrls.add(rstUrl);
        }
      } else if (score < 3.80) {
        foundBelowRange = true;
      }
    });
    
    if (foundBelowRange) {
      console.log("Reached scores below 3.80. Stopping.");
      break;
    }
    
    await sleep(2000);
  }
  
  console.log(`Found ${newRestaurants.length} new restaurants in 3.80-3.84 range.`);
  
  if (newRestaurants.length > 0) {
    restaurants = [...restaurants, ...newRestaurants];
    restaurants.sort((a, b) => b.score - a.score);
    
    const newJson = JSON.stringify(restaurants, null, 2);
    const newContent = content.replace(jsonMatch[1], newJson);
    fs.writeFileSync(dataPath, newContent);
    console.log("Saved to restaurants.ts. Now run scrape_all.cjs to get their details.");
  }
}

scrapeList();
