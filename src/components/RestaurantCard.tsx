import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, CheckCircle2, Heart, Bookmark, Utensils, Trophy, Medal, CalendarCheck, Users, CigaretteOff, Cigarette, ExternalLink, MapPin, Globe, Search, MessageSquare } from 'lucide-react';
import { type Restaurant } from '../data/restaurants';
import { type UserRestaurantData } from '../types';
import { getCuisineInfo, getAwards, cn } from '../utils';
import { User } from 'firebase/auth';

interface RestaurantCardProps {
  restaurant: Restaurant;
  user: User | null;
  userRestaurantData: Record<string, UserRestaurantData>;
  toggleStatus: (id: string, field: 'visited' | 'favorite' | 'wantToGo') => Promise<void> | void;
  saveNote?: (id: string, note: string) => Promise<void>;
  hoveredRestaurantId?: string;
  setHoveredRestaurant: (restaurant: Restaurant | null) => void;
  setMapCenter: (center: [number, number]) => void;
  viewMode: string;
  isListOpen: boolean;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  user,
  userRestaurantData,
  toggleStatus,
  saveNote,
  hoveredRestaurantId,
  setHoveredRestaurant,
  setMapCenter,
  viewMode,
  isListOpen
}) => {
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(userRestaurantData[restaurant.id]?.notes || '');
  const cardRef = useRef<HTMLDivElement>(null);
  const noteBtnRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!noteBtnRef.current || !userRestaurantData[restaurant.id]?.notes || isNoteOpen) return;
    
    const updateRect = () => {
      if (noteBtnRef.current) {
        setRect(noteBtnRef.current.getBoundingClientRect());
      }
    };
    
    updateRect();
    const scrollParent = cardRef.current?.closest('.overflow-y-auto');
    if (scrollParent) {
      scrollParent.addEventListener('scroll', updateRect);
      window.addEventListener('resize', updateRect);
      return () => {
        scrollParent.removeEventListener('scroll', updateRect);
        window.removeEventListener('resize', updateRect);
      };
    }
  }, [userRestaurantData[restaurant.id]?.notes, isNoteOpen]);

  return (
    <div 
      ref={cardRef}
      className={cn(
        "relative p-4 rounded-xl border transition-all cursor-pointer group hover:shadow-md",
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
      {/* Note Speech Bubble (Rendered in Portal to escape overflow: hidden/auto) */}
      {userRestaurantData[restaurant.id]?.notes && !isNoteOpen && rect && rect.width > 0 && isListOpen && createPortal(
         <div 
           className="fixed w-56 p-3 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-[9999] pointer-events-none hidden md:block"
           style={{ 
             top: rect.top + rect.height / 2 - 20, // Center vertically with the button
             left: rect.right + 12, // Closer to the button
             // Hide if scrolled out of view (assuming header is ~64px)
             opacity: rect.top < 50 || rect.bottom > window.innerHeight ? 0 : 1,
             transition: 'opacity 0.2s'
           }}
         >
            <div className="absolute -left-[10px] top-1/2 -translate-y-1/2 w-4 h-5 bg-white border-l-4 border-b-4 border-black transform rotate-[30deg] skew-x-12 rounded-bl-sm"></div>
            <p className="text-sm text-black italic whitespace-pre-wrap break-all font-bold">「{userRestaurantData[restaurant.id].notes}」</p>
         </div>,
         document.body
      )}

      <div className="flex flex-col gap-2">
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
          <h3 className="font-bold text-[14px] text-slate-900 group-hover:text-orange-600 transition-colors leading-tight flex-1">
            {restaurant.nameTw || restaurant.name}
            {restaurant.nameTw && <span className="text-xs text-slate-500 font-normal ml-1">({restaurant.name})</span>}
            {restaurant.lat === 0 && <span className="ml-1 text-[10px] font-normal text-slate-400 bg-slate-100 px-1 rounded">住所非公開</span>}
          </h3>
          
          {user && (
            <div className="flex items-center gap-1 relative shrink-0">
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
              <button 
                ref={noteBtnRef}
                onClick={(e) => { e.stopPropagation(); setIsNoteOpen(!isNoteOpen); }}
                className={`flex items-center justify-center p-1 rounded transition-colors ${userRestaurantData[restaurant.id]?.notes ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'}`}
                title={userRestaurantData[restaurant.id]?.notes ? '編輯筆記' : '新增筆記'}
              >
                <MessageSquare className="w-3.5 h-3.5" fill={userRestaurantData[restaurant.id]?.notes ? 'currentColor' : 'none'} />
              </button>

              {/* Note Input Box */}
              {isNoteOpen && (
                <div 
                  className="absolute right-0 top-[calc(100%+8px)] w-64 p-3 bg-white rounded-lg border border-slate-200 shadow-xl z-50 flex flex-col gap-2 cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <textarea
                    className="w-full text-sm p-2 rounded border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                    rows={3}
                    maxLength={100}
                    placeholder="寫下您的私人筆記或評論 (最多100字)..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-400 font-medium">{noteText.length}/100</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsNoteOpen(false)}
                        className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded transition-colors"
                      >
                        取消
                      </button>
                      <button 
                        onClick={async () => {
                          if (saveNote) {
                            await saveNote(restaurant.id, noteText);
                            setIsNoteOpen(false);
                          }
                        }}
                        className="px-3 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded transition-colors"
                      >
                        儲存
                      </button>
                    </div>
                  </div>
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
                  {(restaurant.cuisine || (restaurant as any).genre || 'UNKNOWN_OTHER').split('、').map((c: string) => getCuisineInfo(c.trim()).zh).join('、')}
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

            {/* Bottom: Photos (Only 2 photos) */}
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
      </div>
    </div>
  );
}
