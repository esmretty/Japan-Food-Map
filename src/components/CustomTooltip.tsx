import React from 'react';
import { Star, CheckCircle2, Heart, Bookmark, Utensils, Trophy, Medal, CalendarCheck, Users, CigaretteOff, Cigarette, ExternalLink, MapPin, Globe, Search } from 'lucide-react';
import { type Restaurant } from '../data/restaurants';
import { type UserRestaurantData } from '../types';
import { getCuisineInfo, getAwards, cn } from '../utils';
import { User } from 'firebase/auth';

interface CustomTooltipProps {
  restaurant: Restaurant;
  x: number;
  y: number;
  user: User | null;
  userRestaurantData: Record<string, UserRestaurantData>;
  toggleStatus: (id: string, field: 'visited' | 'favorite' | 'wantToGo') => void;
  viewMode: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const CustomTooltip = ({ restaurant, x, y, user, userRestaurantData, toggleStatus, viewMode, onMouseEnter, onMouseLeave }: CustomTooltipProps) => {
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
            {restaurant.nameTw || restaurant.name}
            {restaurant.nameTw && <span className="text-xs text-slate-500 font-normal ml-1">({restaurant.name})</span>}
            {restaurant.lat === 0 && <span className="ml-1 text-[10px] font-normal text-slate-400 bg-slate-100 px-1 rounded">住所非公開</span>}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded text-sm font-bold text-slate-700">
              <div className="w-3.5 h-3.5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] font-bold leading-none">T</div>
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

        {/* Row 2 and below */}
        <div className="flex gap-2 mt-1">
          {/* Left Column: Info & Photos */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            {/* Row 2: Cuisine, Awards */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                <Utensils className="w-3.5 h-3.5 text-slate-500" />
                {restaurant.cuisine.split('、').map(c => getCuisineInfo(c.trim()).zh).join('、')}
              </span>
              
              {(() => {
                const { awards, hyakumeiten } = getAwards(restaurant);
                return (
                  <>
                    {awards.slice(0, 1).map((award, idx) => {
                      const tier = award.includes('Gold') ? '金' : award.includes('Silver') ? '銀' : award.includes('Bronze') ? '銅' : '';
                      return (
                        <span key={idx} title={award} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 text-xs font-bold border border-yellow-200 cursor-help">
                          <Trophy className="w-3.5 h-3.5" />
                          {tier}
                        </span>
                      );
                    })}
                    {hyakumeiten.slice(0, 1).map((hm, idx) => (
                      <span key={idx} title={hm} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200 cursor-help">
                        <Medal className="w-3.5 h-3.5" />
                      </span>
                    ))}
                  </>
                );
              })()}
            </div>

            {/* Row 2.5: Store Info */}
            {restaurant.storeInfo && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 font-medium">
                {/* Reservable */}
                {restaurant.storeInfo['予約可否'] && (
                  <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
                    {restaurant.storeInfo['予約可否'].includes('完全予約制') ? '完全預約' : 
                     restaurant.storeInfo['予約可否'].includes('予約不可') ? '不可預約' : 
                     restaurant.storeInfo['予約可否'].includes('予約可') ? '可預約' : '預約資訊'}
                  </span>
                )}
                
                {/* Seats */}
                {restaurant.storeInfo['席数'] && restaurant.storeInfo['席数'].match(/(\d+)\s*席/) && (
                  <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {restaurant.storeInfo['席数'].match(/(\d+)\s*席/)[1]}席
                  </span>
                )}

                {/* Smoking */}
                {restaurant.storeInfo['禁煙・喫煙'] && (() => {
                  const smokingInfo = restaurant.storeInfo['禁煙・喫煙'];
                  const isSmoking = smokingInfo.includes('喫煙可') || smokingInfo.includes('分煙');
                  return (
                    <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded border", isSmoking ? "bg-red-500 text-white border-red-600" : "bg-slate-50 text-slate-600 border-slate-100")}>
                      {isSmoking ? <Cigarette className="w-3.5 h-3.5 text-white" /> : <CigaretteOff className="w-3.5 h-3.5 text-slate-500" />}
                      {smokingInfo.includes('禁煙') ? '禁菸' : 
                       smokingInfo.includes('分煙') ? '分煙' : '可吸菸'}
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Row 3: Photos */}
            {restaurant.photos && restaurant.photos.length > 0 && (
              <div className="flex gap-1.5 h-16 mt-0.5">
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
            )}
          </div>

          {/* Right Column: Buttons */}
          <div className="w-[76px] shrink-0 flex flex-col gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' 東京')}&lr=lang_zh-TW`, '_blank', 'noopener,noreferrer');
              }}
              className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded border border-indigo-100 transition-colors py-1"
              title="Google 評價"
            >
              <Search className="w-3 h-3" />
              <span className="text-xs font-bold">評價</span>
            </button>
            
            {restaurant.storeInfo?.['予約可否'] && (restaurant.storeInfo['予約可否'].includes('予約可') || restaurant.storeInfo['予約可否'].includes('完全予約制')) && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' 予約')}`, '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded border border-rose-100 transition-colors py-1"
                title="Google 預約"
              >
                <CalendarCheck className="w-3 h-3" />
                <span className="text-xs font-bold">預約</span>
              </button>
            )}

            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(restaurant.url, '_blank', 'noopener,noreferrer');
              }}
              className="flex-1 flex items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded border border-orange-100 transition-colors py-1"
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
              className="flex-1 flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100 text-green-600 rounded border border-green-100 transition-colors py-1"
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
                className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded border border-blue-100 transition-colors py-1"
                title="官方網站"
              >
                <Globe className="w-3 h-3" />
                <span className="text-xs font-bold">官網</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
