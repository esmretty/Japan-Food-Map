import * as cheerio from 'cheerio';

async function test() {
  try {
    const url = 'https://tabelog.com/tokyo/A1316/A131602/13127046/'; 
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      }
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const awards: string[] = [];
    let hyakumeiten = false;
    
    // Look for award images
    $('img').each((i, el) => {
      const alt = $(el).attr('alt') || '';
      const src = $(el).attr('src') || '';
      
      if (alt.includes('The Tabelog Award') || alt.includes('百名店') || src.includes('award') || src.includes('hyakumeiten')) {
        const awardName = alt || (src.includes('hyakumeiten') ? '百名店' : 'The Tabelog Award');
        if (!awards.includes(awardName)) {
            awards.push(awardName);
        }
        if (awardName.includes('百名店') || src.includes('hyakumeiten')) {
          hyakumeiten = true;
        }
      }
    });

    console.log("Awards found:", awards);
    console.log("Is Hyakumeiten:", hyakumeiten);

  } catch (e) {
    console.error(e);
  }
}

test();
