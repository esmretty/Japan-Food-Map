import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const MAX_PAGES = 60; // 60 pages * 20 = 1200 restaurants
const CONCURRENCY = 20;

async function fetchList(page: number) {
  const url = `https://tabelog.com/tokyo/rstLst/${page}/?SrtT=rt&Srt=D&sort_mode=1`;
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  const urls: string[] = [];
  $('.list-rst__rst-name-target').each((_, el) => {
    urls.push($(el).attr('href') || '');
  });
  return urls.filter(u => u);
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
    const cuisine = $('#RstLstByTabelogAward').length ? '日本料理' : $('.rdheader-subinfo__item--genre').text().trim().replace(/\\s+/g, ' ');
    const address = $('.rstinfo-table__address').text().trim().replace(/\\s+/g, ' ');
    const businessHours = $('.rstinfo-table__info-hours').text().trim().replace(/\\s+/g, ' ');
    
    const photos: string[] = [];
    $('.rstdtl-top-postphoto__item img').each((_, el) => {
      photos.push($(el).attr('src') || '');
    });

    const description = $('.pr-comment-wrap').text().trim().replace(/\\s+/g, ' ');

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
  console.log('Fetching lists...');
  let allUrls: string[] = [];
  for (let i = 1; i <= MAX_PAGES; i++) {
    console.log(`Fetching page ${i}...`);
    const urls = await fetchList(i);
    allUrls = allUrls.concat(urls);
  }
  
  console.log(`Found ${allUrls.length} URLs. Fetching details...`);
  
  const results = [];
  for (let i = 0; i < allUrls.length; i += CONCURRENCY) {
    const chunk = allUrls.slice(i, i + CONCURRENCY);
    console.log(`Fetching details ${i + 1} to ${i + chunk.length}...`);
    const promises = chunk.map(url => fetchDetail(url));
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults.filter(r => r));
  }
  
  fs.writeFileSync(path.join(process.cwd(), 'public', 'restaurants.json'), JSON.stringify(results, null, 2));
  console.log(`Saved ${results.length} restaurants to public/restaurants.json`);
}

run();
