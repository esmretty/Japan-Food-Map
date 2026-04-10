import React from 'react';
import { Utensils, LogOut, LogIn, CheckCircle2, Heart, Bookmark, Search, UtensilsCrossed, ChevronDown, ChevronRight, Calendar, MapPin, Star, Trophy, Medal, ChevronLeft, Globe, Camera, Link } from 'lucide-react';
import { User } from 'firebase/auth';
import { cn, getCuisineInfo } from '../utils';

interface SidebarProps {
  user: User | null;
  loginWithGoogle: () => void;
  logout: () => void;
  tokyoRestaurantsLength: number;
  filteredRestaurantsLength: number;
  isListOpen: boolean;
  setIsListOpen: (isOpen: boolean) => void;
  viewMode: 'all' | 'visited' | 'favorite' | 'wantToGo';
  handleViewModeChange: (mode: 'all' | 'visited' | 'favorite' | 'wantToGo') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isCuisineOpen: boolean;
  setIsCuisineOpen: (isOpen: boolean) => void;
  selectedCuisines: string[];
  setSelectedCuisines: React.Dispatch<React.SetStateAction<string[]>>;
  uniqueCuisines: string[];
  savePreferences: () => void;
  loadPreferences: () => void;
  saveStatus: { status: 'success' | 'error', message: string } | null;
  groupOrder: string[];
  groupedCuisines: Record<string, string[]>;
  cuisineCounts: Record<string, number>;
  isDaysOpen: boolean;
  setIsDaysOpen: (isOpen: boolean) => void;
  selectedDay: string | null;
  setSelectedDay: (day: string | null) => void;
  dayMap: Record<string, string>;
  isLocationOpen: boolean;
  setIsLocationOpen: (isOpen: boolean) => void;
  selectedWards: string[];
  setSelectedWards: React.Dispatch<React.SetStateAction<string[]>>;
  availableWards: string[];
  isAdvancedOpen: boolean;
  setIsAdvancedOpen: (isOpen: boolean) => void;
  minScore: number;
  setMinScore: (score: number) => void;
  maxScore: number;
  setMaxScore: (score: number) => void;
  selectedScoreRanges: string[];
  setSelectedScoreRanges: React.Dispatch<React.SetStateAction<string[]>>;
  useCustomScoreRange: boolean;
  setUseCustomScoreRange: (useCustom: boolean) => void;
  requireAward: boolean;
  setRequireAward: (require: boolean) => void;
  requireHyakumeiten: boolean;
  setRequireHyakumeiten: (require: boolean) => void;
  setIsImageUploadOpen: (isOpen: boolean) => void;
  setIsUrlSearchOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user, loginWithGoogle, logout, tokyoRestaurantsLength, filteredRestaurantsLength,
  isListOpen, setIsListOpen, viewMode, handleViewModeChange, searchQuery, setSearchQuery,
  isCuisineOpen, setIsCuisineOpen, selectedCuisines, setSelectedCuisines, uniqueCuisines,
  savePreferences, loadPreferences, saveStatus, groupOrder, groupedCuisines, cuisineCounts,
  isDaysOpen, setIsDaysOpen, selectedDay, setSelectedDay, dayMap, isLocationOpen, setIsLocationOpen,
  selectedWards, setSelectedWards, availableWards, isAdvancedOpen, setIsAdvancedOpen,
  minScore, setMinScore, maxScore, setMaxScore, selectedScoreRanges, setSelectedScoreRanges, useCustomScoreRange, setUseCustomScoreRange, requireAward, setRequireAward, requireHyakumeiten, setRequireHyakumeiten, setIsImageUploadOpen, setIsUrlSearchOpen
}) => {
  return (
    <div className="w-full md:w-[400px] h-[45vh] md:h-full bg-slate-50 shadow-2xl flex flex-col z-30 relative shrink-0">
      <div className="p-4 md:p-6 bg-slate-100 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg shadow-sm">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">東京美食地圖</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('open-migration-modal'))}
                  className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold hover:bg-blue-200 transition-colors"
                >
                  搬移舊資料
                </button>
                <img src={user.photoURL || ''} alt="avatar" className="w-8 h-8 rounded-full border border-slate-200 shadow-sm" />
                <button onClick={logout} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-md transition-colors" title="登出">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button onClick={loginWithGoogle} className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-slate-50 shadow-sm transition-colors">
                <LogIn className="w-4 h-4" /> 登入
              </button>
            )}
            <button 
              onClick={() => setIsListOpen(!isListOpen)}
              className="md:hidden flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-md font-bold text-sm shadow-sm"
            >
              {isListOpen ? '隱藏列表' : '顯示列表'} ({filteredRestaurantsLength})
            </button>
          </div>

        </div>
        <p className="text-sm text-slate-500">
          精選 {tokyoRestaurantsLength} 家 Tabelog 高分餐廳
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
        {/* View Mode */}
        {user && (
          <div className="flex gap-2 mb-6 bg-slate-100/80 p-2 rounded-2xl shadow-inner border border-slate-200/60 backdrop-blur-sm">
            <button
              onClick={() => handleViewModeChange('all')}
              className={cn(
                "flex-1 py-2 text-[13px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5",
                viewMode === 'all' 
                  ? "bg-white text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.1)] scale-105 ring-1 ring-slate-200/50" 
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-700 hover:scale-105 active:scale-95"
              )}
            >
              <Globe className="w-4 h-4" /> 全部
            </button>
            <button
              onClick={() => handleViewModeChange('visited')}
              className={cn(
                "flex-1 py-2 text-[13px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5",
                viewMode === 'visited' 
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] scale-105" 
                  : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:scale-105 active:scale-95"
              )}
            >
              <CheckCircle2 className="w-4 h-4" /> 已吃過
            </button>
            <button
              onClick={() => handleViewModeChange('favorite')}
              className={cn(
                "flex-1 py-2 text-[13px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5",
                viewMode === 'favorite' 
                  ? "bg-gradient-to-br from-pink-400 to-pink-600 text-white shadow-[0_4px_12px_rgba(236,72,153,0.3)] scale-105" 
                  : "text-slate-500 hover:bg-pink-50 hover:text-pink-600 hover:scale-105 active:scale-95"
              )}
            >
              <Heart className="w-4 h-4" fill={viewMode === 'favorite' ? 'currentColor' : 'none'} /> 喜愛
            </button>
            <button
              onClick={() => handleViewModeChange('wantToGo')}
              className={cn(
                "flex-1 py-2 text-[13px] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5",
                viewMode === 'wantToGo' 
                  ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] scale-105" 
                  : "text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:scale-105 active:scale-95"
              )}
            >
              <Bookmark className="w-4 h-4" fill={viewMode === 'wantToGo' ? 'currentColor' : 'none'} /> 想去
            </button>
          </div>
        )}

        {/* Search and Image Upload */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜尋餐廳名稱..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsUrlSearchOpen(true)}
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            title="以店名新增餐廳"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsImageUploadOpen(true)}
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
            title="上傳照片搜尋"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Cuisine Filter */}
          <div className="mb-4">
            <div 
              className="flex items-center justify-between py-2.5 px-4 md:px-6 -mx-4 md:-mx-6 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors border-y border-orange-100"
              onClick={() => setIsCuisineOpen(!isCuisineOpen)}
            >
              <div className="flex items-center gap-2 text-orange-700">
                <UtensilsCrossed className="w-4 h-4" />
                <p className="text-sm font-bold">料理種類 (可複選)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-200">
                  已選 {selectedCuisines.length}
                </span>
                {isCuisineOpen ? <ChevronDown className="w-4 h-4 text-orange-400" /> : <ChevronRight className="w-4 h-4 text-orange-400" />}
              </div>
            </div>
            
            {isCuisineOpen && (
              <div className="pt-3">
                <div className="flex items-center justify-between mb-2 px-1">
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
                  </div>
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
                <div className="flex flex-col gap-y-3 max-h-[35vh] overflow-y-auto px-1">
                  {groupOrder.map(group => {
                    const cuisinesInGroup = groupedCuisines[group];
                    if (!cuisinesInGroup || cuisinesInGroup.length === 0) return null;
                    
                    return (
                      <div key={group} className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                        <div className="text-xs font-bold text-slate-600 bg-slate-200/50 px-2 py-1 rounded w-fit sm:w-[60px] shrink-0 text-center flex items-center justify-center mt-0.5">{group}</div>
                        <div className="flex flex-wrap gap-1 flex-1">
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
                                  "px-1.5 py-0.5 text-[13px] font-medium rounded transition-all border flex items-center gap-1",
                                  isSelected 
                                    ? "bg-orange-100 text-orange-700 border-orange-200" 
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                )}
                              >
                                <span>{info.zh}</span>
                                <span className="text-[10px] opacity-60">({cuisineCounts[cuisine] || 0})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Rating & Awards Filter */}
          <div className="mb-4">
            <div 
              className="flex items-center justify-between py-2.5 px-4 md:px-6 -mx-4 md:-mx-6 bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors border-y border-emerald-100"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            >
              <div className="flex items-center gap-2 text-emerald-700">
                <Star className="w-4 h-4" />
                <p className="text-sm font-bold">評價與進階篩選</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdvancedOpen ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>
            
            {isAdvancedOpen && (
              <div className="pt-3 space-y-3">
                <div className="flex justify-between items-center mb-1.5">
                  <p className="text-sm font-bold text-slate-700">分數區間</p>
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
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {['4.0+', '3.9', '3.8', '3.7', '3.6', '3.5', '3.4', '3.4-'].map(range => {
                      const isSelected = selectedScoreRanges.includes(range);
                      return (
                        <button
                          key={range}
                          onClick={() => {
                            setUseCustomScoreRange(false);
                            setSelectedScoreRanges(prev => 
                              prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
                            );
                          }}
                          className={cn(
                            "px-2 py-1 text-[12px] font-medium rounded transition-all border",
                            !useCustomScoreRange && isSelected
                              ? "bg-orange-100 text-orange-700 border-orange-300 shadow-sm"
                              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {range}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="radio" 
                        name="scoreRangeType"
                        checked={useCustomScoreRange}
                        onChange={() => setUseCustomScoreRange(true)}
                        className="w-3.5 h-3.5 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-xs text-slate-600 font-medium">自訂範圍：</span>
                    </label>
                    <div className={cn("flex items-center gap-2 text-sm font-medium transition-opacity", useCustomScoreRange ? "opacity-100" : "opacity-50 pointer-events-none")}>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="5"
                        className="w-16 px-1.5 py-0.5 rounded border border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-xs"
                        value={minScore}
                        onChange={(e) => setMinScore(parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-slate-400">~</span>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="5"
                        className="w-16 px-1.5 py-0.5 rounded border border-slate-300 focus:ring-orange-500 focus:border-orange-500 text-xs"
                        value={maxScore}
                        onChange={(e) => setMaxScore(parseFloat(e.target.value) || 5)}
                      />
                    </div>
                  </div>
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
            )}
          </div>

          {/* Location Filter */}
          <div className="mb-4">
            <div 
              className="flex items-center justify-between py-2.5 px-4 md:px-6 -mx-4 md:-mx-6 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors border-y border-purple-100"
              onClick={() => setIsLocationOpen(!isLocationOpen)}
            >
              <div className="flex items-center gap-2 text-purple-700">
                <MapPin className="w-4 h-4" />
                <p className="text-sm font-bold">行政區篩選 (可複選)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-purple-600 bg-white px-2 py-0.5 rounded border border-purple-200">
                  已選 {selectedWards.length}
                </span>
                {isLocationOpen ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
              </div>
            </div>
            
            {isLocationOpen && (
              <div className="pt-3">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <label className="flex items-center gap-1 cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
                    <input 
                      type="checkbox" 
                      className="w-3 h-3 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                      checked={selectedWards.length === availableWards.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWards([...availableWards]);
                        } else {
                          setSelectedWards([]);
                        }
                      }}
                    />
                    全勾
                  </label>
                  <button 
                    onClick={() => setSelectedWards([])}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    全消
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[25vh] overflow-y-auto px-1">
                  {availableWards.map(ward => {
                    const isSelected = selectedWards.includes(ward);
                    return (
                      <button
                        key={ward}
                        onClick={() => {
                          setSelectedWards(prev => 
                            prev.includes(ward) ? prev.filter(w => w !== ward) : [...prev, ward]
                          );
                        }}
                        className={cn(
                          "px-2 py-1 text-[12px] font-medium rounded transition-all border",
                          isSelected 
                            ? "bg-purple-100 text-purple-700 border-purple-300 shadow-sm" 
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {ward}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Days Filter */}
          <div className="mb-4">
            <div 
              className="flex items-center justify-between py-2.5 px-4 md:px-6 -mx-4 md:-mx-6 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors border-y border-blue-100"
              onClick={() => setIsDaysOpen(!isDaysOpen)}
            >
              <div className="flex items-center gap-2 text-blue-700">
                <Calendar className="w-4 h-4" />
                <p className="text-sm font-bold">營業日篩選</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {selectedDay ? dayMap[selectedDay] : '不限'}
                </span>
                {isDaysOpen ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4 text-blue-400" />}
              </div>
            </div>
            
            {isDaysOpen && (
              <div className="pt-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedDay(null)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[12px] font-medium transition-colors border",
                      selectedDay === null 
                        ? "bg-blue-600 text-white border-blue-700"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                    )}
                  >
                    清除
                  </button>
                  {['月', '火', '水', '木', '金', '土', '日', '祝'].map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[12px] font-medium transition-colors border",
                        selectedDay === day
                          ? "bg-orange-500 text-white border-orange-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                      )}
                    >
                      {dayMap[day]}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
        <span className="text-slate-400 text-[10px] mt-2 font-mono">
          {filteredRestaurantsLength}
        </span>
      </button>
    </div>
  );
}
