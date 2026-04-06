import fs from 'fs';
import * as cheerio from 'cheerio';
import path from 'path';
import { execSync } from 'child_process';

// 東京主要細分區域 (64個)
const areas = [
  "A130101", "A130102", "A130103", // 銀座、新橋、有楽町
  "A130201", "A130202", "A130203", "A130204", // 東京、丸の内、日本橋
  "A130301", "A130302", "A130303", // 渋谷、恵比寿、代官山
  "A130401", "A130402", "A130403", "A130404", // 新宿、代々木、大久保
  "A130501", "A130502", "A130503", "A130504", // 池袋、目白
  "A130601", "A130602", "A130603", // 原宿、表参道、青山
  "A130701", "A130702", "A130703", "A130704", // 六本木、麻布、広尾
  "A130801", "A130802", "A130803", // 赤坂、溜池山王
  "A130901", "A130902", "A130903", "A130904", "A130905", // 神楽坂、飯田橋、四ツ谷
  "A131001", "A131002", "A131003", "A131004", // 秋葉原、神田、御茶ノ水
  "A131101", "A131102", "A131103", // 上野、浅草、日暮里
  "A131201", "A131202", "A131203", // 錦糸町、両国
  "A131301", "A131302", "A131303", // 築地、月島、門前仲町
  "A131401", "A131402", "A131403", // 浜松町、田町、品川
  "A131501", "A131502", "A131503", // 大井町、大森、蒲田
  "A131601", "A131602", "A131603", // 目黒、白金、五反田
  "A131701", "A131702", "A131703", // 中目黒、三軒茶屋、二子玉川
  "A131801", "A131802", // 下北沢、明大前
  "A131901", "A131902", // 中野、高円寺
  "A132001", "A132002", // 吉祥寺、三鷹
];

const MAX_SCORE = 5.00;
const MIN_SCORE = 3.40;
const LIST_DELAY_MS = 2500;
const DETAIL_DELAY_MS = 2000;

// 取得當前執行的 Part (1~4)
const totalParts = 4;
const partIndex = parseInt(process.argv[2], 10) || 1;
const chunkSize = Math.ceil(areas.length / totalParts);
const myAreas = areas.slice((partIndex - 1) * chunkSize, partIndex * chunkSize);

const dir = path.join(process.cwd(), 'src', 'data');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const dataPath = path.join(dir, `tabelog_part${partIndex}.json`);
const progressPath = path.join(dir, `progress_part${partIndex}.json`);

let results = {};
let completedAreas = [];

// 讀取斷點續傳資料
if (fs.existsSync(dataPath)) {
  try {
    const existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    existingData.forEach(item => results[item.id] = item);
    console.log(`📂 已載入既有資料，共 ${existingData.length} 筆`);
  } catch (e) {
    console.log('⚠️ 讀取既有資料失敗，將重新開始');
  }
}

if (fs.existsSync(progressPath)) {
  try {
    completedAreas = JSON.parse(fs.readFileSync(progressPath, 'utf8')).completedAreas || [];
    console.log(`📂 已載入進度，已完成區域: ${completedAreas.join(', ')}`);
  } catch (e) {}
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function commitAndPush(area) {
  try {
    console.log(`\n📦 準備提交區域 ${area} 的進度...`);
    execSync('git config --local user.email "action@github.com"');
    execSync('git config --local user.name "GitHub Action"');
    execSync('git add src/data/');
    
    const status = execSync('git status --porcelain').toString();
    if (!status) {
        console.log('沒有需要提交的變更。');
        return;
    }
    
    execSync(`git commit -m "Auto-update Tabelog data: Part ${partIndex} - Area ${area}"`);
    
    let pushed = false;
    for (let i = 0; i < 5; i++) {
        try {
            console.log(`⬇️ 正在拉取最新程式碼 (嘗試 ${i+1}/5)...`);
            execSync('git pull --rebase origin main');
            console.log(`⬆️ 正在推送到 GitHub (嘗試 ${i+1}/5)...`);
            execSync('git push origin main');
            pushed = true;
            console.log(`✅ 區域 ${area} 進度已成功推送到 GitHub！\n`);
            break;
        } catch (pushErr) {
            console.log(`⚠️ 推送失敗，等待隨機時間後重試...`);
            await sleep(Math.floor(Math.random() * 8000) + 2000);
        }
    }
    if (!pushed) {
        console.log(`❌ 放棄推送區域 ${area}，將在下一個區域完成時再次嘗試。`);
    }
  } catch (error) {
    console.log(`⚠️ Git 提交過程發生錯誤: ${error.message}`);
  }
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'ja-JP,ja;q=0.9,zh-TW;q=0.8,zh;q=0.7,en-US;q=0.6,en;q=0.5',
          'Referer': 'https://tabelog.com/'
        }
      });
      if (response.status === 403) {
        console.log(`⚠️ 403 Forbidden. 休息 15 秒後重試... (${i+1}/${retries})`);
        await sleep(15000);
        continue;
      }
      if (response.status === 404) {
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

async function scrapeTwName(url) {
  try {
    const twUrl = url.replace('tabelog.com/', 'tabelog.com/tw/');
    const html = await fetchWithRetry(twUrl);
    if (!html) return '';
    const $ = cheerio.load(html);
    
    let nameTw = '';
    const headerName = $('.rd-header__rst-name-main').text().trim();
    if (headerName) {
      nameTw = headerName;
    } else {
      const title = $('title').text();
      if (title) {
        nameTw = title.split('-')[0].trim();
      }
    }
    return nameTw;
  } catch (e) {
    return '';
  }
}

async function scrapeDetailPage(url, name) {
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
    storeInfo: {},
    nameTw: '',
    googleMapUrl: ''
  };

  detail.nameTw = await scrapeTwName(url);

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

  if (!detail.lat || !detail.lng) {
     const mapMatch = html.match(/latitude\s*:\s*([\d.]+),\s*longitude\s*:\s*([\d.]+)/);
     if (mapMatch) {
       detail.lat = parseFloat(mapMatch[1]);
       detail.lng = parseFloat(mapMatch[2]);
     }
  }

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

  $('.rstdtl-top-postphoto__item img, .js-image-gallery img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && !detail.photos.includes(src)) detail.photos.push(src);
  });

  const title = $('.pr-comment-title').text().trim();
  const body = $('.pr-comment-body').text().trim();
  detail.description = [title, body].filter(Boolean).join('\n');

  $('.award-badge, .award-badge-hyakumeiten, .js-award-badge').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('百名店')) {
      detail.hyakumeiten.push(text);
    } else if (text) {
      detail.awards.push(text);
    }
  });

  if (detail.address) {
    detail.googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + detail.address)}`;
  }

  return detail;
}

async function scrape() {
  console.log(`🚀 開始執行 Tabelog 深度爬蟲 Part ${partIndex}/4 (目標: >= 3.40)...`);
  console.log(`負責區域: ${myAreas.join(', ')}`);
  
  for (const area of myAreas) {
    if (completedAreas.includes(area)) {
      console.log(`\n⏭️ 區域 [${area}] 已經抓取過，直接跳過...`);
      continue;
    }

    let page = 1;
    let keepGoing = true;

    while (keepGoing) {
      const parentArea = area.substring(0, 5);
      const listUrl = `https://tabelog.com/tokyo/${parentArea}/${area}/rstLst/${page}/?SrtT=rt&Srt=D`;
      console.log(`\n📍 [${area}] 正在抓取第 ${page} 頁列表... (目前總計: ${Object.keys(results).length} 家)`);
      
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

        if (isNaN(score) || score === 0) continue;

        const nameEl = $(el).find('.list-rst__rst-name-target');
        const name = nameEl.text();

        if (score > MAX_SCORE) continue;

        if (score < MIN_SCORE) {
          console.log(`⏭️ 分數 (${score}) 低於 ${MIN_SCORE}，跳到下一個區域`);
          keepGoing = false;
          break;
        }

        const rstUrl = nameEl.attr('href');
        const id = rstUrl ? rstUrl.split('/').filter(Boolean).pop() : null;

        if (id && name && !results[id]) {
          console.log(`  ⏳ 抓取詳細: ${name} (${score}分)`);
          
          const detail = await scrapeDetailPage(rstUrl, name);
          
          if (detail) {
            results[id] = { 
              id, 
              name, 
              score, 
              url: rstUrl, 
              ...detail 
            };
            console.log(`  ✅ 成功: ${name} ${detail.nameTw ? '('+detail.nameTw+')' : ''} - 座標: ${detail.lat}, ${detail.lng}`);
          } else {
            console.log(`  ❌ 失敗: 無法取得 ${name} 的詳細資訊`);
          }

          await sleep(DETAIL_DELAY_MS);
        }
      }

      if (keepGoing) {
        page++;
        await sleep(LIST_DELAY_MS);
      }
    }
    
    // 該區域抓取完畢，存檔並標記為完成
    fs.writeFileSync(dataPath, JSON.stringify(Object.values(results), null, 2));
    completedAreas.push(area);
    fs.writeFileSync(progressPath, JSON.stringify({ completedAreas }, null, 2));
    console.log(`💾 區域 ${area} 完成，目前已存檔 ${Object.keys(results).length} 筆資料`);
    
    // 推送到 GitHub
    await commitAndPush(area);
  }
  
  console.log(`✅ Part ${partIndex} 全部抓取完成！資料已儲存至 ${dataPath}`);
}

scrape();
