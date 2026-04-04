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

async function restoreAll() {
  const dataPath = 'src/data/restaurants.ts';
  let content = fs.readFileSync(dataPath, 'utf-8');
  
  const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
  if (!jsonMatch) {
    console.error("Could not find restaurants array");
    return;
  }
  
  let restaurants = JSON.parse(jsonMatch[1]);
  const existingMap = new Map(restaurants.map(r => [r.url, r]));
  let newCount = 0;
  
  for (let page = 1; page <= 60; page++) {
    console.log(`Fetching page ${page}...`);
    const url = `https://tabelog.com/tokyo/rstLst/${page}/?SrtT=rt&Srt=D&sort_mode=1`;
    
    const html = await fetchPage(url);
    if (!html) continue;
    
    const $ = cheerio.load(html);
    const items = $('.list-rst');
    
    if (items.length === 0) break;

    items.each((_, el) => {
      const $el = $(el);
      const name = $el.find('.list-rst__rst-name-target').text().trim();
      const rstUrl = $el.find('.list-rst__rst-name-target').attr('href');
      const scoreStr = $el.find('.list-rst__rating-val').text().trim();
      const score = parseFloat(scoreStr);
      
      if (rstUrl && !existingMap.has(rstUrl)) {
        let cuisine = $el.find('.list-rst__area-genre').text().trim().split(' / ')[1] || '其他';
        cuisine = cuisine.trim();
        const address = $el.find('.list-rst__address').text().trim();
        
        existingMap.set(rstUrl, {
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
        newCount++;
      }
    });
    
    await sleep(1500);
  }
  
  console.log(`Found ${newCount} new restaurants. Total will be ${existingMap.size}.`);
  
  if (newCount > 0) {
    const allRestaurants = Array.from(existingMap.values());
    // Sort by score descending
    allRestaurants.sort((a, b) => b.score - a.score);
    
    const newContent = content.replace(
      /export const tokyoRestaurants: Restaurant\[\] = \[[\s\S]*\];/,
      `export const tokyoRestaurants: Restaurant[] = ${JSON.stringify(allRestaurants, null, 2)};`
    );
    
    fs.writeFileSync(dataPath, newContent);
    console.log("Successfully updated restaurants.ts");
  }
}

restoreAll();
