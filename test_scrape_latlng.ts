import * as cheerio from 'cheerio';

async function test() {
  try {
    const url = 'https://tabelog.com/tokyo/A1304/A130401/13017369/'; 
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const description = $('.pr-comment-title').text().trim() || $('.pr-comment-wrap').text().trim() || $('meta[property="og:description"]').attr('content') || '';
    console.log("description:", description.replace(/\s+/g, ' ').substring(0, 200));
    
  } catch (e) {
    console.error(e);
  }
}

test();
