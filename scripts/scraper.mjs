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

const MIN_SCORE = 3.50; // 只抓 3.5 分以上的
const DELAY_MS = 3000;  // 每次請求間隔 3 秒，避免被 Tabelog 封鎖

const results = {};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrape() {
  console.log('🚀 開始執行 Tabelog 爬蟲 (GitHub Actions 環境)...');
  
  for (const area of areas) {
    let page = 1;
    let keepGoing = true;

    while (keepGoing) {
      const url = `https://tabelog.com/tokyo/${area}/rstLst/${page}/?SrtT=rt&Srt=D`;
      console.log(`正在抓取區域 ${area} 的第 ${page} 頁...`);
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7'
          }
        });
        
        if (!response.ok) {
          console.log(`❌ 請求失敗: HTTP ${response.status}`);
          // 如果遇到 403，通常是被擋了，直接跳出這個區域
          if (response.status === 403) {
             console.log('⚠️ 遭遇 403 Forbidden，可能被 Tabelog 阻擋，休息 10 秒後換區...');
             await sleep(10000);
             keepGoing = false;
             break;
          }
          break;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const restaurants = $('.list-rst');

        if (restaurants.length === 0) {
          console.log(`ℹ️ 該區域已無資料`);
          break;
        }

        for (let i = 0; i < restaurants.length; i++) {
          const el = restaurants[i];
          const scoreText = $(el).find('.list-rst__rating-val').text();
          const score = parseFloat(scoreText) || 0;

          // 智慧中斷：如果這家餐廳分數低於標準，代表後面的餐廳分數更低，直接跳到下一個區域
          if (score < MIN_SCORE) {
            console.log(`⏭️ 分數 (${score}) 低於 ${MIN_SCORE}，跳到下一個區域`);
            keepGoing = false;
            break;
          }

          const nameEl = $(el).find('.list-rst__rst-name-target');
          const name = nameEl.text();
          const rstUrl = nameEl.attr('href');
          const id = rstUrl ? rstUrl.split('/').filter(Boolean).pop() : null;

          if (id && name) {
            results[id] = { id, name, score, url: rstUrl, area };
          }
        }

        if (keepGoing) {
          page++;
          await sleep(DELAY_MS); // 休息一下再抓下一頁
        }

      } catch (error) {
        console.error(`❌ 發生錯誤:`, error.message);
        keepGoing = false;
      }
    }
    
    // 確保目錄存在
    const dir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    
    // 每個區域抓完後存檔一次
    fs.writeFileSync(path.join(dir, 'tabelog_new_data.json'), JSON.stringify(Object.values(results), null, 2));
    console.log(`💾 目前已抓取 ${Object.keys(results).length} 筆資料並存檔`);
    await sleep(DELAY_MS);
  }
  
  console.log('✅ 全部抓取完成！資料已儲存至 src/data/tabelog_new_data.json');
}

scrape();
