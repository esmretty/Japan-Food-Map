import fs from 'fs';

async function translateBatch(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];
  const joined = texts.join(' ||| ');
  try {
    const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=zh-TW&dt=t&q=' + encodeURIComponent(joined));
    const data = await res.json();
    const translatedJoined = data[0].map((item: any) => item[0]).join('');
    return translatedJoined.split('|||').map((s: string) => s.trim());
  } catch (e) {
    console.error('Batch translation failed');
    return texts;
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const content = fs.readFileSync('src/data/restaurants.ts', 'utf-8');
  const jsonStart = content.indexOf('export const tokyoRestaurants: Restaurant[] = [') + 'export const tokyoRestaurants: Restaurant[] = '.length;
  const jsonEnd = content.lastIndexOf(']') + 1;
  const jsonStr = content.substring(jsonStart, jsonEnd);
  
  const restaurants = JSON.parse(jsonStr);
  
  console.log(`Translating ${restaurants.length} restaurants...`);
  
  const batchSize = 10;
  for (let i = 0; i < restaurants.length; i += batchSize) {
    const batch = restaurants.slice(i, i + batchSize);
    const textsToTranslate: string[] = [];
    
    batch.forEach((r: any) => {
      if (r.name.match(/[\u3040-\u309f\u30a0-\u30ff]/) && !r.name.includes('(')) {
        textsToTranslate.push(r.name);
      } else {
        textsToTranslate.push('');
      }
      
      if (r.description && r.description.match(/[\u3040-\u309f\u30a0-\u30ff]/)) {
        textsToTranslate.push(r.description);
      } else {
        textsToTranslate.push('');
      }
    });
    
    const translatedTexts = await translateBatch(textsToTranslate.filter(t => t !== ''));
    let tIndex = 0;
    
    batch.forEach((r: any) => {
      if (r.name.match(/[\u3040-\u309f\u30a0-\u30ff]/) && !r.name.includes('(')) {
        const translatedName = translatedTexts[tIndex++];
        if (translatedName && translatedName !== r.name) {
          r.name = `${r.name} (${translatedName})`;
        }
      }
      
      if (r.description && r.description.match(/[\u3040-\u309f\u30a0-\u30ff]/)) {
        const translatedDesc = translatedTexts[tIndex++];
        if (translatedDesc) {
          r.description = translatedDesc;
        }
      }
      
      if (r.businessHours) {
        r.businessHours = r.businessHours
          .replace(/月/g, '一')
          .replace(/火/g, '二')
          .replace(/水/g, '三')
          .replace(/木/g, '四')
          .replace(/金/g, '五')
          .replace(/土/g, '六')
          .replace(/日/g, '日')
          .replace(/祝日/g, '例假日')
          .replace(/祝/g, '例假日')
          .replace(/定休日/g, '公休')
          .replace(/休/g, '公休');
      }
    });
    
    console.log(`Translated ${Math.min(i + batchSize, restaurants.length)}/${restaurants.length}`);
    const newContent = content.substring(0, jsonStart) + JSON.stringify(restaurants, null, 2) + content.substring(jsonEnd);
    fs.writeFileSync('src/data/restaurants.ts', newContent);
    await delay(200);
  }
  
  console.log('Translation complete!');
}

main();
