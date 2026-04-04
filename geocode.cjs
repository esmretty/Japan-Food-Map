const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeRestaurants() {
  const dataPath = 'src/data/restaurants.ts';
  let content = fs.readFileSync(dataPath, 'utf-8');
  
  const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
  if (!jsonMatch) {
    console.error("Could not find restaurants array");
    return;
  }
  
  let restaurants = JSON.parse(jsonMatch[1]);
  let toGeocode = restaurants.filter(r => r.lat === 0 && r.lng === 0).slice(0, 50);
  console.log(`Found ${toGeocode.length} restaurants left to geocode in this batch.`);
  
  let count = 0;
  let iterations = 0;

  for (const r of toGeocode) {
    iterations++;
    try {
      // Clean address: take only the part before any space (removes building names)
      let cleanAddress = r.address
        .replace(/東京都/, '') // Remove Tokyo as it's implied and sometimes confuses the geocoder
        .replace(/[0-9]+-[0-9]+-[0-9]+.*/, '') // Remove specific building numbers
        .replace(/[0-9]+-[0-9]+.*/, '') // Remove specific building numbers
        .replace(/ビル.*/, '') // Remove building names
        .replace(/B[0-9]+F.*/, '') // Remove basement floors
        .replace(/[0-9]+F.*/, '') // Remove floors
        .split(' ')[0]
        .trim();
        
      // If address becomes too short, use the original but just remove building info
      if (cleanAddress.length < 3) {
          cleanAddress = r.address.replace(/ビル.*/, '').replace(/[0-9]+F.*/, '').trim();
      }

      const query = encodeURIComponent(cleanAddress + ' 東京');
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TokyoRestaurantMap-v2/1.0 (contact: retty.liu@gmail.com)'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error(`Failed to parse JSON for ${r.name}. Response text:`, await response.text().catch(() => 'Could not read text'));
        throw e;
      }
      
      if (data && data.length > 0) {
        r.lat = parseFloat(data[0].lat);
        r.lng = parseFloat(data[0].lon);
        count++;
        console.log(`Geocoded ${r.name}: ${r.lat}, ${r.lng}`);
      } else {
        // Fallback: Try just the ward/city
        const wardMatch = r.address.match(/東京都([^区市]+[区市])/);
        if (wardMatch) {
          const fallbackQuery = encodeURIComponent(wardMatch[1] + ' 東京');
          const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${fallbackQuery}&limit=1`;
          const fallbackController = new AbortController();
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 5000);
          
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              'User-Agent': 'TokyoRestaurantMap-v2/1.0 (contact: retty.liu@gmail.com)'
            },
            signal: fallbackController.signal
          });
          clearTimeout(fallbackTimeoutId);
          
          const fallbackData = await fallbackResponse.json();
          if (fallbackData && fallbackData.length > 0) {
            r.lat = parseFloat(fallbackData[0].lat);
            r.lng = parseFloat(fallbackData[0].lon);
            count++;
            console.log(`Geocoded (fallback) ${r.name}: ${r.lat}, ${r.lng}`);
          } else {
             console.log(`Could not geocode ${r.name} with address ${cleanAddress}`);
          }
        } else {
           console.log(`Could not geocode ${r.name} with address ${cleanAddress}`);
        }
      }
    } catch (e) {
      console.error(`Failed to geocode ${r.name}:`, e.message);
    }
    
    // Save progress periodically
    if (iterations % 10 === 0) {
      let currentContent = fs.readFileSync(dataPath, 'utf-8');
      const match = currentContent.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
      if (match) {
        const newJson = JSON.stringify(restaurants, null, 2);
        const newContent = currentContent.replace(match[1], newJson);
        fs.writeFileSync(dataPath, newContent);
        console.log(`Saved progress at iteration ${iterations}`);
      }
    }
    
    await sleep(2000); // Respect Nominatim rate limits (1 request per second absolute minimum, 2 is safer)
  }
  
  // Final save
  let currentContent = fs.readFileSync(dataPath, 'utf-8');
  const match = currentContent.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
  if (match) {
    const newJson = JSON.stringify(restaurants, null, 2);
    const newContent = currentContent.replace(match[1], newJson);
    fs.writeFileSync(dataPath, newContent);
  }
  
  console.log(`Finished! Geocoded ${count} restaurants.`);
}

geocodeRestaurants();
