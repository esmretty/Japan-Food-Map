import React from 'react';
import { renderToString } from 'react-dom/server';
import L from 'leaflet';
import { 
  Fish, UtensilsCrossed, Pizza, Wine, Flame, Shrimp, Sparkles, Beef, Drumstick, Soup,
  Cake, Coffee, IceCream, Croissant, Sandwich, Beer, Utensils, Heart, Bookmark
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cuisineTranslation } from './data/constants';
import { type UserRestaurantData } from './types';
import { type Restaurant } from './data/restaurants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getCuisineInfo = (cuisine: string) => {
  if (cuisine === 'UNKNOWN_OTHER') return { zh: '其他未分類', group: '其他' };
  return cuisineTranslation[cuisine] || { zh: cuisine, group: '其他' };
};

export function getAwards(restaurant: Restaurant): { awards: string[], hyakumeiten: string[] } {
  const awards = Array.isArray(restaurant.awards) ? [...restaurant.awards] : [];
  
  let hyakumeiten: string[] = [];
  if (Array.isArray(restaurant.hyakumeiten)) {
    hyakumeiten = [...restaurant.hyakumeiten];
  } else if (typeof restaurant.hyakumeiten === 'boolean') {
    if (restaurant.hyakumeiten) {
      hyakumeiten = ['百名店'];
    }
  } else if (typeof restaurant.hyakumeiten === 'string') {
    hyakumeiten = [restaurant.hyakumeiten];
  }
  
  const awardText = restaurant.storeInfo?.['受賞・選出歴'];
  if (awardText) {
    const awardMatches = awardText.match(/The Tabelog Award \d{4} (Gold|Silver|Bronze)/g);
    if (awardMatches) {
      awardMatches.forEach(m => {
        if (!awards.includes(m)) awards.push(m);
      });
    }
    
    const hyakuMatches = awardText.match(/(?:食べログ )?([^\s]+(?: \w+)?) 百名店 \d{4}/g);
    if (hyakuMatches) {
      hyakuMatches.forEach(m => {
        if (!hyakumeiten.includes(m)) hyakumeiten.push(m);
      });
    }
  }
  
  return { awards, hyakumeiten };
}

export const defaultMarkerColors = {
  '4.0+': '#a855f7',
  '3.7-3.99': '#fb923c',
  '3.4-3.69': '#eab308',
  '3.4-': '#eab308'
};

export function getMarkerColor(score: number, colors: Record<string, string> = defaultMarkerColors): string {
  if (score >= 4.00) return colors['4.0+'];
  if (score >= 3.70) return colors['3.7-3.99'];
  if (score >= 3.40) return colors['3.4-3.69'];
  return colors['3.4-'];
}

export function getMarkerFillColor(score: number, userData?: UserRestaurantData): string {
  if (userData?.visited) return '#475569'; // Slate/Black
  if (userData?.favorite) return '#fbcfe8'; // Light Pink
  if (userData?.wantToGo) return '#bfdbfe'; // Light Blue
  if (score >= 4.00) return '#d8b4fe'; // Light Purple (purple-300)
  if (score >= 3.70) return '#fdba74'; // Light Orange
  if (score >= 3.40) return '#fef08a'; // Light Yellow (yellow-200)
  return '#fef08a'; // Light Yellow (yellow-200)
}

export function getCuisineIcon(cuisine: string, size: number = 16) {
  const firstCuisine = cuisine.split(/[、・\s]/)[0];
  if (firstCuisine.includes('寿司') || firstCuisine.includes('うなぎ') || firstCuisine.includes('海鮮') || firstCuisine.includes('ふぐ') || firstCuisine.includes('かに')) {
    return <Fish size={size} />;
  }
  if (firstCuisine.includes('日本料理') || firstCuisine.includes('割烹') || firstCuisine.includes('郷土料理') || firstCuisine.includes('ろばた焼き') || firstCuisine.includes('和食') || firstCuisine.includes('食堂')) {
    return <UtensilsCrossed size={size} />;
  }
  if (firstCuisine.includes('イタリアン') || firstCuisine.includes('ピザ') || firstCuisine.includes('パスタ')) {
    return <Pizza size={size} />;
  }
  if (firstCuisine.includes('フレンチ') || firstCuisine.includes('ビストロ') || firstCuisine.includes('スペイン料理') || firstCuisine.includes('ペルー料理') || firstCuisine.includes('洋食') || firstCuisine.includes('レストラン')) {
    return <Wine size={size} />;
  }
  if (firstCuisine.includes('中華料理') || firstCuisine.includes('四川料理') || firstCuisine.includes('飲茶')) {
    return <Flame size={size} />;
  }
  if (firstCuisine.includes('天ぷら') || firstCuisine.includes('串揚げ')) {
    return <Shrimp size={size} />;
  }
  if (firstCuisine.includes('イノベーティブ') || firstCuisine.includes('創作料理') || firstCuisine.includes('アジア') || firstCuisine.includes('無国籍')) {
    return <Sparkles size={size} />;
  }
  if (firstCuisine.includes('焼肉') || firstCuisine.includes('ホルモン') || firstCuisine.includes('ステーキ') || firstCuisine.includes('牛料理') || firstCuisine.includes('鉄板焼き') || firstCuisine.includes('もつ焼き') || firstCuisine.includes('ジンギスカン') || firstCuisine.includes('しゃぶしゃぶ') || firstCuisine.includes('ジビエ料理') || firstCuisine.includes('肉')) {
    return <Beef size={size} />;
  }
  if (firstCuisine.includes('焼き鳥') || firstCuisine.includes('鳥料理') || firstCuisine.includes('とんかつ')) {
    return <Drumstick size={size} />;
  }
  if (firstCuisine.includes('ラーメン') || firstCuisine.includes('そば') || firstCuisine.includes('カレー') || firstCuisine.includes('うどん') || firstCuisine.includes('つけ麺') || firstCuisine.includes('担々麺') || firstCuisine.includes('スープカレー') || firstCuisine.includes('インド料理') || firstCuisine.includes('インドカレー') || firstCuisine.includes('スリランカ料理')) {
    return <Soup size={size} />;
  }
  if (firstCuisine.includes('ケーキ') || firstCuisine.includes('スイーツ') || firstCuisine.includes('洋菓子') || firstCuisine.includes('和菓子') || firstCuisine.includes('甘味処') || firstCuisine.includes('たい焼き') || firstCuisine.includes('バームクーヘン') || firstCuisine.includes('チョコレート')) {
    return <Cake size={size} />;
  }
  if (firstCuisine.includes('カフェ') || firstCuisine.includes('喫茶店')) {
    return <Coffee size={size} />;
  }
  if (firstCuisine.includes('ジェラート') || firstCuisine.includes('かき氷') || firstCuisine.includes('フルーツパーラー') || firstCuisine.includes('クレープ')) {
    return <IceCream size={size} />;
  }
  if (firstCuisine.includes('パン') || firstCuisine.includes('ベーグル') || firstCuisine.includes('ドーナツ')) {
    return <Croissant size={size} />;
  }
  if (firstCuisine.includes('ハンバーガー') || firstCuisine.includes('タコス')) {
    return <Sandwich size={size} />;
  }
  if (firstCuisine.includes('居酒屋') || firstCuisine.includes('バー') || firstCuisine.includes('屋形船')) {
    return <Beer size={size} />;
  }
  return <Utensils size={size} />;
}

const iconCache = new Map<string, L.DivIcon>();

export function createCustomIcon(cuisine: string, score: number, userData?: UserRestaurantData, isHighlighted: boolean = false, colors: Record<string, string> = defaultMarkerColors) {
  const cacheKey = `${cuisine}-${score}-${userData?.visited}-${userData?.favorite}-${userData?.wantToGo}-${isHighlighted}-${JSON.stringify(colors)}`;
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const baseBgColor = getMarkerColor(score, colors);
  const size = 24;
  const iconSize = 14;
  
  let iconHtml = '';

  if (userData?.favorite) {
    iconHtml = renderToString(
      <div 
        className={`transition-all duration-200 ${isHighlighted ? 'scale-125 z-50 animate-sonar-ripple' : 'hover:scale-125'}`}
        style={{ 
          background: 'linear-gradient(135deg, #f43f5e, #e11d48, #9f1239)',
          width: `${size}px`,
          height: `${size}px`,
          border: `2px solid white`,
          boxShadow: isHighlighted ? undefined : '0 0 10px 3px rgba(225, 29, 72, 0.6), inset 0 0 4px rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          transform: 'rotate(45deg)',
          borderRadius: '4px',
        }}
      >
        <div style={{ transform: 'rotate(-45deg)', display: 'flex' }}>
          <Heart size={iconSize} fill="currentColor" />
        </div>
      </div>
    );
  } else if (userData?.wantToGo) {
    iconHtml = renderToString(
      <div 
        className={`transition-all duration-200 ${isHighlighted ? 'scale-125 z-50 animate-sonar-ripple' : 'hover:scale-125'}`}
        style={{ 
          background: 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)',
          width: `${size}px`,
          height: `${size}px`,
          border: `2px solid white`,
          boxShadow: isHighlighted ? undefined : '0 0 10px 3px rgba(59, 130, 246, 0.6), inset 0 0 4px rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '6px',
        }}
      >
        <Bookmark size={iconSize} fill="currentColor" />
      </div>
    );
  } else if (userData?.visited) {
    iconHtml = renderToString(
      <div 
        className={`transition-all duration-200 ${isHighlighted ? 'scale-125 z-50 animate-sonar-ripple' : 'hover:scale-125'}`}
        style={{ 
          background: 'linear-gradient(135deg, #475569, #1e293b, #0f172a)',
          width: `${size}px`,
          height: `${size}px`,
          border: `2px solid white`,
          boxShadow: isHighlighted ? undefined : '0 0 10px 3px rgba(30, 41, 59, 0.6), inset 0 0 4px rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '50%',
        }}
      >
        {getCuisineIcon(cuisine, iconSize)}
      </div>
    );
  } else {
    const borderColor = 'white';
    iconHtml = renderToString(
      <div 
        className={`transition-all duration-200 ${isHighlighted ? 'scale-125 z-50 animate-sonar-ripple' : 'hover:scale-125 hover:shadow-lg hover:border-[3px]'}`}
        style={{ 
          backgroundColor: baseBgColor,
          width: `${size}px`,
          height: `${size}px`,
          border: `2px solid ${borderColor}`,
          boxShadow: isHighlighted ? undefined : '0 2px 4px -1px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '50%',
        }}
      >
        {getCuisineIcon(cuisine, iconSize)}
      </div>
    );
  }

  const icon = L.divIcon({
    html: iconHtml,
    className: `custom-leaflet-icon ${isHighlighted ? 'z-[1000]' : ''}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2)],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}

export function isClosedOnDay(businessHours: string | undefined, day: string): boolean {
  if (!businessHours) return false;
  
  const checkDayInString = (str: string, targetDay: string) => {
    if (targetDay !== '日') return str.includes(targetDay);
    
    // Special handling for '日' (Sunday) to avoid matching '祝日', '曜日', '定休日'
    let isSunday = false;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '日') {
        const prevChar = i > 0 ? str[i - 1] : '';
        if (!['曜', '祝', '休', '明', '翌', '定'].includes(prevChar)) {
          isSunday = true;
          break;
        }
      }
    }
    return isSunday;
  };

  // Split by spaces or newlines
  const tokens = businessHours.split(/[\s\n]+/);
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.includes('休')) {
      // Check the token itself (e.g., "水休", "日曜日休み")
      if (checkDayInString(token, day)) return true;
      
      // Check the previous token (e.g., "水曜日 定休", "日・祝 定休日")
      if (i > 0 && checkDayInString(tokens[i - 1], day)) {
        // Make sure the previous token isn't just "祝日" if we are looking for Sunday
        return true;
      }
    }
  }
  
  return false;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

export function getDistanceText(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}
