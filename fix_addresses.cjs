const fs = require('fs');

const dataPath = 'src/data/restaurants.ts';
let content = fs.readFileSync(dataPath, 'utf-8');

const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
if (!jsonMatch) {
  console.error("Could not find restaurants array");
  process.exit(1);
}

let restaurants = JSON.parse(jsonMatch[1]);
let updated = 0;

for (const r of restaurants) {
  if (r.storeInfo && r.storeInfo['住所']) {
    let rawAddress = r.storeInfo['住所'];
    // Clean up the address
    let cleanAddress = rawAddress.split(' 大きな地図を見る')[0].trim();
    if (r.address !== cleanAddress) {
      r.address = cleanAddress;
      updated++;
    }
  }
}

if (updated > 0) {
  const newJson = JSON.stringify(restaurants, null, 2);
  const newContent = content.replace(jsonMatch[1], newJson);
  fs.writeFileSync(dataPath, newContent);
  console.log(`Updated addresses for ${updated} restaurants.`);
} else {
  console.log('No addresses needed updating.');
}
