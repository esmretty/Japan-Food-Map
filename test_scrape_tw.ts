import * as cheerio from 'cheerio';

async function test() {
  try {
    const url = 'https://tabelog.com/tokyo/A1304/A130401/13017369/'; 
    const twUrl = url.replace('tabelog.com/', 'tabelog.com/tw/');
    console.log("Fetching:", twUrl);
    
    const res = await fetch(twUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const nameTw = $('.rd-header__rst-name-main').text().trim() || $('h2').first().text().trim();
    console.log("nameTw:", nameTw);
    
    // Let's also check storeInfo in the Japanese page
    const jaRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      }
    });
    const jaHtml = await jaRes.text();
    const $ja = cheerio.load(jaHtml);
    
    const storeInfo: Record<string, string> = {};
    $ja('.rstinfo-table tr').each((i, el) => {
      const th = $ja(el).find('th').text().trim();
      const td = $ja(el).find('td').text().replace(/\s+/g, ' ').trim();
      if (th && td) {
        storeInfo[th] = td;
      }
    });
    
    console.log("storeInfo keys:", Object.keys(storeInfo));
    console.log("businessHours:", storeInfo['営業時間']);
    
  } catch (e) {
    console.error(e);
  }
}

test();
