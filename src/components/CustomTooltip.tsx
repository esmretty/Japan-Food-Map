import React, { useState } from 'react';
import { Star, CheckCircle2, Heart, Bookmark, Utensils, Trophy, Medal, CalendarCheck, Users, CigaretteOff, Cigarette, ExternalLink, MapPin, Globe, Search, MessageSquare } from 'lucide-react';
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
      className="fixed z-[9999] bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-200/60 pointer-events-auto"
      style={{ 
        top: pos.top, 
        left: pos.left, 
        opacity: pos.opacity,
        visibility: pos.opacity === 0 ? 'hidden' : 'visible'
      }}
    >
      <div className="w-[352px] whitespace-normal flex flex-col gap-2">
        {/* Row 1: Score, Awards, Hyakumeiten */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-orange-50 px-1.5 py-0.5 rounded text-sm font-bold text-orange-700 border border-orange-200">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] font-bold leading-none">T</div>
            {restaurant.score.toFixed(2)}
          </div>
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
                {hyakumeiten.slice(0, 1).map((hm, idx) => {
                  const yearMatch = hm.match(/20\d{2}/);
                  const year = yearMatch ? yearMatch[0] : '';
                  return (
                    <span key={idx} title={hm} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200 cursor-help">
                      <Medal className="w-3.5 h-3.5" />
                      百名店 {year}
                    </span>
                  )
                })}
              </>
            );
          })()}
        </div>

        {/* Row 2: Name and User Actions */}
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-[14px] text-slate-900 leading-tight flex-1">
            {restaurant.nameTw || restaurant.name}
            {restaurant.nameTw && <span className="text-xs text-slate-500 font-normal ml-1">({restaurant.name})</span>}
            {restaurant.lat === 0 && <span className="ml-1 text-[10px] font-normal text-slate-400 bg-slate-100 px-1 rounded">住所非公開</span>}
          </h3>
          
          {user && (
            <div className="flex items-center gap-1 shrink-0">
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
              {userRestaurantData[restaurant.id]?.notes && (
                <div 
                  className="flex items-center justify-center p-1 rounded bg-amber-100 text-amber-700 border border-amber-200"
                  title="已有筆記"
                >
                  <MessageSquare className="w-3.5 h-3.5" fill="currentColor" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 3 & 4 & Photos + Right Buttons */}
        <div className="flex gap-3 mt-1">
          {/* Left Column: Info & Photos */}
          <div className="flex-1 flex flex-col justify-between min-w-0 gap-1.5">
            <div className="flex flex-col gap-1.5">
              {/* Row 3: Cuisine */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                  <Utensils className="w-3.5 h-3.5 text-slate-500" />
                  {restaurant.cuisine.split('、').map(c => getCuisineInfo(c.trim()).zh).join('、')}
                </span>
              </div>

              {/* Row 4: Store Info */}
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
            </div>

            {/* Bottom: Photos */}
            {restaurant.photos && restaurant.photos.length > 0 && (
              <div className="flex gap-1.5 h-16 mt-0.5">
                {restaurant.photos.slice(0, 2).map((photo, idx) => (
                  <div key={idx} className="relative flex-1 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
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
          <div className="w-[72px] shrink-0 flex flex-col justify-between gap-1">
            {/* Row 1: 找網評 */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' 東京')}&lr=lang_zh-TW`, '_blank', 'noopener,noreferrer');
              }}
              className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded transition-colors py-1"
              title="Google 評價"
            >
              <Search className="w-3 h-3" />
              <span className="text-[11px] font-bold">找網評</span>
            </button>
            
            {/* Row 2: 找預約 */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' 予約')}`, '_blank', 'noopener,noreferrer');
              }}
              className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded transition-colors py-1"
              title="Google 預約"
            >
              <CalendarCheck className="w-3 h-3" />
              <span className="text-[11px] font-bold">找預約</span>
            </button>

            {/* Row 3: Map & Official Website (Icons only) */}
            <div className="flex gap-1 justify-between">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const gmapsUrl = restaurant.googleMapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`;
                  window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded transition-colors py-1"
                title="在 Google Maps 上查看"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
              {restaurant.storeInfo && (restaurant.storeInfo['ホームページ'] || restaurant.storeInfo['お店のホームページ']) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = restaurant.storeInfo['ホームページ'] || restaurant.storeInfo['お店のホームページ'];
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex-1 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded transition-colors py-1"
                  title="官方網站"
                >
                  <Globe className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Row 4: Tabelog */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(restaurant.url, '_blank', 'noopener,noreferrer');
              }}
              className="flex items-center justify-center gap-1 bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 rounded transition-colors py-1"
              title="在 Tabelog 上查看"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] font-bold leading-none">T</div>
              <span className="text-[11px] font-bold">Tabelog</span>
            </button>
          </div>
        </div>

        {/* Note Speech Bubble at the bottom */}
        {userRestaurantData[restaurant.id]?.notes && (
          <div className="mt-1 p-3 bg-white border border-slate-200 rounded-xl relative shadow-sm">
            <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white border-t border-l border-slate-200 transform rotate-45"></div>
            <p className="text-sm text-black italic whitespace-pre-wrap break-all font-medium">「{userRestaurantData[restaurant.id].notes}」</p>
          </div>
        )}
      </div>
    </div>
  );
}
