import fs from 'fs';

async function test() {
  try {
    const res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent('site:tabelog.com 東京 叙々苑 新宿'), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    
    const regex = /class="result__url" href="([^"]+)"/g;
    let match;
    let count = 0;
    while ((match = regex.exec(html)) !== null && count < 3) {
      console.log("Found URL:", match[1]);
      count++;
    }
  } catch (e) {
    console.error(e);
  }
}

test();
