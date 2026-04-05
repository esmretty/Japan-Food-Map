import * as cheerio from 'cheerio';
import fs from 'fs';

async function run() {
  const res = await fetch('https://tabelog.com/tokyo/rstLst/?SrtT=rt&Srt=D&sort_mode=1');
  const html = await res.text();
  const $ = cheerio.load(html);
  const first = $('.list-rst').first();
  console.log('Cuisine:', first.find('.list-rst__area-genre').text().trim());
  console.log('URL:', first.find('.list-rst__rst-name-target').attr('href'));
}
run();
