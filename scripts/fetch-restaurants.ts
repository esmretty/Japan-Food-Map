import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// 23 wards + major cities in Tokyo
const TOKYO_AREAS = [
  { code: 'C13101', name: '千代田区' },
  { code: 'C13102', name: '中央区' },
  { code: 'C13103', name: '港区' },
  { code: 'C13104', name: '新宿区' },
  { code: 'C13105', name: '文京区' },
  { code: 'C13106', name: '台東区' },
  { code: 'C13107', name: '墨田区' },
  { code: 'C13108', name: '江東区' },
  { code: 'C13109', name: '品川区' },
  { code: 'C13110', name: '目黒区' },
  { code: 'C13111', name: '大田区' },
  { code: 'C13112', name: '世田谷区' },
  { code: 'C13113', name: '渋谷区' },
  { code: 'C13114', name: '中野区' },
  { code: 'C13115', name: '杉並区' },
  { code: 'C13116', name: '豊島区' },
  { code: 'C13117', name: '北区' },
  { code: 'C13118', name: '荒川区' },
  { code: 'C13119', name: '板橋区' },
  { code: 'C13120', name: '練馬区' },
  { code: 'C13121', name: '足立区' },
  { code: 'C13122', name: '葛飾区' },
  { code: 'C13123', name: '江戸川区' },
  { code: 'C13201', name: '八王子市' },
  { code: 'C13202', name: '立川市' },
  { code: 'C13203', name: '武蔵野市' },
  { code: 'C13204', name: '三鷹市' },
  { code: 'C13208', name: '調布市' },
  { code: 'C13209', name: '町田市' }
];

const MAX_PAGES = 60;
const CONCURRENCY = 10; // Reduced concurrency to avoid bans
const MIN_SCORE_THRESHOLD = 3.4;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchList(areaCode: string, page: number): Promise<{ urls: string[], minScore: number }> {
  const url = `https://tabelog.com/tokyo/${areaCode}/rstLst/${page}/?SrtT=rt&Srt=D&sort_mode=1`;
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    const urls: string[] = [];
    let minScore = 5.0;

    $('.list-rst').each((_, el) => {
      const href = $(el).find('.list-rst__rst-name-target').attr('href');
      const scoreText = $(el).find('.list-rst__rating-val').text().trim();
      const score = parseFloat(scoreText) || 0;
      
      if (href) {
        urls.push(href);
        if (score > 0 && score < minScore) {
          minScore = score;
        }
      }
    });

    return { urls: urls.filter(u => u), minScore };
  } catch (err) {
    console.error(`Error fetching list page ${page} for area ${areaCode}:`, err);
    return { urls: [], minScore: 0 };
  }
}

async function fetchDetail(url: string) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const jsonLdStr = $('script[type="application/ld+json"]').html();
    let lat = 0, lng = 0;
    if (jsonLdStr) {
      try {
        const jsonLd = JSON.parse(jsonLdStr);
        if (jsonLd.geo) {
          lat = parseFloat(jsonLd.geo.latitude);
          lng = parseFloat(jsonLd.geo.longitude);
        }
      } catch (e) {}
    }
    
    if (!lat || !lng) {
      const match = html.match(/lat[^0-9]*([0-9.]+).*?lng[^0-9]*([0-9.]+)/i);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      }
    }

    const name = $('h2.display-name').text().trim() || $('title').text().split('-')[0].trim();
    const score = parseFloat($('.rdheader-rating__score-val-dtl').text().trim()) || 0;
    const cuisine = $('#RstLstByTabelogAward').length ? '日本料理' : $('.rdheader-subinfo__item--genre').text().trim().replace(/\s+/g, ' ');
    const address = $('.rstinfo-table__address').text().trim().replace(/\s+/g, ' ');
    const businessHours = $('.rstinfo-table__info-hours').text().trim().replace(/\s+/g, ' ');
    
    const photos: string[] = [];
    $('.rstdtl-top-postphoto__item img').each((_, el) => {
      photos.push($(el).attr('src') || '');
    });

    const description = $('.pr-comment-wrap').text().trim().replace(/\s+/g, ' ');

    return {
      id: url.split('/').filter(Boolean).pop(),
      name,
      score,
      cuisine,
      url,
      lat,
      lng,
      businessHours,
      awards: [],
      hyakumeiten: [],
      photos: photos.filter(Boolean),
      description,
      storeInfo: {},
      address,
      googleMapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    };
  } catch (err) {
    console.error(`Error fetching ${url}:`, err);
    return null;
  }
}

async function run() {
  console.log('Starting to fetch restaurants by area...');
  let allUrls = new Set<string>();
  
  for (const area of TOKYO_AREAS) {
    console.log(`\n--- Fetching area: ${area.name} (${area.code}) ---`);
    for (let i = 1; i <= MAX_PAGES; i++) {
      console.log(`Fetching page ${i}...`);
      const { urls, minScore } = await fetchList(area.code, i);
      
      if (urls.length === 0) {
        console.log(`No more restaurants found on page ${i}. Moving to next area.`);
        break;
      }
      
      urls.forEach(u => allUrls.add(u));
      
      if (minScore > 0 && minScore < MIN_SCORE_THRESHOLD) {
        console.log(`Minimum score on page ${i} is ${minScore}, which is below threshold ${MIN_SCORE_THRESHOLD}. Stopping this area.`);
        break;
      }
      
      await sleep(1000); // Sleep 1 second between list pages
    }
  }
  
  const uniqueUrls = Array.from(allUrls);
  console.log(`\nFound ${uniqueUrls.length} unique URLs across all areas. Fetching details...`);
  
  const results = [];
  for (let i = 0; i < uniqueUrls.length; i += CONCURRENCY) {
    const chunk = uniqueUrls.slice(i, i + CONCURRENCY);
    console.log(`Fetching details ${i + 1} to ${i + chunk.length} of ${uniqueUrls.length}...`);
    const promises = chunk.map(async url => {
      await sleep(Math.random() * 2000); // Random sleep up to 2s per request
      return fetchDetail(url);
    });
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults.filter(r => r));
    await sleep(2000); // Sleep 2 seconds between chunks
  }
  
  // Sort by score descending
  results.sort((a, b) => (b?.score || 0) - (a?.score || 0));
  
  fs.writeFileSync(path.join(process.cwd(), 'public', 'restaurants.json'), JSON.stringify(results, null, 2));
  console.log(`\nSuccessfully saved ${results.length} restaurants to public/restaurants.json`);
}

run();
