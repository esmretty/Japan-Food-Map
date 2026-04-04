import { JSDOM } from 'jsdom';

async function test() {
  const url = 'https://tabelog.com/tokyo/A1314/A131401/13136847/';
  const res = await fetch(url);
  const html = await res.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  let businessHours = '';
  let regularHoliday = '';
  const ths = document.querySelectorAll('th');
  ths.forEach(th => {
    if (th.textContent?.includes('営業時間')) {
      businessHours = th.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim() || '';
    }
    if (th.textContent?.includes('定休日')) {
      regularHoliday = th.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim() || '';
    }
  });

  const awards = Array.from(new Set(html.match(/The Tabelog Award \d{4} (Gold|Silver|Bronze)/g) || []));
  const hyakumeiten = Array.from(new Set(html.match(/食べログ [^\s]+ (?:TOKYO )?百名店 \d{4}/g) || []));

  console.log('Business Hours:', businessHours);
  console.log('Regular Holiday:', regularHoliday);
  console.log('Awards:', awards);
  console.log('Hyakumeiten:', hyakumeiten);
}

test();
