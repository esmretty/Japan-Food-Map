import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface RestaurantGuess {
  name: string;
  area: string;
  confidence: number;
}

export interface GuessResult {
  guesses: RestaurantGuess[];
  hasTextOrSignboard: boolean;
}

export interface RestaurantDetails {
  name: string;
  nameTw?: string;
  address: string;
  lat: number;
  lng: number;
  score: number;
  genre: string;
  tabelogUrl: string;
  awards: string[];
  hyakumeiten: boolean;
  businessHours?: string;
  photos?: string[];
  description?: string;
  storeInfo?: Record<string, string>;
}

export async function guessRestaurantFromImage(base64Image: string, mimeType: string): Promise<GuessResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      "這是一張在日本東京的餐廳或食物照片。請猜測這可能是哪一家餐廳。請列出最有可能的 1 到 3 家餐廳，並給予信心指數 (0-100)。\n注意：如果照片中沒有任何文字或招牌，信心指數最高只能給 20%。請同時判斷照片中是否包含文字或招牌。"
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          guesses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: "餐廳名稱 (包含分店名稱，例如：敘敘苑 新宿店)",
                },
                area: {
                  type: Type.STRING,
                  description: "餐廳所在的區域 (例如：新宿、澀谷、銀座)，如果不知道請留空",
                },
                confidence: {
                  type: Type.NUMBER,
                  description: "信心指數 (0-100)，代表你有多確定這是這家餐廳",
                },
              },
              required: ["name", "area", "confidence"],
            },
          },
          hasTextOrSignboard: {
            type: Type.BOOLEAN,
            description: "照片中是否包含任何文字或招牌",
          }
        },
        required: ["guesses", "hasTextOrSignboard"],
      },
    },
  });

  const jsonStr = response.text?.trim() || '{"guesses":[],"hasTextOrSignboard":true}';
  try {
    return JSON.parse(jsonStr) as GuessResult;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return { guesses: [], hasTextOrSignboard: true };
  }
}

export async function guessRestaurantFromUrl(url: string): Promise<GuessResult> {
  try {
    const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Failed to fetch URL content');
    const { html } = await res.json();

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        `這是一個網頁的 HTML 內容。請從中找出這是在介紹哪一家位於日本東京的餐廳。請列出最有可能的 1 到 3 家餐廳，並給予信心指數 (0-100)。\n注意：如果網頁內容沒有提到任何餐廳，信心指數最高只能給 20%。請同時判斷網頁中是否包含餐廳名稱。\n\n網頁內容：\n${html.substring(0, 30000)}` // Limit HTML length
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            guesses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "餐廳名稱 (包含分店名稱，例如：敘敘苑 新宿店)",
                  },
                  area: {
                    type: Type.STRING,
                    description: "餐廳所在的區域 (例如：新宿、澀谷、銀座)，如果不知道請留空",
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: "信心指數 (0-100)，代表你有多確定這是這家餐廳",
                  },
                },
                required: ["name", "area", "confidence"],
              },
            },
            hasTextOrSignboard: {
              type: Type.BOOLEAN,
              description: "網頁內容中是否包含任何餐廳名稱",
            }
          },
          required: ["guesses", "hasTextOrSignboard"],
        },
      },
    });

    const jsonStr = response.text?.trim() || '{"guesses":[],"hasTextOrSignboard":true}';
    return JSON.parse(jsonStr) as GuessResult;
  } catch (e) {
    console.error("Failed to guess from URL", e);
    return { guesses: [], hasTextOrSignboard: false };
  }
}

export async function fetchRestaurantDetails(restaurantName: string, area: string = ""): Promise<RestaurantDetails | null> {
  const searchTarget = area ? `${restaurantName} ${area}` : restaurantName;
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `請務必使用 Google Search 工具上網搜尋這家位於日本東京的餐廳：「${searchTarget}」。
為了確保資料的正確性與完整性，請執行以下搜尋：
1. 搜尋 "${searchTarget} tabelog"。
   - 從搜尋結果中，找到該餐廳的真實 Tabelog 網址 (通常以 https://tabelog.com/ 開頭)。
   - 警告：請直接複製搜尋結果中的真實網址，絕對不可以自己發明或瞎猜網址結尾的數字 ID。
   - 如果你無法確定真實的 Tabelog 網址，請直接回傳這個 Google 搜尋連結作為替代：https://www.google.com/search?q=${encodeURIComponent(searchTarget + ' tabelog')}
2. 搜尋 "${searchTarget} tabelog 百名店" 或 "${searchTarget} tabelog award"，確認該餐廳是否有獲得 Tabelog Award (Gold/Silver/Bronze) 或是入選百名店 (Hyakumeiten)。
3. 搜尋 "${searchTarget} 東京 google map"，找到該餐廳的精確經緯度座標 (lat, lng) 與完整地址。

請萃取出以下資訊：
1. name: 餐廳名稱 (日文原名)
2. address: 完整地址 (包含東京都)
3. lat: 精確的緯度座標 (數字)
4. lng: 精確的經度座標 (數字)
5. score: Tabelog 目前的分數 (數字，例如 3.54，如果找不到請填 0)
6. genre: 料理類型 (例如：燒肉、拉麵、壽司、居酒屋)
7. tabelogUrl: 該餐廳專屬的 Tabelog 網址 (必須是具體的餐廳頁面)
8. awards: 獲得的獎項 (字串陣列，例如：["The Tabelog Award 2024 Bronze"]，如果沒有請給空陣列)
9. hyakumeiten: 是否為 Tabelog 百名店 (布林值 true/false)

請以 JSON 格式回傳。`,
    tools: [
      { googleSearch: {} }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          address: { type: Type.STRING },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          score: { type: Type.NUMBER },
          genre: { type: Type.STRING },
          tabelogUrl: { type: Type.STRING },
          awards: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          hyakumeiten: { type: Type.BOOLEAN }
        },
        required: ["name", "address", "lat", "lng", "score", "genre", "tabelogUrl", "awards", "hyakumeiten"]
      }
    }
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) return null;
  
  try {
    const details = JSON.parse(jsonStr) as RestaurantDetails;
    
    // Fetch the real Tabelog URL from our backend scraper
    try {
      const searchRes = await fetch(`/api/search-tabelog?q=${encodeURIComponent(searchTarget)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.url) {
          details.tabelogUrl = searchData.url;
          
          // Now scrape the actual details from that URL
          const scrapeRes = await fetch(`/api/scrape-tabelog?url=${encodeURIComponent(searchData.url)}`);
          if (scrapeRes.ok) {
            const scrapedData = await scrapeRes.json();
            // Override Gemini's guesses with real data from Tabelog
            if (scrapedData.name) details.name = scrapedData.name;
            if (scrapedData.nameTw) details.nameTw = scrapedData.nameTw;
            if (scrapedData.score) details.score = scrapedData.score;
            if (scrapedData.genre) details.genre = scrapedData.genre;
            if (scrapedData.address) details.address = scrapedData.address;
            if (scrapedData.awards && scrapedData.awards.length > 0) details.awards = scrapedData.awards;
            if (scrapedData.hyakumeiten !== undefined) details.hyakumeiten = scrapedData.hyakumeiten;
            if (scrapedData.lat) details.lat = scrapedData.lat;
            if (scrapedData.lng) details.lng = scrapedData.lng;
            if (scrapedData.businessHours) details.businessHours = scrapedData.businessHours;
            if (scrapedData.photos && scrapedData.photos.length > 0) details.photos = scrapedData.photos;
            if (scrapedData.description) details.description = scrapedData.description;
            if (scrapedData.storeInfo) details.storeInfo = scrapedData.storeInfo;
          }
        }
      }
    } catch (searchErr) {
      console.error("Failed to fetch real Tabelog URL or scrape details from backend", searchErr);
    }
    
    return details;
  } catch (e) {
    console.error("Failed to parse Gemini response for details", e);
    return null;
  }
}
