import React, { useState, useEffect } from 'react';
import { X, Download, Upload, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { exportUserDataFromOldDB, importUserDataToNewDB, exportAllRestaurantsFromOldDBCache, importRestaurantsToNewDB } from '../services/firebaseService';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ isOpen, onClose, userId }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isMigratingAll, setIsMigratingAll] = useState(false);
  const [exportData, setExportData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setExportData(null);
      setError(null);
      setSuccess(false);
      setMigrationMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMigrateAllRestaurants = async () => {
    setIsMigratingAll(true);
    setError(null);
    setMigrationMessage("正在從您的瀏覽器快取讀取所有餐廳資料...");
    try {
      const restaurants = await exportAllRestaurantsFromOldDBCache();
      setMigrationMessage(`成功從快取讀取 ${restaurants.length} 筆餐廳資料！正在寫入新資料庫 (這可能需要幾分鐘的時間以避免超載)...`);
      await importRestaurantsToNewDB(restaurants);
      setSuccess(true);
      setMigrationMessage(`成功將 ${restaurants.length} 筆餐廳資料寫入新資料庫！`);
    } catch (err: any) {
      console.error("Migration failed:", err);
      setError(err.message || "搬移失敗，請稍後再試。");
      setMigrationMessage(null);
    } finally {
      setIsMigratingAll(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const data = await exportUserDataFromOldDB(userId);
      const jsonString = JSON.stringify(data, null, 2);
      setExportData(jsonString);
      
      // Trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `japan-food-map-backup-${userId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStep(2);
    } catch (err: any) {
      console.error("Export failed:", err);
      setError(err.message || "匯出失敗，請稍後再試。");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importUserDataToNewDB(userId, data);
      setSuccess(true);
    } catch (err: any) {
      console.error("Import failed:", err);
      setError(err.message || "匯入失敗，請確認檔案格式是否正確。");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">搬移舊資料</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">搬移成功！</h3>
              <p className="text-slate-600 mb-6">您的所有收藏與喜好設定已成功轉移至新資料庫。</p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors"
              >
                重新載入頁面
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center mb-6">
                <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                <div className={`flex-1 h-2 rounded-full ml-2 ${step >= 2 ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {migrationMessage && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-blue-700 text-sm">
                  <Database className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{migrationMessage}</p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4">
                    <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      緊急救援：搬移所有餐廳資料
                    </h3>
                    <p className="text-sm text-purple-700 mb-4">
                      如果您發現地圖上的餐廳變少了，點擊下方按鈕，系統會嘗試從您的瀏覽器快取中，把所有上萬筆餐廳資料直接寫入新資料庫。
                    </p>
                    <button
                      onClick={handleMigrateAllRestaurants}
                      disabled={isMigratingAll}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {isMigratingAll ? (
                        <span className="animate-pulse">正在執行搬移作業...</span>
                      ) : (
                        <>
                          <Database className="w-5 h-5" />
                          從快取救援所有餐廳資料
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                      <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                      匯出舊資料
                    </h3>
                    <p className="text-sm text-blue-700 mb-4">
                      點擊下方按鈕，系統會從舊資料庫讀取您的收藏紀錄與設定，並下載成一個備份檔案到您的電腦。
                    </p>
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isExporting ? (
                        <span className="animate-pulse">正在讀取並匯出...</span>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          下載我的資料
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                      <span className="bg-orange-200 text-orange-800 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                      匯入新資料庫
                    </h3>
                    <p className="text-sm text-orange-700 mb-4">
                      請上傳剛剛下載的 <strong>japan-food-map-backup-{userId}.json</strong> 檔案，系統會將資料寫入您的新資料庫。
                    </p>
                    <label className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-50">
                      {isImporting ? (
                        <span className="animate-pulse">正在寫入資料...</span>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          選擇檔案並匯入
                          <input 
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            onChange={handleImport}
                            disabled={isImporting}
                          />
                        </>
                      )}
                    </label>
                  </div>
                  <button 
                    onClick={() => setStep(1)}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
                  >
                    重新下載
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
