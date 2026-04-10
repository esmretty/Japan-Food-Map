import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Loader2, MapPin, Check, ExternalLink, Map } from 'lucide-react';
import { guessRestaurantFromImage, fetchRestaurantDetails, RestaurantGuess, RestaurantDetails } from '../services/geminiService';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (restaurant: any) => void;
  user: any;
  toggleStatus: (restaurantId: string, field: 'visited' | 'favorite' | 'wantToGo') => Promise<void>;
}

type Step = 'upload' | 'analyzing' | 'select' | 'fetching' | 'error';

export default function ImageUploadModal({ isOpen, onClose, onSuccess, user, toggleStatus }: ImageUploadModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [errorMsg, setErrorMsg] = useState('');
  const [guesses, setGuesses] = useState<RestaurantGuess[]>([]);
  const [detailedCandidates, setDetailedCandidates] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (step !== 'upload') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('圖片大小不能超過 5MB');
      setStep('error');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      setSelectedImage(base64String);
      
      // Extract base64 data and mime type
      const matches = base64String.match(/^data:(.+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        setErrorMsg('圖片格式錯誤');
        setStep('error');
        return;
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];

      setStep('analyzing');
      try {
        const result = await guessRestaurantFromImage(base64Data, mimeType);
        
        // Filter out low confidence
        const validGuesses = result.guesses.filter(g => g.confidence >= 10);
        
        if (validGuesses.length === 0) {
          setErrorMsg(result.hasTextOrSignboard === false ? '建議提供包含文字或招牌的店家圖片，這樣我才能更準確地辨識喔！' : '這張照片線索太少了，我認不出來是哪家餐廳 😭，請試著上傳有招牌或明顯特徵的照片喔！');
          setStep('error');
        } else {
          setGuesses(validGuesses.sort((a, b) => b.confidence - a.confidence));
          if (result.hasTextOrSignboard === false) {
            setErrorMsg('建議提供包含文字或招牌的店家圖片，這樣我才能更準確地辨識喔！');
          } else {
            setErrorMsg('');
          }
          
          setStep('fetching');
          
          // Fetch details for all valid guesses
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
        setErrorMsg('分析圖片時發生錯誤，請稍後再試。');
        setStep('error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleSelectRestaurant = async (details: any, field: 'visited' | 'favorite' | 'wantToGo') => {
    setStep('fetching');
    try {
      // Save to Firestore
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
        reviews: 0, // Default
        isUserAdded: true,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'restaurants'), newRestaurant);
      
      const newRestaurantWithId = { ...newRestaurant, id: docRef.id };
      
      // Update user status
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
    setStep('upload');
    setErrorMsg('');
    setGuesses([]);
    setDetailedCandidates([]);
    setSelectedImage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:pl-[400px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Camera className="w-5 h-5 text-orange-500" />
            圖片辨識找餐廳
          </h2>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div 
                className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-slate-700 font-medium mb-1">點擊上傳、或直接貼上 (Ctrl+V) 照片</p>
                <p className="text-slate-500 text-sm text-center">建議包含招牌、菜單或明顯特徵以提高準確率<br/>(檔案大小限制 5MB)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative w-24 h-24 mb-6">
                {selectedImage && (
                  <img src={selectedImage} alt="Selected" className="w-full h-full object-cover rounded-lg opacity-50" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                </div>
              </div>
              <p className="text-slate-700 font-bold text-lg mb-2">AI 正在辨識圖片...</p>
              <p className="text-slate-500 text-sm">尋找可能的餐廳名稱</p>
            </div>
          )}

          {step === 'fetching' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative w-24 h-24 mb-6">
                {selectedImage && (
                  <img src={selectedImage} alt="Selected" className="w-full h-full object-cover rounded-lg opacity-50" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                </div>
              </div>
              <p className="text-slate-700 font-bold text-lg mb-2">正在網路上搜尋餐廳資訊...</p>
              <p className="text-slate-500 text-sm text-center">正在擷取精確座標與 Tabelog 詳細資料<br/>這可能需要幾秒鐘的時間</p>
            </div>
          )}

          {step === 'select' && (
            <div className="flex flex-col">
              {errorMsg && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
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
                  onClick={() => setStep('upload')}
                  className="w-full flex items-center justify-center p-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all text-center text-slate-600 font-medium mt-4"
                >
                  都不是，重新上傳
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
                onClick={() => setStep('upload')}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
              >
                重新上傳
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
