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
  Users, CigaretteOff, Cigarette, CalendarCheck, Calendar, Globe, Clock, Phone, Bookmark,
  Coffee, Cake, IceCream, Beer, Martini, Croissant, Sandwich, Salad, Dessert, Candy, Donut, ChefHat
} from 'lucide-react';
import { type Restaurant } from './data/restaurants';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, collection, getDocs, getDocsFromCache, getDocsFromServer } from 'firebase/firestore';

import { type UserRestaurantData } from './types';
import { cuisineTranslation, groupOrder, dayMap, WARD_PROSPERITY_ORDER } from './constants';
import { cn, getCuisineInfo, getAwards, getMarkerColor, getMarkerFillColor, getCuisineIcon, createCustomIcon, isClosedOnDay, calculateDistance, getDistanceText } from './utils';
import { CustomTooltip } from './components/CustomTooltip';
import { RestaurantCard } from './components/RestaurantCard';
import { Sidebar } from './components/Sidebar';

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

function BaseLayerTracker({ onBaseLayerChange }: { onBaseLayerChange: (name: string) => void }) {
  useMapEvents({
    baselayerchange: (e) => {
      onBaseLayerChange(e.name);
    }
  });
  return null;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([
    'ラーメン', 'つけ麺', 'すき焼き', '焼肉', '牛料理', 'とんかつ', '肉料理', '天ぷら', '親子丼', 'カレー', 'カフェ'
  ]);
  const [minScore, setMinScore] = useState<number>(3.5);
  const [maxScore, setMaxScore] = useState<number>(5.0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedWards, setSelectedWards] = useState<string[]>([]);
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
  const [scraperStatus, setScraperStatus] = useState<{status: 'running' | 'idle' | 'error', progress: number, message: string} | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'visited' | 'favorite' | 'wantToGo'>('all');

  const [isCuisineOpen, setIsCuisineOpen] = useState(true);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isDaysOpen, setIsDaysOpen] = useState(true);

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
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 400);

    const fetchWithCache = async (collectionName: string) => {
      const colRef = collection(db, collectionName);
      try {
        const snapshot = await getDocsFromCache(colRef);
        if (snapshot.empty) {
          console.log(`Cache empty for ${collectionName}, fetching from server...`);
          return await getDocsFromServer(colRef);
        }
        console.log(`Loaded ${collectionName} from cache`);
        return snapshot;
      } catch (e) {
        console.log(`Failed to load ${collectionName} from cache, fetching from server...`);
        return await getDocsFromServer(colRef);
      }
    };

    Promise.all([
      fetchWithCache('restaurants').then(snapshot => snapshot.docs.map(doc => doc.data() as Restaurant)),
      fetchWithCache('tokyoLines').then(snapshot => ({
        type: 'FeatureCollection',
        features: snapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, geometry: JSON.parse(data.geometry) };
        })
      })),
      fetchWithCache('tokyoStations').then(snapshot => ({
        type: 'FeatureCollection',
        features: snapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, geometry: JSON.parse(data.geometry) };
        })
      }))
    ]).then(([restaurants, lines, stations]) => {
      setTokyoRestaurants(restaurants);
      setTokyoLinesData(lines);
      setTokyoStationsData(stations);
      
      // Complete the progress bar smoothly
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setTimeout(() => setIsLoadingData(false), 400);
    }).catch(err => {
      console.error('Failed to load data', err);
      clearInterval(progressInterval);
      setIsLoadingData(false);
    });

    return () => clearInterval(progressInterval);
  }, []);
  const [sortBy, setSortBy] = useState<'score-desc' | 'score-asc'>('score-desc');
  const itemsPerPage = 50;

  const availableWards = useMemo(() => {
    const WARD_PROSPERITY_ORDER = [
      '港区', '新宿区', '渋谷区', '中央区', '千代田区', '豊島区', '台東区', '目黒区', '品川区', '世田谷区',
      '中野区', '杉並区', '江東区', '墨田区', '大田区', '北区', '荒川区', '板橋区', '練馬区', '足立区',
      '葛飾区', '江戸川区', '武蔵野市', '三鷹市', '調布市', '町田市', '八王子市', '立川市'
    ];
    
    const wards = new Set<string>();
    tokyoRestaurants.forEach(r => {
      const ward = WARD_PROSPERITY_ORDER.find(w => r.address.includes(w));
      if (ward) wards.add(ward);
    });
    
    return Array.from(wards).sort((a, b) => {
      const indexA = WARD_PROSPERITY_ORDER.indexOf(a);
      const indexB = WARD_PROSPERITY_ORDER.indexOf(b);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      const aIsKu = a.endsWith('区');
      const bIsKu = b.endsWith('区');
      if (aIsKu && !bIsKu) return -1;
      if (!aIsKu && bIsKu) return 1;
      return a.localeCompare(b, 'ja');
    });
  }, [tokyoRestaurants]);

  const cuisineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tokyoRestaurants.forEach(r => {
      r.cuisine.split('、').forEach(c => {
        let trimmed = c.trim();
        if (trimmed === 'カレーうどん') trimmed = 'うどん';
        counts[trimmed] = (counts[trimmed] || 0) + 1;
      });
    });
    return counts;
  }, [tokyoRestaurants]);

  const groupedCuisines = useMemo(() => {
    const cuisines = new Set<string>();
    Object.keys(cuisineCounts).forEach(c => cuisines.add(c));
    
    const groups: Record<string, string[]> = {};
    Array.from(cuisines).forEach(c => {
      if (cuisineTranslation[c]) {
        const info = cuisineTranslation[c];
        if (!groups[info.group]) {
          groups[info.group] = [];
        }
        groups[info.group].push(c);
      } else {
        if (!groups['其他']) {
          groups['其他'] = [];
        }
        if (!groups['其他'].includes('UNKNOWN_OTHER')) {
          groups['其他'].push('UNKNOWN_OTHER');
        }
      }
    });
    
    Object.keys(groups).forEach(group => {
      groups[group].sort((a, b) => {
        const countA = cuisineCounts[a] || 0;
        const countB = cuisineCounts[b] || 0;
        if (countA !== countB) {
          return countB - countA;
        }
        return a.localeCompare(b, 'ja');
      });
    });

    return groups;
  }, [cuisineCounts]);

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
      const query = searchQuery.toLowerCase();
      const matchesSearch = r.name.toLowerCase().includes(query) || (r.nameTw && r.nameTw.toLowerCase().includes(query));
      if (!matchesSearch) return false;

      // 1.5 Ward Filter
      if (selectedWards.length > 0) {
        const WARD_PROSPERITY_ORDER = [
          '港区', '新宿区', '渋谷区', '中央区', '千代田区', '豊島区', '台東区', '目黒区', '品川区', '世田谷区',
          '中野区', '杉並区', '江東区', '墨田区', '大田区', '北区', '荒川区', '板橋区', '練馬区', '足立区',
          '葛飾区', '江戸川区', '武蔵野市', '三鷹市', '調布市', '町田市', '八王子市', '立川市'
        ];
        const ward = WARD_PROSPERITY_ORDER.find(w => r.address.includes(w)) || '其他';
        if (!selectedWards.includes(ward)) return false;
      }

      // 2. Cuisine Filter
      if (selectedCuisines.length > 0) {
        const restaurantCuisines = r.cuisine.split('、').map(c => {
          let trimmed = c.trim();
          if (trimmed === 'カレーうどん') trimmed = 'うどん';
          return trimmed;
        });
        const hasMatch = restaurantCuisines.some(c => {
          if (selectedCuisines.includes('UNKNOWN_OTHER') && !cuisineTranslation[c]) {
            return true;
          }
          return selectedCuisines.includes(c);
        });
        if (!hasMatch) return false;
      } else {
        // If no cuisines selected, show nothing
        return false;
      }

      // 3. Score Filter
      if (r.score < minScore || r.score > maxScore) return false;

      // 4. Awards & Hyakumeiten Filter (OR logic if both checked)
      if (requireAward || requireHyakumeiten) {
        const { awards, hyakumeiten } = getAwards(r);
        const hasAward = awards.length > 0;
        const hasHyakumeiten = hyakumeiten.length > 0;
        
        if (requireAward && requireHyakumeiten) {
          if (!hasAward && !hasHyakumeiten) return false;
        } else if (requireAward && !hasAward) {
          return false;
        } else if (requireHyakumeiten && !hasHyakumeiten) {
          return false;
        }
      }

      // 6. Days Filter
      if (selectedDay) {
        const hours = r.storeInfo?.['営業時間'] || r.businessHours;
        if (isClosedOnDay(hours, selectedDay)) {
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
  }, [searchQuery, selectedCuisines, selectedWards, minScore, maxScore, requireAward, requireHyakumeiten, selectedDay, viewMode, userRestaurantData, sortBy, tokyoRestaurants]);

  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage);
  const paginatedRestaurants = filteredRestaurants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoadingData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="flex flex-col items-center gap-6 max-w-sm w-full px-6 z-10">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 mb-2 relative">
            <div className="absolute inset-0 border-4 border-orange-100 rounded-2xl animate-ping opacity-20"></div>
            <Utensils className="w-10 h-10 text-orange-500 animate-pulse" />
          </div>
          
          <div className="w-full space-y-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-end">
              <p className="text-slate-700 font-bold text-lg">載入東京美食地圖...</p>
              <span className="text-orange-600 font-bold text-sm bg-orange-50 px-2 py-0.5 rounded-md">{Math.round(loadingProgress)}%</span>
            </div>
            
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              >
                {/* Shimmer effect inside progress bar */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
              </div>
            </div>
            
            <p className="text-slate-400 text-xs text-center mt-2 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              <span className="ml-1">正在從資料庫讀取餐廳與地圖資料</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse md:flex-row h-screen w-full bg-slate-50 font-sans overflow-hidden relative">
      
      {/* Sidebar (Filters) */}
      <Sidebar 
        user={user}
        loginWithGoogle={loginWithGoogle}
        logout={logout}
        tokyoRestaurantsLength={tokyoRestaurants.length}
        filteredRestaurantsLength={filteredRestaurants.length}
        isListOpen={isListOpen}
        setIsListOpen={setIsListOpen}
        viewMode={viewMode}
        handleViewModeChange={handleViewModeChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isCuisineOpen={isCuisineOpen}
        setIsCuisineOpen={setIsCuisineOpen}
        selectedCuisines={selectedCuisines}
        setSelectedCuisines={setSelectedCuisines}
        uniqueCuisines={uniqueCuisines}
        savePreferences={savePreferences}
        loadPreferences={loadPreferences}
        saveStatus={saveStatus}
        groupOrder={groupOrder}
        groupedCuisines={groupedCuisines}
        cuisineCounts={cuisineCounts}
        isDaysOpen={isDaysOpen}
        setIsDaysOpen={setIsDaysOpen}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        dayMap={dayMap}
        isLocationOpen={isLocationOpen}
        setIsLocationOpen={setIsLocationOpen}
        selectedWards={selectedWards}
        setSelectedWards={setSelectedWards}
        availableWards={availableWards}
        isAdvancedOpen={isAdvancedOpen}
        setIsAdvancedOpen={setIsAdvancedOpen}
        minScore={minScore}
        setMinScore={setMinScore}
        maxScore={maxScore}
        setMaxScore={setMaxScore}
        requireAward={requireAward}
        setRequireAward={setRequireAward}
        requireHyakumeiten={requireHyakumeiten}
        setRequireHyakumeiten={setRequireHyakumeiten}
      />

      {/* Restaurant List Panel */}
      <div className={cn(
        "absolute left-0 md:left-[400px] bottom-[45vh] md:bottom-0 w-full md:w-[400px] h-[55vh] md:h-full bg-white shadow-xl z-20 flex flex-col shrink-0 transition-transform duration-300 ease-in-out",
        isListOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:-translate-x-full"
      )}>
        <div className="p-4 md:pl-10 border-b border-slate-100 bg-white flex flex-col gap-3 shrink-0">
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
        <div className="flex-1 overflow-y-auto p-4 md:pl-10 space-y-3 bg-slate-50/50">
          {paginatedRestaurants.map((restaurant) => (
            <RestaurantCard 
              key={restaurant.id}
              restaurant={restaurant}
              user={user}
              userRestaurantData={userRestaurantData}
              toggleStatus={toggleStatus}
              hoveredRestaurantId={hoveredRestaurant?.id}
              setHoveredRestaurant={setHoveredRestaurant}
              setMapCenter={setMapCenter}
              viewMode={viewMode}
            />
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
              key={`${restaurant.id}-${userRestaurantData[restaurant.id]?.visited}-${userRestaurantData[restaurant.id]?.wishlist}-${hoveredRestaurant?.id === restaurant.id}`}
              position={[restaurant.lat, restaurant.lng]}
              icon={createCustomIcon(restaurant.cuisine, restaurant.score, userRestaurantData[restaurant.id], hoveredRestaurant?.id === restaurant.id)}
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
