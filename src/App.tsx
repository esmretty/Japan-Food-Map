/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, LayersControl, GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Star, MapPin, ExternalLink, Info, Utensils, Search,
  Fish, UtensilsCrossed, Pizza, Wine, Flame, Shrimp, Sparkles, Beef, Drumstick, Soup,
  Trophy, Medal, ChevronDown, ChevronRight, ChevronLeft, X, Heart, CheckCircle2, LogIn, LogOut,
  Users, CigaretteOff, Cigarette, CalendarCheck, Globe, Clock, Phone, Bookmark,
  Coffee, Cake, IceCream, Beer, Martini, Croissant, Sandwich, Salad, Dessert, Candy, Donut, ChefHat
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { type Restaurant } from './data/restaurants';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UserRestaurantData {
  visited?: boolean;
  wishlist?: boolean;
  favorite?: boolean;
  wantToGo?: boolean;
  rating?: number;
  notes?: string;
  updatedAt?: string;
}

const cuisineTranslation: Record<string, { zh: string, group: string }> = {
  '寿司': { zh: '壽司', group: '海鮮' },
  'ラーメン': { zh: '拉麵', group: '麵類' },
  'そば': { zh: '蕎麥麵', group: '麵類' },
  'うどん': { zh: '烏龍麵', group: '麵類' },
  'パスタ': { zh: '義大利麵', group: '麵類' },
  '焼肉': { zh: '燒肉', group: '肉類' },
  '焼き鳥': { zh: '烤雞肉串', group: '肉類' },
  'とんかつ': { zh: '炸豬排', group: '肉類' },
  'ステーキ': { zh: '牛排', group: '肉類' },
  '鉄板焼き': { zh: '鐵板燒', group: '肉類' },
  'ハンバーグ': { zh: '漢堡排', group: '肉類' },
  '鳥料理': { zh: '雞肉料理', group: '肉類' },
  '牛料理': { zh: '牛肉料理', group: '肉類' },
  '豚料理': { zh: '豬肉料理', group: '肉類' },
  'すき焼き': { zh: '壽喜燒', group: '鍋物' },
  'しゃぶしゃぶ': { zh: '涮涮鍋', group: '鍋物' },
  '鍋（その他）': { zh: '鍋物', group: '鍋物' },
  'おでん': { zh: '關東煮', group: '鍋物' },
  'もつ鍋': { zh: '牛腸鍋', group: '鍋物' },
  '水炊き': { zh: '水炊鍋', group: '鍋物' },
  'うなぎ': { zh: '鰻魚', group: '海鮮' },
  '魚介料理・海鮮料理': { zh: '海鮮料理', group: '海鮮' },
  '天ぷら': { zh: '天婦羅', group: '海鮮' },
  '海鮮丼': { zh: '海鮮丼', group: '海鮮' },
  '日本料理': { zh: '日本料理', group: '和食' },
  '懐石・会席料理': { zh: '懷石料理', group: '和食' },
  '割烹・小料理': { zh: '割烹/小料理', group: '和食' },
  '郷土料理（その他）': { zh: '鄉土料理', group: '和食' },
  '創作料理': { zh: '創作料理', group: '和食' },
  'フレンチ': { zh: '法式料理', group: '異國料理' },
  'イタリアン': { zh: '義式料理', group: '異國料理' },
  '中華料理': { zh: '中華料理', group: '異國料理' },
  'スペイン料理': { zh: '西班牙料理', group: '異國料理' },
  '韓国料理': { zh: '韓式料理', group: '異國料理' },
  'タイ料理': { zh: '泰式料理', group: '異國料理' },
  'インド料理': { zh: '印度料理', group: '異國料理' },
  'ヨーロッパ料理': { zh: '歐洲料理', group: '異國料理' },
  '洋食': { zh: '洋食', group: '異國料理' },
  'ハンバーガー': { zh: '漢堡', group: '輕食/小吃' },
  'ピザ': { zh: '披薩', group: '輕食/小吃' },
  'カレー': { zh: '咖哩', group: '輕食/小吃' },
  '餃子': { zh: '餃子', group: '輕食/小吃' },
  'お好み焼き': { zh: '大阪燒', group: '輕食/小吃' },
  'もんじゃ焼き': { zh: '文字燒', group: '輕食/小吃' },
  'たこ焼き': { zh: '章魚燒', group: '輕食/小吃' },
  'パン': { zh: '麵包', group: '輕食/小吃' },
  'サンドイッチ': { zh: '三明治', group: '輕食/小吃' },
  'カフェ': { zh: '咖啡廳', group: '甜點/咖啡' },
  'スイーツ（その他）': { zh: '甜點', group: '甜點/咖啡' },
  'ケーキ': { zh: '蛋糕', group: '甜點/咖啡' },
  '和菓子': { zh: '和菓子', group: '甜點/咖啡' },
  'かき氷': { zh: '刨冰', group: '甜點/咖啡' },
  'パフェ': { zh: '百匯', group: '甜點/咖啡' },
  'チョコレート': { zh: '巧克力', group: '甜點/咖啡' },
  'パンケーキ': { zh: '鬆餅', group: '甜點/咖啡' },
  '喫茶店': { zh: '喫茶店', group: '甜點/咖啡' },
  '居酒屋': { zh: '居酒屋', group: '酒吧/居酒屋' },
  'ビストロ': { zh: '餐酒館', group: '酒吧/居酒屋' },
  'ワインバー': { zh: '葡萄酒吧', group: '酒吧/居酒屋' },
  'バー': { zh: '酒吧', group: '酒吧/居酒屋' },
  'ダイニングバー': { zh: '餐酒館', group: '酒吧/居酒屋' },
  'ビアバー': { zh: '啤酒吧', group: '酒吧/居酒屋' },
  'レストラン（その他）': { zh: '其他餐廳', group: '其他' },
  '旅館': { zh: '旅館', group: '其他' },
  'オーベルジュ': { zh: '住宿餐廳', group: '其他' },
  'イノベーティブ': { zh: '創新料理', group: '異國料理' },
  'ホルモン': { zh: '內臟燒烤', group: '肉類' },
  '海鮮': { zh: '海鮮', group: '海鮮' },
  'バル': { zh: '酒吧/小酒館', group: '酒吧/居酒屋' },
  '四川料理': { zh: '四川料理', group: '異國料理' },
  'ふぐ': { zh: '河豚', group: '海鮮' },
  '洋菓子': { zh: '西式甜點', group: '甜點/咖啡' },
  '屋形船・クルージング': { zh: '屋形船/遊船', group: '其他' },
  'ろばた焼き': { zh: '爐端燒', group: '和食' },
  '肉料理': { zh: '肉類料理', group: '肉類' },
  'スイーツ': { zh: '甜點', group: '甜點/咖啡' },
  'かに': { zh: '螃蟹', group: '海鮮' },
  'レストラン': { zh: '餐廳', group: '其他' },
  'つけ麺': { zh: '沾麵', group: '麵類' },
  '郷土料理': { zh: '鄉土料理', group: '和食' },
  '天丼': { zh: '天婦羅丼', group: '和食' },
  '鍋': { zh: '鍋物', group: '鍋物' },
  '親子丼': { zh: '親子丼', group: '和食' },
  'もつ焼き': { zh: '烤內臟', group: '肉類' },
  '台湾料理': { zh: '台灣料理', group: '異國料理' },
  'ジェラート・アイスクリーム': { zh: '冰淇淋', group: '甜點/咖啡' },
  'ソフトクリーム': { zh: '霜淇淋', group: '甜點/咖啡' },
  '飲茶・点心': { zh: '飲茶/點心', group: '異國料理' },
  '日本酒バー': { zh: '日本酒吧', group: '酒吧/居酒屋' },
};

const getCuisineInfo = (cuisine: string) => {
  return cuisineTranslation[cuisine] || { zh: cuisine, group: '其他' };
};

const groupOrder = ['麵類', '鍋物', '肉類', '海鮮', '和食', '異國料理', '輕食/小吃', '甜點/咖啡', '酒吧/居酒屋'];

const dayMap: Record<string, string> = {
  '月': '一',
  '火': '二',
  '水': '三',
  '木': '四',
  '金': '五',
  '土': '六',
  '日': '日',
  '祝': '例假日'
};

function BaseLayerTracker({ onBaseLayerChange }: { onBaseLayerChange: (name: string) => void }) {
  useMapEvents({
    baselayerchange: (e) => {
      onBaseLayerChange(e.name);
    }
  });
  return null;
}

function getMarkerColor(score: number): string {
  if (score < 4.00) return '#fb923c'; // Tailwind orange-400 (softer orange)
  return '#f87171'; // Tailwind red-400 (softer red)
}

function getMarkerFillColor(score: number, userData?: UserRestaurantData): string {
  if (userData?.visited) return '#cbd5e1'; // Light Slate
  if (userData?.favorite) return '#fbcfe8'; // Light Pink
  if (userData?.wantToGo) return '#bfdbfe'; // Light Blue
  if (score < 4.00) return '#fdba74'; // Light Orange
  return '#fca5a5'; // Light Red
}

function getCuisineIcon(cuisine: string, size: number = 16) {
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

function createCustomIcon(cuisine: string, score: number, userData?: UserRestaurantData) {
  const cacheKey = `${cuisine}-${score}-${userData?.visited}-${userData?.favorite}-${userData?.wantToGo}`;
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const baseBgColor = getMarkerColor(score);
  const size = 24;
  const iconSize = 14;
  
  let iconHtml = '';

  if (userData?.favorite) {
    // Diamond shape for favorite
    iconHtml = renderToString(
      <div 
        className="hover:scale-125 transition-all duration-200"
        style={{ 
          background: 'linear-gradient(135deg, #f43f5e, #e11d48, #9f1239)',
          width: `${size}px`,
          height: `${size}px`,
          border: `2px solid white`,
          boxShadow: '0 0 10px 3px rgba(225, 29, 72, 0.6), inset 0 0 4px rgba(255,255,255,0.5)',
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
    // Square shape for wantToGo
    iconHtml = renderToString(
      <div 
        className="hover:scale-125 transition-all duration-200"
        style={{ 
          background: 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
          width: `${size}px`,
          height: `${size}px`,
          border: `2px solid white`,
          boxShadow: '0 0 10px 3px rgba(59, 130, 246, 0.6), inset 0 0 4px rgba(255,255,255,0.5)',
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
  } else {
    // Circle shape for normal or visited
    const borderColor = userData?.visited ? 'black' : 'white';
    iconHtml = renderToString(
      <div 
        className="hover:scale-125 hover:shadow-lg hover:border-[3px] transition-all duration-200"
        style={{ 
          backgroundColor: baseBgColor,
          width: `${size}px`,
          height: `${size}px`,
          border: `2px solid ${borderColor}`,
          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.2)',
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
    className: 'custom-leaflet-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2)],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}

// Map Controller to handle flying to a specific location
function MapController({ center, zoom }: { center: [number, number] | null, zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, map, zoom]);
  return null;
}

function isClosedOnDay(businessHours: string | undefined, day: string): boolean {
  if (!businessHours) return false;
  
  const lines = businessHours.split('\n');
  for (const line of lines) {
    if (line.includes('休')) {
      let dayRegex;
      if (day === '日') {
        dayRegex = /(?<!曜|祝|休|明|翌)日/;
      } else if (day === '祝') {
        dayRegex = /祝/;
      } else {
        dayRegex = new RegExp(day);
      }
      
      if (dayRegex.test(line)) {
        return true;
      }
    }
  }
  return false;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([
    'ラーメン', 'つけ麺', 'すき焼き', '焼肉', '牛料理', 'とんかつ', '肉料理', '天ぷら', '親子丼', 'カレー', 'カフェ'
  ]);
  const [minScore, setMinScore] = useState<number>(3.5);
  const [maxScore, setMaxScore] = useState<number>(5.0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [requireAward, setRequireAward] = useState(false);
  const [requireHyakumeiten, setRequireHyakumeiten] = useState(false);
  const [hoveredRestaurant, setHoveredRestaurant] = useState<Restaurant | null>(null);
  const [isHoveringMapMarker, setIsHoveringMapMarker] = useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [activeBaseLayer, setActiveBaseLayer] = useState('詳細地圖 (OSM)');
  const [isListOpen, setIsListOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{status: 'success' | 'error', message: string} | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'visited' | 'favorite' | 'wantToGo'>('all');

  const tabFiltersRef = React.useRef<Record<string, any>>({
    all: {
      selectedCuisines: [
        'ラーメン', 'つけ麺', 'すき焼き', '焼肉', '牛料理', 'とんかつ', '肉料理', '天ぷら', '親子丼', 'カレー', 'カフェ'
      ],
      minScore: 3.5,
      maxScore: 5.0,
      selectedDay: null,
      requireAward: false,
      requireHyakumeiten: false,
      sortBy: 'score-desc'
    },
    visited: null,
    favorite: null,
    wantToGo: null
  });

  const [user, setUser] = useState<User | null>(null);
  const [userRestaurantData, setUserRestaurantData] = useState<Record<string, UserRestaurantData>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [tokyoRestaurants, setTokyoRestaurants] = useState<Restaurant[]>([]);
  const [tokyoLinesData, setTokyoLinesData] = useState<any>(null);
  const [tokyoStationsData, setTokyoStationsData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/restaurants.json').then(res => res.json()),
      fetch('/tokyo-lines.json').then(res => res.json()),
      fetch('/tokyo-stations.json').then(res => res.json())
    ]).then(([restaurants, lines, stations]) => {
      setTokyoRestaurants(restaurants);
      setTokyoLinesData(lines);
      setTokyoStationsData(stations);
      setIsLoadingData(false);
    }).catch(err => {
      console.error('Failed to load data', err);
      setIsLoadingData(false);
    });
  }, [tokyoStationsData]);
  const [sortBy, setSortBy] = useState<'score-desc' | 'score-asc'>('score-desc');
  const itemsPerPage = 50;

  const groupedCuisines = useMemo(() => {
    const cuisines = new Set<string>();
    tokyoRestaurants.forEach(r => {
      r.cuisine.split('、').forEach(c => cuisines.add(c.trim()));
    });
    
    const groups: Record<string, string[]> = {};
    Array.from(cuisines).forEach(c => {
      const info = getCuisineInfo(c);
      if (!groups[info.group]) {
        groups[info.group] = [];
      }
      groups[info.group].push(c);
    });
    
    const priorityCuisines = [
      'ラーメン', 'つけ麺', 'すき焼き', '焼肉', '牛料理', 'とんかつ', '肉料理', '天ぷら', '親子丼', 'カレー', 'カフェ'
    ];

    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => {
        const indexA = priorityCuisines.indexOf(a);
        const indexB = priorityCuisines.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b, 'ja');
      });
    });

    return groups;
  }, [tokyoRestaurants]);

  const uniqueCuisines = useMemo(() => {
    return Object.values(groupedCuisines).flat();
  }, [groupedCuisines]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const testDb = async () => {
      try {
        if (user) {
          console.log('Testing Firestore connection for user:', user.uid);
          const testDocRef = doc(db, `users/${user.uid}/restaurants/test_connection`);
          await setDoc(testDocRef, {
            visited: false,
            wishlist: false,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log('Firestore connection test successful');
        }
      } catch (error: any) {
        console.error('Firestore connection test failed:', error.message || error);
      }
    };
    testDb();
  }, [user]);

  // Load user preferences
  const loadPreferences = async () => {
    if (!user) return;
    try {
      const prefDoc = await getDoc(doc(db, `users/${user.uid}/preferences/filters`));
      if (prefDoc.exists()) {
        const data = prefDoc.data();
        if (data.selectedCuisines) tabFiltersRef.current.all.selectedCuisines = data.selectedCuisines;
        if (typeof data.minScore === 'number') tabFiltersRef.current.all.minScore = data.minScore;
        if (typeof data.maxScore === 'number') tabFiltersRef.current.all.maxScore = data.maxScore;

        if (viewMode === 'all') {
          if (data.selectedCuisines) setSelectedCuisines(data.selectedCuisines);
          if (typeof data.minScore === 'number') setMinScore(data.minScore);
          if (typeof data.maxScore === 'number') setMaxScore(data.maxScore);
        }
        setSaveStatus({ status: 'success', message: '設定已讀取！' });
      } else {
        setSaveStatus({ status: 'error', message: '找不到儲存的設定' });
      }
    } catch (error: any) {
      console.error("Error loading preferences:", error);
      setSaveStatus({ status: 'error', message: '讀取失敗：' + error.message });
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  useEffect(() => {
    if (!user) {
      setUserRestaurantData({});
      return;
    }
    
    loadPreferences();

    const unsubscribe = onSnapshot(collection(db, `users/${user.uid}/restaurants`), (snapshot) => {
      const data: Record<string, UserRestaurantData> = {};
      snapshot.forEach((doc) => {
        data[doc.id] = doc.data() as UserRestaurantData;
      });
      setUserRestaurantData(data);
    }, (error: any) => {
      console.error("Error fetching user restaurant data:", error.message || error);
      alert("讀取資料失敗：" + (error.message || error));
    });
    return () => unsubscribe();
  }, [user]);

  // Handle view mode change
  const handleViewModeChange = (mode: 'all' | 'visited' | 'favorite' | 'wantToGo') => {
    // Save current state to current tab
    tabFiltersRef.current[viewMode] = {
      selectedCuisines,
      minScore,
      maxScore,
      selectedDay,
      requireAward,
      requireHyakumeiten,
      sortBy
    };

    // Load new state from new tab
    const newFilters = tabFiltersRef.current[mode];
    if (newFilters) {
      setSelectedCuisines(newFilters.selectedCuisines);
      setMinScore(newFilters.minScore);
      setMaxScore(newFilters.maxScore);
      setSelectedDay(newFilters.selectedDay);
      setRequireAward(newFilters.requireAward);
      setRequireHyakumeiten(newFilters.requireHyakumeiten);
      setSortBy(newFilters.sortBy);
    } else {
      // Initialize for the first time
      setSelectedCuisines([...uniqueCuisines]);
      setMinScore(0);
      setMaxScore(5.0);
      setSelectedDay(null);
      setRequireAward(false);
      setRequireHyakumeiten(false);
      setSortBy('score-desc');
    }

    setViewMode(mode);
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCuisines, minScore, maxScore, requireAward, requireHyakumeiten, selectedDay, sortBy]);

  const savePreferences = async () => {
    if (!user) {
      alert("請先登入");
      return;
    }
    try {
      await setDoc(doc(db, `users/${user.uid}/preferences/filters`), {
        selectedCuisines,
        minScore,
        maxScore
      }, { merge: true });
      setSaveStatus({ status: 'success', message: '設定已儲存！' });
    } catch (error: any) {
      setSaveStatus({ status: 'error', message: '儲存失敗：' + error.message });
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const toggleStatus = async (restaurantId: string, field: 'visited' | 'favorite' | 'wantToGo') => {
    if (!user) {
      alert("請先登入");
      return;
    }
    const currentData = userRestaurantData[restaurantId] || {};
    const newValue = !currentData[field];
    
    // Update local state immediately for better UX
    setUserRestaurantData(prev => ({
      ...prev,
      [restaurantId]: {
        ...prev[restaurantId],
        [field]: newValue
      }
    }));

    try {
      await setDoc(doc(db, `users/${user.uid}/restaurants/${restaurantId}`), {
        visited: currentData.visited ?? false,
        favorite: currentData.favorite ?? false,
        wantToGo: currentData.wantToGo ?? false,
        [field]: newValue,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error: any) {
      console.error("Error updating status:", error.message || error);
      alert("儲存失敗：" + (error.message || error));
      // Revert local state on error
      setUserRestaurantData(prev => ({
        ...prev,
        [restaurantId]: {
          ...prev[restaurantId],
          [field]: !newValue
        }
      }));
    }
  };


  

  const uniqueStationsData = useMemo(() => {
    if (!tokyoStationsData) return null;
    const seen = new Set<string>();
    const uniqueFeatures: any[] = [];
    for (const feature of (tokyoStationsData as any).features) {
      const name = feature.properties?.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        uniqueFeatures.push(feature);
      }
    }
    return {
      ...(tokyoStationsData as any),
      features: uniqueFeatures
    };
  }, [tokyoStationsData]);

    const filteredRestaurants = useMemo(() => {
    let result = tokyoRestaurants.filter(r => {
      // 0. View Mode Filter
      if (viewMode === 'visited' && !userRestaurantData[r.id]?.visited) return false;
      if (viewMode === 'favorite' && !userRestaurantData[r.id]?.favorite) return false;
      if (viewMode === 'wantToGo' && !userRestaurantData[r.id]?.wantToGo) return false;

      // 1. Search Query
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Cuisine Filter
      if (selectedCuisines.length > 0) {
        const restaurantCuisines = r.cuisine.split('、').map(c => c.trim());
        const hasMatch = restaurantCuisines.some(c => selectedCuisines.includes(c));
        if (!hasMatch) return false;
      } else {
        // If no cuisines selected, show nothing
        return false;
      }

      // 3. Score Filter
      if (r.score < minScore || r.score > maxScore) return false;

      // 4. Awards Filter
      if (requireAward && (!r.awards || r.awards.length === 0)) return false;
      
      // 5. Hyakumeiten Filter
      if (requireHyakumeiten && (!r.hyakumeiten || r.hyakumeiten.length === 0)) return false;

      // 6. Days Filter
      if (selectedDay) {
        if (isClosedOnDay(r.businessHours, selectedDay)) {
          return false;
        }
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'score-desc') return b.score - a.score;
      if (sortBy === 'score-asc') return a.score - b.score;
      return 0;
    });

    return result;
  }, [searchQuery, selectedCuisines, minScore, maxScore, requireAward, requireHyakumeiten, selectedDay, viewMode, userRestaurantData, sortBy, tokyoRestaurants]);

  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage);
  const paginatedRestaurants = filteredRestaurants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col-reverse md:flex-row h-screen w-full bg-slate-50 font-sans overflow-hidden relative">
      
      {/* Sidebar (Filters) */}
      <div className="w-full md:w-[400px] h-[45vh] md:h-full bg-white shadow-2xl flex flex-col z-30 relative shrink-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">東京美食地圖</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <img src={user.photoURL || ''} alt="avatar" className="w-8 h-8 rounded-full border border-slate-200" />
                  <button onClick={logout} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md" title="登出">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button onClick={loginWithGoogle} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-slate-50 shadow-sm">
                  <LogIn className="w-4 h-4" /> 登入
                </button>
              )}
              <button 
                onClick={() => setIsListOpen(!isListOpen)}
                className="md:hidden flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md font-bold text-sm"
              >
                {isListOpen ? '隱藏列表' : '顯示列表'}
              </button>
            </div>

          </div>
          <p className="text-sm text-slate-500 mb-4">
            精選 {tokyoRestaurants.length} 家 Tabelog 高分餐廳
          </p>

          {/* View Mode */}
          {user && (
            <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleViewModeChange('all')}
                className={cn(
                  "flex-1 py-1.5 text-sm font-bold rounded-md transition-colors",
                  viewMode === 'all' ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                全部餐廳
              </button>
              <button
                onClick={() => handleViewModeChange('visited')}
                className={cn(
                  "flex-1 py-1.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1",
                  viewMode === 'visited' ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <CheckCircle2 className="w-4 h-4" /> 已吃過
              </button>
              <button
                onClick={() => handleViewModeChange('favorite')}
                className={cn(
                  "flex-1 py-1.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1",
                  viewMode === 'favorite' ? "bg-pink-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Heart className="w-4 h-4" fill={viewMode === 'favorite' ? 'currentColor' : 'none'} /> 喜愛
              </button>
              <button
                onClick={() => handleViewModeChange('wantToGo')}
                className={cn(
                  "flex-1 py-1.5 text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1",
                  viewMode === 'wantToGo' ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Bookmark className="w-4 h-4" fill={viewMode === 'wantToGo' ? 'currentColor' : 'none'} /> 想去
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜尋餐廳名稱、料理種類或行政區..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="space-y-3">
            {/* Cuisine Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-bold text-slate-700">料理種類 (可複選)</p>
                <div className="flex items-center gap-2 relative">
                  <label className="flex items-center gap-1 cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
                    <input 
                      type="checkbox" 
                      className="w-3 h-3 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                      checked={selectedCuisines.length === uniqueCuisines.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCuisines([...uniqueCuisines]);
                        } else {
                          setSelectedCuisines([]);
                        }
                      }}
                    />
                    全勾
                  </label>
                  <button 
                    onClick={() => setSelectedCuisines([])}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    全消
                  </button>
                  {user && viewMode === 'all' && (
                    <div className="relative flex items-center gap-1">
                      <button 
                        onClick={savePreferences}
                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-100 transition-colors"
                      >
                        儲存
                      </button>
                      <button 
                        onClick={loadPreferences}
                        className="text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                      >
                        讀取
                      </button>
                      {saveStatus && (
                        <div className={`absolute top-full right-0 mt-1 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap shadow-sm z-50 animate-fade-out ${saveStatus.status === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                          {saveStatus.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-3 max-h-[35vh] overflow-y-auto p-2 border border-slate-200 rounded-lg bg-white">
                {groupOrder.map(group => {
                  const cuisinesInGroup = groupedCuisines[group];
                  if (!cuisinesInGroup || cuisinesInGroup.length === 0) return null;
                  
                  return (
                    <div key={group} className="space-y-1.5">
                      <div className="text-sm font-bold text-slate-600 border-b border-slate-200 pb-1 mb-1">{group}</div>
                      <div className="flex flex-wrap gap-1">
                        {cuisinesInGroup.map(cuisine => {
                          const isSelected = selectedCuisines.includes(cuisine);
                          const info = getCuisineInfo(cuisine);
                          return (
                            <button
                              key={cuisine}
                              onClick={() => {
                                setSelectedCuisines(prev => 
                                  prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
                                );
                              }}
                              className={cn(
                                "px-1.5 py-0.5 text-[13px] font-medium rounded transition-all border",
                                isSelected 
                                  ? "bg-orange-100 text-orange-700 border-orange-200" 
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              {info.zh}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Days Filter */}
            <div>
              <p className="text-sm font-bold text-slate-700 mb-1.5">營業日篩選</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedDay(null)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[13px] font-medium transition-colors border",
                    selectedDay === null
                      ? "bg-slate-700 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  )}
                >
                  清除
                </button>
                {['月', '火', '水', '木', '金', '土', '日', '祝'].map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "px-1.5 py-1 rounded-md text-[13px] font-medium transition-colors border",
                      selectedDay === day
                        ? "bg-orange-500 text-white border-orange-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                    )}
                  >
                    {dayMap[day]}{selectedDay === day ? ' 有開' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating & Awards Filter */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-sm font-bold text-slate-700">評價篩選</p>
                {user && viewMode === 'all' && (
                  <div className="relative flex items-center gap-1">
                    <button 
                      onClick={savePreferences}
                      className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-100 transition-colors"
                    >
                      儲存
                    </button>
                    <button 
                      onClick={loadPreferences}
                      className="text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                    >
                      讀取
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max="5"
                    className="w-20 px-2 py-1 rounded border border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    value={minScore}
                    onChange={(e) => setMinScore(parseFloat(e.target.value) || 0)}
                  />
                  <span>~</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max="5"
                    className="w-20 px-2 py-1 rounded border border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                    value={maxScore}
                    onChange={(e) => setMaxScore(parseFloat(e.target.value) || 5)}
                  />
                </div>
                
                <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-200">
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      requireAward ? "bg-yellow-500 border-yellow-600" : "bg-white border-slate-300 group-hover:border-yellow-400"
                    )}>
                      {requireAward && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={requireAward}
                      onChange={(e) => setRequireAward(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">Tabelog Award</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      requireHyakumeiten ? "bg-orange-500 border-orange-600" : "bg-white border-slate-300 group-hover:border-orange-400"
                    )}>
                      {requireHyakumeiten && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={requireHyakumeiten}
                      onChange={(e) => setRequireHyakumeiten(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">百名店</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Toggle Button for List */}
        <button 
          onClick={() => setIsListOpen(!isListOpen)}
          className="absolute right-0 translate-x-full top-1/2 -translate-y-1/2 z-30 bg-slate-900 py-6 px-2 rounded-r-xl shadow-xl border border-l-0 border-slate-800 hidden md:flex flex-col items-center justify-center hover:bg-slate-800 transition-colors group"
        >
          {isListOpen ? <ChevronLeft className="w-5 h-5 text-white mb-2 group-hover:-translate-x-0.5 transition-transform" /> : <ChevronRight className="w-5 h-5 text-white mb-2 group-hover:translate-x-0.5 transition-transform" />}
          <span className="text-white text-xs font-bold tracking-widest" style={{ writingMode: 'vertical-rl' }}>
            {isListOpen ? '隱藏餐廳列表' : '展開餐廳列表'}
          </span>
        </button>
      </div>

      {/* Restaurant List Panel */}
      <div className={cn(
        "absolute left-0 md:left-[400px] bottom-[45vh] md:bottom-0 w-full md:w-[400px] h-[55vh] md:h-full bg-white shadow-xl z-20 flex flex-col shrink-0 transition-transform duration-300 ease-in-out",
        isListOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:-translate-x-full"
      )}>
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-3 shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-800">餐廳列表 ({filteredRestaurants.length})</h2>
            <button onClick={() => setIsListOpen(false)} className="p-1 hover:bg-slate-100 rounded">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          {/* Sorting and Pagination Info */}
          <div className="flex justify-between items-center">
            <select 
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:border-orange-400"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score-desc' | 'score-asc')}
            >
              <option value="score-desc">分數由高到低</option>
              <option value="score-asc">分數由低到高</option>
            </select>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>{currentPage} / {totalPages}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {paginatedRestaurants.map((restaurant) => (
            <div 
              key={restaurant.id}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer group hover:shadow-md",
                hoveredRestaurant?.id === restaurant.id 
                  ? "border-orange-400 bg-orange-50/50" 
                  : "border-slate-100 bg-white hover:border-orange-200"
              )}
              onMouseEnter={() => setHoveredRestaurant(restaurant)}
              onMouseLeave={() => setHoveredRestaurant(null)}
              onClick={() => {
                if (restaurant.lat !== 0 && restaurant.lng !== 0) {
                  setMapCenter([restaurant.lat, restaurant.lng]);
                }
              }}
            >
              <div className="flex flex-col gap-1.5">
                {/* Row 1: Name, Score, Buttons */}
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-orange-600 transition-colors leading-tight flex-1">
                    {restaurant.name}
                    {restaurant.lat === 0 && <span className="ml-1 text-[10px] font-normal text-slate-400 bg-slate-100 px-1 rounded">住所非公開</span>}
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded text-sm font-bold text-slate-700">
                      <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
                      {restaurant.score.toFixed(2)}
                    </div>
                    {user && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleStatus(restaurant.id, 'visited'); }}
                          className={`flex items-center justify-center p-1 rounded transition-colors ${userRestaurantData[restaurant.id]?.visited ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          title={userRestaurantData[restaurant.id]?.visited ? '已吃過' : '標記已吃'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {!userRestaurantData[restaurant.id]?.visited && <span className="text-[10px] ml-0.5 font-bold">已吃</span>}
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleStatus(restaurant.id, 'favorite'); }}
                          className={`flex items-center justify-center p-1 rounded transition-colors ${userRestaurantData[restaurant.id]?.favorite ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'}`}
                          title={userRestaurantData[restaurant.id]?.favorite ? '已喜愛' : '標記喜愛'}
                        >
                          <Heart className="w-3.5 h-3.5" fill={userRestaurantData[restaurant.id]?.favorite ? 'currentColor' : 'none'} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleStatus(restaurant.id, 'wantToGo'); }}
                          className={`flex items-center justify-center p-1 rounded transition-colors ${userRestaurantData[restaurant.id]?.wantToGo ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'}`}
                          title={userRestaurantData[restaurant.id]?.wantToGo ? '想去' : '標記想去'}
                        >
                          <Bookmark className="w-3.5 h-3.5" fill={userRestaurantData[restaurant.id]?.wantToGo ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Cuisine, Awards */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Utensils className="w-3 h-3" />
                    {restaurant.cuisine.split('、').map(c => getCuisineInfo(c.trim()).zh).join('、')}
                  </span>
                  {viewMode === 'all' && (restaurant.awards?.length > 0 || restaurant.hyakumeiten?.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {restaurant.awards?.slice(0, 1).map((award, idx) => (
                        <span key={idx} className="inline-flex items-center gap-0.5 px-1 rounded bg-yellow-100 text-yellow-800 text-[10px] font-bold border border-yellow-200">
                          <Trophy className="w-2.5 h-2.5" />
                          {award.replace('The Tabelog Award ', '')}
                        </span>
                      ))}
                      {restaurant.hyakumeiten?.slice(0, 1).map((hm, idx) => (
                        <span key={idx} className="inline-flex items-center gap-0.5 px-1 rounded bg-orange-100 text-orange-800 text-[10px] font-bold border border-orange-200">
                          <Medal className="w-2.5 h-2.5" />
                          {hm.replace('食べログ ', '')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 2.5: Store Info (Reservable, Seats, Smoking, Website) */}
                {viewMode === 'all' && restaurant.storeInfo && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                    {/* Reservable */}
                    {restaurant.storeInfo['予約可否'] && (
                      <span className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        <CalendarCheck className="w-3 h-3 text-slate-400" />
                        {restaurant.storeInfo['予約可否'].includes('完全予約制') ? '完全預約制' : 
                         restaurant.storeInfo['予約可否'].includes('予約不可') ? '不可預約' : 
                         restaurant.storeInfo['予約可否'].includes('予約可') ? '可預約' : '預約資訊'}
                      </span>
                    )}
                    
                    {/* Seats */}
                    {restaurant.storeInfo['席数'] && restaurant.storeInfo['席数'].match(/(\d+)\s*席/) && (
                      <span className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        <Users className="w-3 h-3 text-slate-400" />
                        {restaurant.storeInfo['席数'].match(/(\d+)\s*席/)[1]}席
                      </span>
                    )}

                    {/* Smoking */}
                    {restaurant.storeInfo['禁煙・喫煙'] && (
                      <span className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {restaurant.storeInfo['禁煙・喫煙'].includes('禁煙') ? (
                          <><CigaretteOff className="w-3 h-3 text-slate-400" /> 禁菸</>
                        ) : restaurant.storeInfo['禁煙・喫煙'].includes('喫煙可') ? (
                          <><Cigarette className="w-3 h-3 text-slate-400" /> 可吸菸</>
                        ) : (
                          <><Cigarette className="w-3 h-3 text-slate-400" /> 分煙</>
                        )}
                      </span>
                    )}
                  </div>
                )}

                {/* Row 3: Photos + Links */}
                {viewMode === 'all' && restaurant.photos && restaurant.photos.length > 0 && (
                  <div className="flex gap-1.5 mt-0.5 h-16">
                    <div className="flex-1 flex gap-1.5">
                      {restaurant.photos.slice(0, 2).map((photo, idx) => (
                        <div key={idx} className="relative flex-1 rounded overflow-hidden bg-slate-100 border border-slate-200">
                          <img 
                            src={photo} 
                            alt={`${restaurant.name} photo ${idx + 1}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="w-[76px] shrink-0 flex flex-col gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(restaurant.url, '_blank', 'noopener,noreferrer');
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded border border-orange-100 transition-colors"
                        title="在 Tabelog 上查看"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="text-xs font-bold">Tabelog</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const gmapsUrl = restaurant.googleMapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`;
                          window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100 text-green-600 rounded border border-green-100 transition-colors"
                        title="在 Google Maps 上查看"
                      >
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs font-bold">地圖</span>
                      </button>
                      {restaurant.storeInfo && (restaurant.storeInfo['ホームページ'] || restaurant.storeInfo['お店のホームページ']) && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = restaurant.storeInfo['ホームページ'] || restaurant.storeInfo['お店のホームページ'];
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-100 transition-colors"
                          title="官方網站"
                        >
                          <Globe className="w-3 h-3" />
                          <span className="text-xs font-bold">官網</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredRestaurants.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
              找不到符合搜尋條件的餐廳。
            </div>
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-slate-100 z-0">
        <MapContainer 
          center={[35.6895, 139.6917]} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer name="簡潔地圖 (預設)">
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer checked name="詳細地圖 (OSM)">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="大眾運輸地圖 (ÖPNVKarte)">
              <TileLayer
                attribution='&copy; <a href="https://memomaps.de/">memomaps.de</a>'
                url="https://tile.memomaps.de/tilegen/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay name="地鐵與鐵路網 (OpenRailwayMap)">
              <TileLayer
                attribution='&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a>'
                url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
              />
            </LayersControl.Overlay>
            {tokyoLinesData && (
              <LayersControl.Overlay checked name="東京地鐵路線 (彩色)">
                <GeoJSON 
                  data={{
                    ...tokyoLinesData,
                    features: (tokyoLinesData as any).features.filter((f: any) => {
                      const name = f.properties?.name || '';
                      return !name.includes('空港') && 
                             !name.includes('Airport') && 
                             !name.includes('成田') && 
                             !name.includes('羽田') &&
                             !name.includes('スカイライナー') &&
                             !name.includes('モノレール');
                    })
                  } as any}
                  style={(feature) => ({
                    color: feature?.properties?.colour || '#999999',
                    weight: 2,
                    opacity: 0.45
                  })}
                  onEachFeature={(feature, layer) => {
                    if (feature.properties && feature.properties.name) {
                      layer.bindTooltip(feature.properties.name, { sticky: true });
                    }
                  }}
                />
              </LayersControl.Overlay>
            )}
            {uniqueStationsData && (
              <LayersControl.Overlay checked name="東京地鐵車站">
                {activeBaseLayer === '簡潔地圖 (預設)' && (
                  <GeoJSON 
                    data={uniqueStationsData as any}
                    pointToLayer={(feature, latlng) => {
                      const name = feature.properties?.name || '';
                      return L.marker(latlng, {
                        icon: L.divIcon({
                          className: 'station-label-icon',
                          html: `<div class="station-label-content" style="background-color: rgba(255, 255, 255, 0.85); border: 1px solid rgba(100, 116, 139, 0.4); border-radius: 6px; padding: 2px 6px; font-size: 10px; font-weight: 600; color: #334155; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; backdrop-filter: blur(4px);">${name}</div>`,
                          iconSize: [0, 0],
                          iconAnchor: [0, 0]
                        })
                      });
                    }}
                  />
                )}
              </LayersControl.Overlay>
            )}
          </LayersControl>
          
          <BaseLayerTracker onBaseLayerChange={setActiveBaseLayer} />
          <MapController center={mapCenter} zoom={15} />

          {filteredRestaurants.filter(r => r.lat !== 0 && r.lng !== 0).map((restaurant) => (
            <Marker
              key={`${restaurant.id}-${userRestaurantData[restaurant.id]?.visited}-${userRestaurantData[restaurant.id]?.wishlist}`}
              position={[restaurant.lat, restaurant.lng]}
              icon={createCustomIcon(restaurant.cuisine, restaurant.score, userRestaurantData[restaurant.id])}
              eventHandlers={{
                mouseover: (e) => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                  setHoveredRestaurant(restaurant);
                  setIsHoveringMapMarker(true);
                  setMousePos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
                },
                mousemove: (e) => {
                  setMousePos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
                },
                mouseout: () => {
                  hoverTimeoutRef.current = setTimeout(() => {
                    setHoveredRestaurant(null);
                    setIsHoveringMapMarker(false);
                  }, 300);
                },
                click: () => window.open(restaurant.url, '_blank', 'noopener,noreferrer'),
              }}
              zIndexOffset={hoveredRestaurant?.id === restaurant.id ? 1000 : 0}
            />
          ))}
        </MapContainer>

        {/* Floating Info Note */}
        <div className="absolute bottom-6 right-6 z-[400] bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200/50 max-w-xs pointer-events-none">
          <div className="flex gap-2 items-start">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">
              此地圖收錄了 {tokyoRestaurants.length} 家東京高分餐廳。點擊標記即可開啟官方 Tabelog 頁面。
            </p>
          </div>
        </div>
      </div>

      {/* Custom Tooltip Overlay */}
      {hoveredRestaurant && isHoveringMapMarker && (
        <CustomTooltip 
          restaurant={hoveredRestaurant} 
          x={mousePos.x} 
          y={mousePos.y} 
          user={user}
          userRestaurantData={userRestaurantData}
          toggleStatus={toggleStatus}
          viewMode={viewMode}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
          }}
          onMouseLeave={() => {
            setHoveredRestaurant(null);
            setIsHoveringMapMarker(false);
          }}
        />
      )}
    </div>
  );
}

const CustomTooltip = ({ restaurant, x, y, user, userRestaurantData, toggleStatus, viewMode, onMouseEnter, onMouseLeave }: { restaurant: Restaurant, x: number, y: number, user: User | null, userRestaurantData: Record<string, UserRestaurantData>, toggleStatus: (id: string, field: 'visited' | 'favorite' | 'wantToGo') => void, viewMode: string, onMouseEnter: () => void, onMouseLeave: () => void }) => {
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ top: -9999, left: -9999, opacity: 0 });

  React.useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let finalX = x + 15;
      let finalY = y + 15;

      // Check right edge
      if (finalX + rect.width > viewportWidth - 10) {
        finalX = x - rect.width - 15;
      }
      // Check bottom edge
      if (finalY + rect.height > viewportHeight - 10) {
        finalY = y - rect.height - 15;
      }
      // Check top edge
      if (finalY < 10) {
        finalY = 10;
      }
      // Check left edge
      if (finalX < 10) {
        finalX = 10;
      }

      setPos({ top: finalY, left: finalX, opacity: 1 });
    }
  }, [x, y, restaurant]);

  return (
    <div 
      ref={tooltipRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[9999] bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-2xl border border-slate-200/60 pointer-events-auto"
      style={{ 
        top: pos.top, 
        left: pos.left, 
        opacity: pos.opacity,
        visibility: pos.opacity === 0 ? 'hidden' : 'visible'
      }}
    >
      <div className="min-w-[260px] max-w-[300px] whitespace-normal flex flex-col gap-1.5">
        {/* Row 1: Name, Score, Buttons */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-sm text-slate-900 leading-tight flex-1">
            {restaurant.name}
            {restaurant.lat === 0 && <span className="ml-1 text-[10px] font-normal text-slate-400 bg-slate-100 px-1 rounded">住所非公開</span>}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded text-sm font-bold text-slate-700">
              <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
              {restaurant.score.toFixed(2)}
            </div>
            {user && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleStatus(restaurant.id, 'visited'); }}
                  className={`flex items-center justify-center p-1 rounded transition-colors ${userRestaurantData[restaurant.id]?.visited ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  title={userRestaurantData[restaurant.id]?.visited ? '已吃過' : '標記已吃'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {!userRestaurantData[restaurant.id]?.visited && <span className="text-[10px] ml-0.5 font-bold">已吃</span>}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleStatus(restaurant.id, 'favorite'); }}
                  className={`flex items-center justify-center p-1 rounded transition-colors ${userRestaurantData[restaurant.id]?.favorite ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'}`}
                  title={userRestaurantData[restaurant.id]?.favorite ? '已喜愛' : '標記喜愛'}
                >
                  <Heart className="w-3.5 h-3.5" fill={userRestaurantData[restaurant.id]?.favorite ? 'currentColor' : 'none'} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleStatus(restaurant.id, 'wantToGo'); }}
                  className={`flex items-center justify-center p-1 rounded transition-colors ${userRestaurantData[restaurant.id]?.wantToGo ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'}`}
                  title={userRestaurantData[restaurant.id]?.wantToGo ? '想去' : '標記想去'}
                >
                  <Bookmark className="w-3.5 h-3.5" fill={userRestaurantData[restaurant.id]?.wantToGo ? 'currentColor' : 'none'} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Cuisine, Awards */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Utensils className="w-3 h-3" />
            {restaurant.cuisine.split('、').map(c => getCuisineInfo(c.trim()).zh).join('、')}
          </span>
          {(restaurant.awards?.length > 0 || restaurant.hyakumeiten?.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {restaurant.awards?.slice(0, 1).map((award, idx) => (
                <span key={idx} className="inline-flex items-center gap-0.5 px-1 rounded bg-yellow-100 text-yellow-800 text-[10px] font-bold border border-yellow-200">
                  <Trophy className="w-2.5 h-2.5" />
                  {award.replace('The Tabelog Award ', '')}
                </span>
              ))}
              {restaurant.hyakumeiten?.slice(0, 1).map((hm, idx) => (
                <span key={idx} className="inline-flex items-center gap-0.5 px-1 rounded bg-orange-100 text-orange-800 text-[10px] font-bold border border-orange-200">
                  <Medal className="w-2.5 h-2.5" />
                  {hm.replace('食べログ ', '')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Row 2.5: Store Info (Reservable, Seats, Smoking) */}
        {restaurant.storeInfo && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
            {/* Reservable */}
            {restaurant.storeInfo['予約可否'] && (
              <span className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                <CalendarCheck className="w-3 h-3 text-slate-400" />
                {restaurant.storeInfo['予約可否'].includes('完全予約制') ? '完全預約制' : 
                 restaurant.storeInfo['予約可否'].includes('予約不可') ? '不可預約' : 
                 restaurant.storeInfo['予約可否'].includes('予約可') ? '可預約' : '預約資訊'}
              </span>
            )}
            
            {/* Seats */}
            {restaurant.storeInfo['席数'] && restaurant.storeInfo['席数'].match(/(\d+)\s*席/) && (
              <span className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                <Users className="w-3 h-3 text-slate-400" />
                {restaurant.storeInfo['席数'].match(/(\d+)\s*席/)[1]}席
              </span>
            )}

            {/* Smoking */}
            {restaurant.storeInfo['禁煙・喫煙'] && (
              <span className="flex items-center gap-0.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                {restaurant.storeInfo['禁煙・喫煙'].includes('禁煙') ? (
                  <><CigaretteOff className="w-3 h-3 text-slate-400" /> 禁菸</>
                ) : restaurant.storeInfo['禁煙・喫煙'].includes('喫煙可') ? (
                  <><Cigarette className="w-3 h-3 text-slate-400" /> 可吸菸</>
                ) : (
                  <><Cigarette className="w-3 h-3 text-slate-400" /> 分煙</>
                )}
              </span>
            )}
          </div>
        )}

        {/* Row 3: Photos + Links */}
        {restaurant.photos && restaurant.photos.length > 0 && (
          <div className="flex gap-1.5 mt-0.5 h-16">
            <div className="flex-1 flex gap-1.5">
              {restaurant.photos.slice(0, 2).map((photo, idx) => (
                <div key={idx} className="relative flex-1 rounded overflow-hidden bg-slate-100 border border-slate-200">
                  <img 
                    src={photo} 
                    alt={`${restaurant.name} photo ${idx + 1}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>
            <div className="w-[76px] shrink-0 flex flex-col gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(restaurant.url, '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 flex items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded border border-orange-100 transition-colors"
                title="在 Tabelog 上查看"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="text-xs font-bold">Tabelog</span>
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const gmapsUrl = restaurant.googleMapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`;
                  window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100 text-green-600 rounded border border-green-100 transition-colors"
                title="在 Google Maps 上查看"
              >
                <MapPin className="w-3 h-3" />
                <span className="text-xs font-bold">地圖</span>
              </button>
              {restaurant.storeInfo && (restaurant.storeInfo['ホームページ'] || restaurant.storeInfo['お店のホームページ']) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = restaurant.storeInfo['ホームページ'] || restaurant.storeInfo['お店のホームページ'];
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-100 transition-colors"
                  title="官方網站"
                >
                  <Globe className="w-3 h-3" />
                  <span className="text-xs font-bold">官網</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
