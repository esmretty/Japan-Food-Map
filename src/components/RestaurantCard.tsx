import React from 'react';
import { Star, CheckCircle2, Heart, Bookmark, Utensils, Trophy, Medal, CalendarCheck, Users, CigaretteOff, Cigarette, ExternalLink, MapPin, Globe } from 'lucide-react';
import { type Restaurant } from '../data/restaurants';
import { type UserRestaurantData } from '../types';
import { getCuisineInfo, getAwards, cn } from '../utils';
import { User } from 'firebase/auth';

interface RestaurantCardProps {
  restaurant: Restaurant;
  user: User | null;
  userRestaurantData: Record<string, UserRestaurantData>;
  toggleStatus: (id: string, field: 'visited' | 'favorite' | 'wantToGo') => Promise<void> | void;
  hoveredRestaurantId?: string;
  setHoveredRestaurant: (restaurant: Restaurant | null) => void;
  setMapCenter: (center: [number, number]) => void;
  viewMode: string;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  user,
  userRestaurantData,
  toggleStatus,
  hoveredRestaurantId,
  setHoveredRestaurant,
  setMapCenter,
  viewMode
}) => {
  return (
    <div 
      className={cn(
        "p-4 rounded-xl border transition-all cursor-pointer group hover:shadow-md",
        hoveredRestaurantId === restaurant.id 
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
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span className="flex items-center gap-1 font-medium">
            <Utensils className="w-3.5 h-3.5 text-slate-500" />
            {restaurant.cuisine.split('、').map(c => getCuisineInfo(c.trim()).zh).join('、')}
          </span>
          {viewMode === 'all' && (() => {
            const { awards, hyakumeiten } = getAwards(restaurant);
            if (awards.length === 0 && hyakumeiten.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-1">
                {awards.slice(0, 1).map((award, idx) => (
                  <span key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-bold border border-yellow-200">
                    <Trophy className="w-3 h-3" />
                    {award.replace('The Tabelog Award ', '')}
                  </span>
                ))}
                {hyakumeiten.slice(0, 1).map((hm, idx) => (
                  <span key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
                    <Medal className="w-3 h-3" />
                    {hm.replace('食べログ ', '')}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Row 2.5: Store Info (Reservable, Seats, Smoking, Website) */}
        {viewMode === 'all' && restaurant.storeInfo && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mt-0.5 font-medium">
            {/* Reservable */}
            {restaurant.storeInfo['予約可否'] && (
              <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
                {restaurant.storeInfo['予約可否'].includes('完全予約制') ? '完全預約制' : 
                 restaurant.storeInfo['予約可否'].includes('予約不可') ? '不可預約' : 
                 restaurant.storeInfo['予約可否'].includes('予約可') ? '可預約' : '預約資訊'}
              </span>
            )}
            
            {/* Seats */}
            {restaurant.storeInfo['席数'] && restaurant.storeInfo['席数'].match(/(\d+)\s*席/) && (
              <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                {restaurant.storeInfo['席数'].match(/(\d+)\s*席/)[1]}席
              </span>
            )}

            {/* Smoking */}
            {restaurant.storeInfo['禁煙・喫煙'] && (
              <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {restaurant.storeInfo['禁煙・喫煙'].includes('禁煙') ? (
                  <><CigaretteOff className="w-3.5 h-3.5 text-slate-500" /> 禁菸</>
                ) : restaurant.storeInfo['禁煙・喫煙'].includes('喫煙可') ? (
                  <><Cigarette className="w-3.5 h-3.5 text-slate-500" /> 可吸菸</>
                ) : (
                  <><Cigarette className="w-3.5 h-3.5 text-slate-500" /> 分煙</>
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
  );
}
