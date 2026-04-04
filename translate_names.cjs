const fs = require('fs');

// A simple Katakana to Romaji mapping
const katakanaToRomaji = {
  'ア': 'A', 'イ': 'I', 'ウ': 'U', 'エ': 'E', 'オ': 'O',
  'カ': 'Ka', 'キ': 'Ki', 'ク': 'Ku', 'ケ': 'Ke', 'コ': 'Ko',
  'サ': 'Sa', 'シ': 'Shi', 'ス': 'Su', 'セ': 'Se', 'ソ': 'So',
  'タ': 'Ta', 'チ': 'Chi', 'ツ': 'Tsu', 'テ': 'Te', 'ト': 'To',
  'ナ': 'Na', 'ニ': 'Ni', 'ヌ': 'Nu', 'ネ': 'Ne', 'ノ': 'No',
  'ハ': 'Ha', 'ヒ': 'Hi', 'フ': 'Fu', 'ヘ': 'He', 'ホ': 'Ho',
  'マ': 'Ma', 'ミ': 'Mi', 'ム': 'Mu', 'メ': 'Me', 'モ': 'Mo',
  'ヤ': 'Ya', 'ユ': 'Yu', 'ヨ': 'Yo',
  'ラ': 'Ra', 'リ': 'Ri', 'ル': 'Ru', 'レ': 'Re', 'ロ': 'Ro',
  'ワ': 'Wa', 'ヲ': 'Wo', 'ン': 'N',
  'ガ': 'Ga', 'ギ': 'Gi', 'グ': 'Gu', 'ゲ': 'Ge', 'ゴ': 'Go',
  'ザ': 'Za', 'ジ': 'Ji', 'ズ': 'Zu', 'ゼ': 'Ze', 'ゾ': 'Zo',
  'ダ': 'Da', 'ヂ': 'Ji', 'ヅ': 'Zu', 'デ': 'De', 'ド': 'Do',
  'バ': 'Ba', 'ビ': 'Bi', 'ブ': 'Bu', 'ベ': 'Be', 'ボ': 'Bo',
  'パ': 'Pa', 'ピ': 'Pi', 'プ': 'Pu', 'ペ': 'Pe', 'ポ': 'Po',
  'キャ': 'Kya', 'キュ': 'Kyu', 'キョ': 'Kyo',
  'シャ': 'Sha', 'シュ': 'Shu', 'ショ': 'Sho',
  'チャ': 'Cha', 'チュ': 'Chu', 'チョ': 'Cho',
  'ニャ': 'Nya', 'ニュ': 'Nyu', 'ニョ': 'Nyo',
  'ヒャ': 'Hya', 'ヒュ': 'Hyu', 'ヒョ': 'Hyo',
  'ミャ': 'Mya', 'ミュ': 'Myu', 'ミョ': 'Myo',
  'リャ': 'Rya', 'リュ': 'Ryu', 'リョ': 'Ryo',
  'ギャ': 'Gya', 'ギュ': 'Gyu', 'ギョ': 'Gyo',
  'ジャ': 'Ja', 'ジュ': 'Ju', 'ジョ': 'Jo',
  'ビャ': 'Bya', 'ビュ': 'Byu', 'ビョ': 'Byo',
  'ピャ': 'Pya', 'ピュ': 'Pyu', 'ピョ': 'Pyo',
  'ファ': 'Fa', 'フィ': 'Fi', 'フェ': 'Fe', 'フォ': 'Fo',
  'ティ': 'Ti', 'ディ': 'Di', 'デュ': 'Dyu',
  'ウィ': 'Wi', 'ウェ': 'We', 'ウォ': 'Wo',
  'ヴァ': 'Va', 'ヴィ': 'Vi', 'ヴ': 'Vu', 'ヴェ': 'Ve', 'ヴォ': 'Vo',
  'チェ': 'Che', 'シェ': 'She', 'ジェ': 'Je',
  'ー': '-', 'ッ': '' // ッ is handled specially
};

function toRomaji(text) {
  let result = '';
  let i = 0;
  while (i < text.length) {
    let char = text[i];
    let nextChar = text[i+1];
    
    // Check for combinations like キャ
    if (nextChar && katakanaToRomaji[char + nextChar]) {
      result += katakanaToRomaji[char + nextChar];
      i += 2;
      continue;
    }
    
    // Check for small tsu
    if (char === 'ッ' && nextChar) {
      let nextRomaji = katakanaToRomaji[nextChar];
      if (nextRomaji) {
        result += nextRomaji[0].toLowerCase();
      }
      i++;
      continue;
    }
    
    if (katakanaToRomaji[char]) {
      result += katakanaToRomaji[char];
    } else {
      result += char;
    }
    i++;
  }
  
  // Clean up dashes and spaces
  return result.replace(/-+/g, '').replace(/\s+/g, ' ').trim();
}

const dataPath = 'src/data/restaurants.ts';
let content = fs.readFileSync(dataPath, 'utf-8');

const jsonMatch = content.match(/export const tokyoRestaurants: Restaurant\[\] = (\[[\s\S]*\]);/);
if (!jsonMatch) {
  console.error("Could not find restaurants array");
  process.exit(1);
}

let restaurants = JSON.parse(jsonMatch[1]);
let updatedCount = 0;

for (const r of restaurants) {
  // Clean up duplicate translations if they exist
  r.name = r.name.replace(/( \([^)]+\))( \([^)]+\))+/g, '$1');
  if (/[\u30A0-\u30FF]/.test(r.name)) {
    // Extract Katakana parts
    let katakanaParts = r.name.match(/[\u30A0-\u30FF]+/g);
    if (katakanaParts) {
      let romajiParts = katakanaParts.map(toRomaji);
      let romajiStr = romajiParts.join(' ');
      
      // Add to name if it's meaningful and not already there
      if (romajiStr.length > 2 && !r.name.includes(romajiStr)) {
        // Fix duplicate translations like (Ru・BuRuGiNiON ・)
        romajiStr = romajiStr.replace(/ [・ヶィゥ]+$/, '').replace(/ [・ヶィゥ]+ /g, ' ').trim();
        if (romajiStr.length > 2 && !r.name.includes(`(${romajiStr})`)) {
          r.name = `${r.name} (${romajiStr})`;
          updatedCount++;
          console.log(`Translated: ${r.name}`);
        }
      }
    }
  }
}

if (updatedCount > 0) {
  const newJson = JSON.stringify(restaurants, null, 2);
  const newContent = content.replace(jsonMatch[1], newJson);
  fs.writeFileSync(dataPath, newContent);
  console.log(`Updated ${updatedCount} restaurant names with Romaji.`);
} else {
  console.log('No names needed translation.');
}
