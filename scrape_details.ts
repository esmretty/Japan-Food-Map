import fs from 'fs';
import { JSDOM } from 'jsdom';
import { tokyoRestaurants } from './src/data/restaurants.ts';

async function scrapeAll() {
  const updatedRestaurants = [];
  let count = 0;

  for (const r of tokyoRestaurants) {
    count++;
    console.log(`Scraping ${count}/${tokyoRestaurants.length}: ${r.name} (${r.url})`);
    
    try {
      const res = await fetch(r.url);
      const html = await res.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Extract Business Hours
      let businessHours = '';
      const ths = Array.from(document.querySelectorAll('th'));
      const hoursTh = ths.find(th => th.textContent?.includes('営業時間'));
      
      if (hoursTh && hoursTh.nextElementSibling) {
        const items = hoursTh.nextElementSibling.querySelectorAll('.rstinfo-table__business-item');
        if (items.length > 0) {
          const lines = [];
          items.forEach(item => {
            const titleEl = item.querySelector('.rstinfo-table__business-title');
            if (titleEl) {
              const title = titleEl.textContent?.trim() || '';
              const dtl = Array.from(item.querySelectorAll('.rstinfo-table__business-dtl-text'))
                .map(el => el.textContent?.trim() || '')
                .join(' / ');
              lines.push(`[${title}] ${dtl}`);
            } else {
              // Fallback for items without title/dtl structure
              let text = item.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
              lines.push(text.trim());
            }
          });
          businessHours = lines.join('\n').trim();
        } else {
          // Fallback if the structure is completely different
          businessHours = hoursTh.nextElementSibling.textContent?.replace(/\s+/g, ' ').trim() || '';
        }
      }

      // Extract Awards
      const awards = Array.from(new Set(html.match(/The Tabelog Award \d{4} (Gold|Silver|Bronze)/g) || []));
      
      // Extract Hyakumeiten
      const hyakumeiten = Array.from(new Set(html.match(/食べログ [^\s]+ (?:TOKYO )?百名店 \d{4}/g) || []));

      // Extract Photos
      const photos = Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src.includes('restaurant/images'))
        .slice(0, 2);

      // Extract Description
      const prTitle = document.querySelector('.pr-comment-title')?.textContent?.trim() || '';
      let prBody = document.querySelector('.pr-comment__body')?.textContent?.trim() || '';
      prBody = prBody.replace(/\.\.\.続きを読む$/, '').trim();
      const description = prTitle ? `${prTitle}\n${prBody}` : prBody;

      updatedRestaurants.push({
        ...r,
        businessHours,
        awards,
        hyakumeiten,
        photos,
        description
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e) {
      console.error(`Error scraping ${r.name}:`, e);
      updatedRestaurants.push({
        ...r,
        businessHours: '',
        awards: [],
        hyakumeiten: []
      });
    }
  }

  // Write back to a new file or overwrite
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
}

export const tokyoRestaurants: Restaurant[] = ${JSON.stringify(updatedRestaurants, null, 2)};
`;

  fs.writeFileSync('./src/data/restaurants.ts', fileContent, 'utf8');
  console.log('Successfully updated src/data/restaurants.ts');
}

scrapeAll();
