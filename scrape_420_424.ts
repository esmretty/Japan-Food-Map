import fs from 'fs';
import { JSDOM } from 'jsdom';
import { tokyoRestaurants, type Restaurant } from './src/data/restaurants.ts';

async function scrapeNewBatch() {
  const newRestaurants: Restaurant[] = [];
  let page = 7; // Start from page 7 since 4.25+ ended there
  let keepGoing = true;

  while (keepGoing) {
    console.log(`Scraping list page ${page}...`);
    const listUrl = `https://tabelog.com/tokyo/rstLst/${page}/?SrtT=rt&Srt=D&sort_mode=1`;
    const res = await fetch(listUrl);
    const html = await res.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const items = document.querySelectorAll('.list-rst');
    if (items.length === 0) {
      console.log('No more items found on list page.');
      break;
    }

    for (const item of items) {
      const nameEl = item.querySelector('.list-rst__rst-name-target');
      const scoreEl = item.querySelector('.list-rst__rating-val');
      const areaGenreEl = item.querySelector('.list-rst__area-genre');
      
      if (!nameEl || !scoreEl || !areaGenreEl) continue;

      const name = nameEl.textContent?.trim() || '';
      const url = (nameEl as HTMLAnchorElement).href;
      const score = parseFloat(scoreEl.textContent?.trim() || '0');
      const areaGenre = areaGenreEl.textContent?.trim() || '';
      
      // Extract cuisine (usually after the area, separated by ' / ')
      let cuisine = areaGenre.split(' / ')[1]?.trim() || areaGenre;

      if (score > 4.24) {
        continue; // Skip, already have these
      }
      if (score < 4.20) {
        console.log(`Score dropped to ${score}. Stopping.`);
        keepGoing = false;
        break;
      }

      // Check if already in our list
      if (tokyoRestaurants.some(r => r.url === url)) {
        continue;
      }

      console.log(`Found new restaurant: ${name} (${score})`);
      
      // Fetch detail page
      try {
        const detailRes = await fetch(url);
        const detailHtml = await detailRes.text();
        const detailDom = new JSDOM(detailHtml);
        const detailDoc = detailDom.window.document;

        // Extract lat/lng
        let lat = 0, lng = 0;
        const latMatch = detailHtml.match(/"latitude":([\d.]+)/);
        const lngMatch = detailHtml.match(/"longitude":([\d.]+)/);
        if (latMatch && lngMatch) {
          lat = parseFloat(latMatch[1]);
          lng = parseFloat(lngMatch[1]);
        }

        // Extract ID from URL
        const idMatch = url.match(/\/(\d+)\/?$/);
        const id = idMatch ? idMatch[1] : Date.now().toString();

        // Extract Business Hours
        let businessHours = '';
        const ths = Array.from(detailDoc.querySelectorAll('th'));
        const hoursTh = ths.find(th => th.textContent?.includes('営業時間'));
        
        if (hoursTh && hoursTh.nextElementSibling) {
          const bItems = hoursTh.nextElementSibling.querySelectorAll('.rstinfo-table__business-item');
          if (bItems.length > 0) {
            const lines = [];
            bItems.forEach(bItem => {
              const titleEl = bItem.querySelector('.rstinfo-table__business-title');
              if (titleEl) {
                const title = titleEl.textContent?.trim() || '';
                const dtl = Array.from(bItem.querySelectorAll('.rstinfo-table__business-dtl-text'))
                  .map(el => el.textContent?.trim() || '')
                  .join(' / ');
                lines.push(`[${title}] ${dtl}`);
              } else {
                let text = bItem.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
                lines.push(text.trim());
              }
            });
            businessHours = lines.join('\n').trim();
          } else {
            businessHours = hoursTh.nextElementSibling.textContent?.replace(/\s+/g, ' ').trim() || '';
          }
        }

        // Extract Awards
        const awards = Array.from(new Set(detailHtml.match(/The Tabelog Award \d{4} (Gold|Silver|Bronze)/g) || []));
        
        // Extract Hyakumeiten
        const hyakumeiten = Array.from(new Set(detailHtml.match(/食べログ [^\s]+ (?:TOKYO )?百名店 \d{4}/g) || []));

        // Extract Photos
        const photos = Array.from(detailDoc.querySelectorAll('img'))
          .map(img => img.src)
          .filter(src => src.includes('restaurant/images'))
          .slice(0, 2);

        // Extract Description
        const prTitle = detailDoc.querySelector('.pr-comment-title')?.textContent?.trim() || '';
        let prBody = detailDoc.querySelector('.pr-comment__body')?.textContent?.trim() || '';
        prBody = prBody.replace(/\.\.\.続きを読む$/, '').trim();
        const description = prTitle ? `${prTitle}\n${prBody}` : prBody;

        newRestaurants.push({
          id,
          name,
          score,
          cuisine,
          lat,
          lng,
          url,
          businessHours,
          awards,
          hyakumeiten,
          photos,
          description
        });

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.error(`Error scraping detail for ${name}:`, e);
      }
    }
    page++;
  }

  console.log(`Finished scraping. Found ${newRestaurants.length} new restaurants.`);

  // Write back to file
  const allRestaurants = [...tokyoRestaurants, ...newRestaurants];
  
  const fileContent = `export interface Restaurant {
  id: string;
  name: string;
  score: number;
  cuisine: string;
  lat: number;
  lng: number;
  url: string;
  businessHours?: string;
  awards?: string[];
  hyakumeiten?: string[];
  photos?: string[];
  description?: string;
}

export const tokyoRestaurants: Restaurant[] = ${JSON.stringify(allRestaurants, null, 2)};
`;

  fs.writeFileSync('./src/data/restaurants.ts', fileContent);
  console.log('Successfully updated src/data/restaurants.ts');
}

scrapeNewBatch().catch(console.error);
