const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const dataPath = path.join(__dirname, 'src/data/restaurants.ts');
let content = fs.readFileSync(dataPath, 'utf-8');

const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
if (!jsonMatch) {
  console.error("Could not find restaurants array");
  process.exit(1);
}

let restaurants = JSON.parse(jsonMatch[1]);

// First, clean up the romaji we added previously
restaurants.forEach(r => {
  r.name = r.name.replace(/ \([a-zA-Z・ ヶィゥァ]+\)+/g, '').trim();
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeTwNames() {
  let updatedCount = 0;
  let count = 0;
  
  // Only process those that need translation or we can process all to be safe.
  // The user said "把所有翻譯都砍掉，然後去tabelog上的"繁體中文"版本找到每一家店的中文翻譯，以這個為準(每一家店都有)"
  // Since there are 1023 restaurants, fetching all might take a long time and timeout.
  // Let's do it in batches or just do the ones that have katakana?
  // User said "每一家店都有" (every store has it) and "之後我們新增新的店，你也都要用同樣方法抓到正確的中文翻譯"
  // Let's add a `twName` field or replace `name`? "以這個為準" means replace the name or append it.
  // Let's append it like `Original Name (TW Name)` or just replace?
  // Usually, keeping the original name is good for searching, so `Original Name (TW Name)` is better, or just replace if they differ.
  // Let's fetch for a few to see what the TW name looks like.
}

scrapeTwNames();
