import React, { useState } from 'react';
import { Search, X, Loader2, MapPin, ExternalLink, Map } from 'lucide-react';
import { guessRestaurantFromUrl, fetchRestaurantDetails, RestaurantGuess } from '../services/geminiService';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (restaurant: any) => void;
  user: any;
  toggleStatus: (restaurantId: string, field: 'visited' | 'favorite' | 'wantToGo') => Promise<void>;
}

type Step = 'input' | 'analyzing' | 'select' | 'fetching' | 'error';

export default function AddRestaurantModal({ isOpen, onClose, onSuccess, user, toggleStatus }: AddRestaurantModalProps) {
  const [step, setStep] = useState<Step>('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [guesses, setGuesses] = useState<RestaurantGuess[]>([]);
  const [detailedCandidates, setDetailedCandidates] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const processInput = async (input: string) => {
    setStep('analyzing');
    try {
      let validGuesses: RestaurantGuess[] = [];

      // Check if input is a URL
      if (input.startsWith('http://') || input.startsWith('https://')) {
        const result = await guessRestaurantFromUrl(input);
        if (result.guesses.length === 0) {
          if (!result.hasTextOrSignboard) {
            setErrorMsg('網頁內容中沒有找到餐廳名稱，請確認網址是否正確。');
          } else {
            setErrorMsg('無法從網頁中辨識出餐廳，請嘗試其他網址。');
          }
          setStep('error');
          return;
        }
        validGuesses = result.guesses.filter(g => g.confidence >= 10);
      } else {
        // Input is a restaurant name
        validGuesses = [{ name: input, area: '', confidence: 100 }];
      }
      
      if (validGuesses.length === 0) {
        setErrorMsg('無法辨識出餐廳，請嘗試其他輸入。');
        setStep('error');
      } else {
        setGuesses(validGuesses.sort((a, b) => b.confidence - a.confidence));
        setStep('fetching');
        
        const detailsPromises = validGuesses.map(guess => fetchRestaurantDetails(guess.name, guess.area));
        const detailsResults = await Promise.all(detailsPromises);
        
        const validDetails = detailsResults.filter(d => d !== null);
        
        if (validDetails.length === 0) {
          setErrorMsg('無法取得餐廳詳細資訊。');
          setStep('error');
          return;
        }
        
        setDetailedCandidates(validDetails);
        setStep('select');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('處理輸入時發生錯誤。');
      setStep('error');
    }
  };

  const handleSelectRestaurant = async (details: any, field: 'visited' | 'favorite' | 'wantToGo') => {
    setStep('fetching');
    try {
      const newRestaurant = {
        name: details.name,
        nameTw: details.nameTw || '',
        address: details.address,
        lat: details.lat,
        lng: details.lng,
        score: details.score,
        cuisine: details.genre || 'UNKNOWN_OTHER',
        url: details.tabelogUrl || '',
        awards: details.awards || [],
        hyakumeiten: details.hyakumeiten ? ['百名店'] : [],
        photos: details.photos || [],
        description: details.description || '',
        businessHours: details.businessHours || '',
        storeInfo: details.storeInfo || {},
        reviews: 0,
        isUserAdded: true,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'restaurants'), newRestaurant);
      const newRestaurantWithId = { ...newRestaurant, id: docRef.id };
      
      if (user && toggleStatus) {
        await toggleStatus(docRef.id, field);
      }
      
      onSuccess(newRestaurantWithId);
      handleClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('寫入資料庫時發生錯誤。');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('input');
    setErrorMsg('');
    setGuesses([]);
    setDetailedCandidates([]);
    setInputValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:pl-[400px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            以店名新增餐廳
          </h2>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 'input' && (
            <div className="flex flex-col items-center justify-center py-8 gap-6">
              <div className="w-full">
                <p className="text-slate-700 font-medium mb-2 text-sm">輸入餐廳名稱或貼上 Tabelog 網址</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="例如：敘敘苑 新宿店 或 https://tabelog.com/..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inputValue) {
                        processInput(inputValue);
                      }
                    }}
                  />
                  <button 
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors"
                    onClick={() => {
                      if (inputValue) processInput(inputValue);
                    }}
                  >
                    搜尋
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-700 font-bold text-lg mb-2">AI 正在處理中...</p>
              <p className="text-slate-500 text-sm">尋找可能的餐廳名稱</p>
            </div>
          )}

          {step === 'fetching' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-700 font-bold text-lg mb-2">正在網路上搜尋餐廳資訊...</p>
              <p className="text-slate-500 text-sm text-center">正在擷取精確座標與 Tabelog 詳細資料<br/>這可能需要幾秒鐘的時間</p>
            </div>
          )}

          {step === 'select' && (
            <div className="flex flex-col">
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errorMsg}
                </div>
              )}
              <p className="text-slate-700 font-medium mb-4">AI 猜測這可能是以下餐廳，請選擇正確的一家並標記狀態：</p>
              <div className="space-y-4">
                {detailedCandidates.map((details, idx) => (
                  <div
                    key={idx}
                    className="w-full flex flex-col p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all text-left gap-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-slate-800 leading-tight">{details.name}</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{details.genre}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-orange-600 font-bold text-lg">{details.score?.toFixed(2) || '-'}</span>
                        <span className="text-xs text-slate-500">Tabelog</span>
                      </div>
                    </div>

                    {(details.awards?.length > 0 || details.hyakumeiten) && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {details.awards?.map((award: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-sm border border-yellow-200">
                            {award.replace('The Tabelog Award ', '')}
                          </span>
                        ))}
                        {details.hyakumeiten && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-bold rounded-sm border border-orange-200">
                            百名店
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-start gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{details.address}</span>
                    </div>

                    <div className="flex gap-2 mt-1 pb-3 border-b border-slate-100">
                      <a 
                        href={details.tabelogUrl || `https://www.google.com/search?q=${encodeURIComponent(details.name + ' tabelog')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-orange-50 text-orange-600 rounded text-xs font-medium hover:bg-orange-100 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Tabelog
                      </a>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.name + ' ' + details.address)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Map className="w-3.5 h-3.5" />
                        Google Map
                      </a>
                    </div>
                    
                    <div className="flex flex-row gap-2 w-full pt-1">
                      <button
                        onClick={() => handleSelectRestaurant(details, 'visited')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <span className="text-xl">😋</span> 已吃過
                      </button>
                      <button
                        onClick={() => handleSelectRestaurant(details, 'favorite')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 transition-colors"
                      >
                        <span className="text-xl">😍</span> 喜愛
                      </button>
                      <button
                        onClick={() => handleSelectRestaurant(details, 'wantToGo')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <span className="text-xl">🥺</span> 想去
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setStep('input')}
                  className="w-full flex items-center justify-center p-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all text-center text-slate-600 font-medium mt-4"
                >
                  都不是，重新輸入
                </button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-slate-800 font-bold mb-2">辨識失敗</p>
              <p className="text-slate-600 mb-6">{errorMsg}</p>
              <button 
                onClick={() => setStep('input')}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
              >
                重新輸入
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
