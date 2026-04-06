import fs from 'fs';
import * as cheerio from 'cheerio';
import path from 'path';

// Tabelog 東京主要小區域代碼 (節錄高密度區域)
const areas = [
  "A130101", "A130102", "A130103", "A130201", "A130202", "A130301", "A130302", "A130303",
  "A130401", "A130402", "A130403", "A130501", "A130601", "A130602", "A130603", "A130701",
  "A130702", "A130703", "A130801", "A130802", "A130905", "A131001", "A131101", "A131201",
  "A131401", "A131501"
];

const MAX_SCORE = 3.73; // 最高分數限制 (因為 3.74 以上已經抓過了)
const MIN_SCORE = 3.50; // 最低分數限制
const LIST_DELAY_MS = 3000;   // 列表頁請求間隔 3 秒
const DETAIL_DELAY_MS = 2000; // 詳細頁請求間隔 2 秒

const results = {};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 帶有重試機制的 fetch，避免偶發的網路錯誤或 403 阻擋
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://tabelog.com/'
        }
      });
      if (response.status === 403) {
        console.log(`⚠️ 403 Forbidden. 休息 15 秒後重試... (${i+1}/${retries})`);
        await sleep(15000);
        continue;
      }
      if (response.status === 404) {
        console.log(`⚠️ 404 Not Found. 網址無效或已無下一頁。`);
        return null;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      console.log(`⚠️ 請求失敗: ${error.message}. 休息 5 秒後重試... (${i+1}/${retries})`);
      await sleep(5000);
    }
  }
  return null;
}

// 進入餐廳詳細頁面抓取完整資訊 (座標、營業時間、照片等)
async function scrapeDetailPage(url) {
  const html = await fetchWithRetry(url);
  if (!html) return null;

  const $ = cheerio.load(html);
  const detail = {
    lat: 0,
    lng: 0,
    address: '',
    cuisine: '',
    businessHours: '',
    awards: [],
    hyakumeiten: [],
    photos: [],
    description: '',
    storeInfo: {}
  };

  // 1. 從 JSON-LD 抓取精確的經緯度與地址
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html());
      if (data && data['@type'] === 'Restaurant') {
        if (data.geo) {
          detail.lat = parseFloat(data.geo.latitude) || 0;
          detail.lng = parseFloat(data.geo.longitude) || 0;
        }
        if (data.address && data.address.streetAddress) {
          detail.address = (data.address.addressRegion || '') + (data.address.addressLocality || '') + data.address.streetAddress;
        }
      }
    } catch(e){}
  });

  // 2. 經緯度備用方案：從網頁原始碼的變數中抓取
  if (!detail.lat || !detail.lng) {
     const mapMatch = html.match(/latitude\s*:\s*([\d.]+),\s*longitude\s*:\s*([\d.]+)/);
     if (mapMatch) {
       detail.lat = parseFloat(mapMatch[1]);
       detail.lng = parseFloat(mapMatch[2]);
     }
  }

  // 3. 解析詳細資訊表格 (營業時間、料理種類等)
  $('.c-table--form tr').each((_, el) => {
    const key = $(el).find('th').text().trim();
    const val = $(el).find('td').text().trim().replace(/\s+/g, ' ');
    if (key && val) {
      detail.storeInfo[key] = val;
      if (key.includes('ジャンル')) detail.cuisine = val;
      if (key.includes('営業時間')) detail.businessHours = val;
      if (key.includes('住所') && !detail.address) detail.address = val;
    }
  });

  // 4. 抓取照片
  $('.rstdtl-top-postphoto__item img, .js-image-gallery img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && !detail.photos.includes(src)) detail.photos.push(src);
  });

  // 5. 抓取餐廳描述
  const title = $('.pr-comment-title').text().trim();
  const body = $('.pr-comment-body').text().trim();
  detail.description = [title, body].filter(Boolean).join('\n');

  // 6. 抓取百名店與得獎紀錄
  $('.award-badge, .award-badge-hyakumeiten, .js-award-badge').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('百名店')) {
      detail.hyakumeiten.push(text);
    } else if (text) {
      detail.awards.push(text);
    }
  });

  return detail;
}

async function scrape() {
  console.log('🚀 開始執行 Tabelog 深度爬蟲 (包含座標與詳細資訊)...');
  
  for (const area of areas) {
    let page = 1;
    let keepGoing = true;

    while (keepGoing) {
      const parentArea = area.substring(0, 5); // e.g., A130101 -> A1301
      const listUrl = `https://tabelog.com/tokyo/${parentArea}/${area}/rstLst/${page}/?SrtT=rt&Srt=D`;
      console.log(`\n📍 正在抓取區域 ${area} 的第 ${page} 頁列表...`);
      
      const listHtml = await fetchWithRetry(listUrl);
      if (!listHtml) {
        console.log(`❌ 無法取得列表頁，跳過此頁`);
        break;
      }

      const $ = cheerio.load(listHtml);
      const restaurants = $('.list-rst');

      if (restaurants.length === 0) {
        console.log(`ℹ️ 該區域已無資料`);
        break;
      }

      for (let i = 0; i < restaurants.length; i++) {
        const el = restaurants[i];
        const scoreText = $(el).find('.list-rst__rating-val').text();
        const score = parseFloat(scoreText);

        // 忽略沒有分數的廣告 (PR) 或尚未評分的餐廳
        if (isNaN(score) || score === 0) {
          continue;
        }

        const nameEl = $(el).find('.list-rst__rst-name-target');
        const name = nameEl.text();

        // 如果分數高於我們設定的最大值，代表這家已經抓過了，跳過這家
        if (score > MAX_SCORE) {
          console.log(`  ⏭️ 跳過: ${name} (${score}分) - 高於 ${MAX_SCORE}`);
          continue;
        }

        if (score < MIN_SCORE) {
          console.log(`⏭️ 分數 (${score}) 低於 ${MIN_SCORE}，跳到下一個區域`);
          keepGoing = false;
          break;
        }

        const rstUrl = nameEl.attr('href');
        const id = rstUrl ? rstUrl.split('/').filter(Boolean).pop() : null;

        if (id && name && !results[id]) {
          console.log(`  ⏳ 正在進入詳細頁面抓取: ${name} (${score}分)`);
          
          // 進入詳細頁面抓取座標與其他資訊
          const detail = await scrapeDetailPage(rstUrl);
          
          if (detail) {
            results[id] = { 
              id, 
              name, 
              score, 
              url: rstUrl, 
              ...detail 
            };
            console.log(`  ✅ 成功: ${name} (座標: ${detail.lat}, ${detail.lng})`);
          } else {
            console.log(`  ❌ 失敗: 無法取得 ${name} 的詳細資訊`);
          }

          await sleep(DETAIL_DELAY_MS); // 休息 2 秒避免被封鎖
        }
      }

      if (keepGoing) {
        page++;
        await sleep(LIST_DELAY_MS);
      }
    }
    
    // 確保目錄存在
    const dir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // 每個區域抓完後存檔一次
    fs.writeFileSync(path.join(dir, 'tabelog_new_data.json'), JSON.stringify(Object.values(results), null, 2));
    console.log(`💾 目前已抓取 ${Object.keys(results).length} 筆完整資料並存檔`);
  }
  
  console.log('✅ 全部抓取完成！資料已儲存至 src/data/tabelog_new_data.json');
}

scrape();
