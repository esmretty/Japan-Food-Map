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

async function scrapeMissing() {
  const dataPath = 'src/data/restaurants.ts';
  let content = fs.readFileSync(dataPath, 'utf-8');
  
  const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
  if (!jsonMatch) {
    console.error("Could not find restaurants array");
    return;
  }
  
  let restaurants = JSON.parse(jsonMatch[1]);
  
  // Find restaurants missing essential data
  let toScrape = restaurants.filter(r => !r.businessHours || !r.storeInfo || !r.photos || r.photos.length === 0);
  console.log(`Found ${toScrape.length} restaurants left to scrape details.`);
  
  const CONCURRENCY = 15; 
  let count = 0;

  for (let i = 0; i < toScrape.length; i += CONCURRENCY) {
    const batch = toScrape.slice(i, i + CONCURRENCY);
    console.log(`Processing batch ${Math.floor(i/CONCURRENCY) + 1}/${Math.ceil(toScrape.length/CONCURRENCY)}...`);
    
    await Promise.all(batch.map(async (r) => {
      try {
        const html = await fetchPage(r.url);
        if (!html) return;
        const $ = cheerio.load(html);
        
        // Extract Store Info
        const storeInfo = {};
        $('.rstinfo-table tr').each((_, el) => {
          const th = $(el).find('th').text().trim();
          const td = $(el).find('td').text().trim().replace(/\s+/g, ' ');
          if (th && td) {
            storeInfo[th] = td;
          }
        });
        r.storeInfo = storeInfo;

        // Extract Business Hours
        let businessHours = '';
        const hoursTh = $('th').filter((_, el) => $(el).text().includes('営業時間'));
        if (hoursTh.length > 0) {
          const td = hoursTh.next('td');
          const items = td.find('.rstinfo-table__business-item');
          if (items.length > 0) {
            const lines = [];
            items.each((_, item) => {
              const title = $(item).find('.rstinfo-table__business-title').text().trim();
              if (title) {
                const dtl = $(item).find('.rstinfo-table__business-dtl-text').map((_, el) => $(el).text().trim()).get().join(' / ');
                lines.push(`[${title}] ${dtl}`);
              } else {
                let text = $(item).html().replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
                lines.push(text.trim());
              }
            });
            businessHours = lines.join('\n').trim();
          } else {
            businessHours = td.text().replace(/\s+/g, ' ').trim();
          }
        }
        r.businessHours = businessHours;

        // Extract Awards
        const awardsMatch = html.match(/The Tabelog Award \d{4} (Gold|Silver|Bronze)/g) || [];
        r.awards = Array.from(new Set(awardsMatch));
        
        // Extract Hyakumeiten
        const hyakumeitenMatch = html.match(/食べログ [^\s]+ (?:TOKYO )?百名店 \d{4}/g) || [];
        r.hyakumeiten = Array.from(new Set(hyakumeitenMatch));

        // Extract Photos
        const photos = $('img')
          .map((_, img) => $(img).attr('src'))
          .get()
          .filter(src => src && src.includes('restaurant/images'))
          .slice(0, 2);
        r.photos = photos;

        // Extract Description
        const prTitle = $('.pr-comment-title').text().trim();
        let prBody = $('.pr-comment__body').text().trim();
        prBody = prBody.replace(/\.\.\.続きを読む$/, '').trim();
        r.description = prTitle ? `${prTitle}\n${prBody}` : prBody;

        count++;
      } catch (e) {
        console.error(`Failed to scrape ${r.name}:`, e.message);
      }
    }));
    
    // Save progress safely
    try {
      const newJson = JSON.stringify(restaurants, null, 2);
      const newContent = `import { Restaurant } from '../types/restaurant';\n\nexport const tokyoRestaurants: Restaurant[] = ${newJson};\n`;
      fs.writeFileSync(dataPath + '.tmp', newContent);
      fs.renameSync(dataPath + '.tmp', dataPath);
    } catch (e) {
      console.error("Failed to save progress:", e.message);
    }
    
    await sleep(500);
  }
  
  console.log(`Finished! Updated ${count} restaurants.`);
}

scrapeMissing();
