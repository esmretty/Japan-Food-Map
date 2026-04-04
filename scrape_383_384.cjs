const fs = require('fs');
const cheerio = require('cheerio');

const BASE_URL = 'https://tabelog.com/tokyo/rstLst/';
const START_SCORE = 3.83;
const END_SCORE = 3.84;

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
  throw new Error(`Failed to fetch ${url}`);
}

async function getRestaurantDetails(url) {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    
    // Extract lat/lng from map image URL
    const mapImg = $('img.rstinfo-table__map-image').attr('data-original');
    let lat = 0, lng = 0;
    if (mapImg) {
      const match = mapImg.match(/markers=([^&]+)/);
      if (match) {
        const parts = match[1].split('%2C');
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      }
    }

    // Extract business hours
    const businessHours = $('th:contains("営業時間")').next('td').text().trim().replace(/\s+/g, ' ');

    // Extract photos (up to 2)
    const photos = [];
    $('.js-image-slider img').each((i, el) => {
      if (i < 2) {
        photos.push($(el).attr('src') || $(el).attr('data-original'));
      }
    });

    // Extract description
    const description = $('.pr-comment-title').text().trim() || $('.pr-comment-body').text().trim();

    return { lat, lng, businessHours, photos: photos.filter(Boolean), description };
  } catch (e) {
    console.log(`Error getting details for ${url}: ${e.message}`);
    return { lat: 0, lng: 0, businessHours: '', photos: [], description: '' };
  }
}

async function scrape() {
  const restaurants = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    console.log(`Fetching page ${page}...`);
    const url = `${BASE_URL}${page}/?SrtT=rt&Srt=D&sort_mode=1&svd=20240501&svt=1900&svps=2&RdoCosTp=2&score_min=${START_SCORE}&score_max=${END_SCORE}`;
    
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    
    const items = $('.list-rst');
    if (items.length === 0) {
      hasNext = false;
      break;
    }

    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      const nameEl = $(el).find('.list-rst__rst-name-target');
      const name = nameEl.text().trim();
      const rstUrl = nameEl.attr('href');
      if (!rstUrl) continue;
      const id = rstUrl.match(/\/tokyo\/A\d+\/A\d+\/(\d+)\//)?.[1];
      
      const scoreText = $(el).find('.list-rst__rating-val').text().trim();
      const score = parseFloat(scoreText);
      
      if (isNaN(score) || score < START_SCORE || score > END_SCORE) continue;

      const cuisine = $(el).find('.list-rst__area-genre').text().trim().split(' / ')[1] || '';
      
      const awards = [];
      $(el).find('.list-rst__award-icon').each((_, icon) => {
        awards.push($(icon).attr('alt'));
      });

      const hyakumeiten = [];
      $(el).find('.list-rst__hyakumeiten-icon').each((_, icon) => {
        hyakumeiten.push($(icon).attr('alt'));
      });

      console.log(`Fetching details for ${name} (${score})...`);
      const details = await getRestaurantDetails(rstUrl);
      
      restaurants.push({
        id,
        name,
        score,
        cuisine,
        url: rstUrl,
        awards,
        hyakumeiten,
        ...details
      });
      
      await sleep(1000); // Rate limiting
    }

    const nextBtn = $('.c-pagination__item--next');
    if (nextBtn.length === 0 || nextBtn.hasClass('is-disabled')) {
      hasNext = false;
    } else {
      page++;
      await sleep(2000);
    }
  }

  fs.writeFileSync('new_restaurants.json', JSON.stringify(restaurants, null, 2));
  console.log(`Scraped ${restaurants.length} restaurants.`);
}

scrape();
